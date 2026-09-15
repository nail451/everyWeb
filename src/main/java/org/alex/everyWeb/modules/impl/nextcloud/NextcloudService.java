package org.alex.everyWeb.modules.impl.nextcloud;

import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import javax.xml.parsers.DocumentBuilderFactory;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;
import org.xml.sax.InputSource;

import java.net.URI;
import java.io.StringReader;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class NextcloudService {

    private static final long CACHE_TTL_MS = 5 * 60 * 1000L; // 5 минут

    private final WebClient webClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // ===== КЭШ =====
    private final Map<String, CacheEntry<Map<String, Object>>> filesCache = new ConcurrentHashMap<>();
    private final Map<String, CacheEntry<NextcloudStorage>> storageCache = new ConcurrentHashMap<>();

    private static class CacheEntry<T> {
        final T value;
        final long timestamp;
        CacheEntry(T value) {
            this.value = value;
            this.timestamp = System.currentTimeMillis();
        }
        boolean isExpired() {
            return System.currentTimeMillis() - timestamp > CACHE_TTL_MS;
        }
    }

    public NextcloudService() {
        this.webClient = WebClient.builder()
                .codecs(configurer -> configurer
                        .defaultCodecs()
                        .maxInMemorySize(50 * 1024 * 1024))  // 50 MB
                .build();
    }

    // ===== ИНВАЛИДАЦИЯ =====
    public void invalidateCache(String serverUrl, String username) {
        String prefix = normalizeUrl(serverUrl) + "|" + username + "|";
        filesCache.keySet().removeIf(k -> k.startsWith(prefix));
        storageCache.keySet().removeIf(k -> k.startsWith(prefix));
        System.out.println("🗑️ Nextcloud cache invalidated for: " + username);
    }

    // ===== ФАЙЛЫ =====
    public Map<String, Object> getFiles(String serverUrl, String username, String password,
                                        String path, int maxFiles) {
        String folderPath = (path == null || path.isEmpty()) ? "/" : path;
        if (!folderPath.startsWith("/")) folderPath = "/" + folderPath;

        String cacheKey = normalizeUrl(serverUrl) + "|" + username + "|" + folderPath + "|" + maxFiles;

        CacheEntry<Map<String, Object>> cached = filesCache.get(cacheKey);
        if (cached != null && !cached.isExpired()) {
            return cached.value;
        }

        Map<String, Object> result = new HashMap<>();

        try {
            String baseUrl = normalizeUrl(serverUrl);
            String davUrl = baseUrl + "/remote.php/dav/files/" + username;
            String fullUrl = davUrl + encodePath(folderPath);

            System.out.println("Nextcloud DAV URL: " + fullUrl);

            String auth = Base64.getEncoder()
                    .encodeToString((username + ":" + password).getBytes(StandardCharsets.UTF_8));

            String response = webClient
                    .method(HttpMethod.valueOf("PROPFIND"))
                    .uri(fullUrl)
                    .header("Authorization", "Basic " + auth)
                    .header("Depth", "1")
                    .header("Content-Type", "application/xml; charset=utf-8")
                    .bodyValue("<?xml version=\"1.0\"?><d:propfind xmlns:d=\"DAV:\"><d:prop>"
                            + "<d:resourcetype/><d:getcontentlength/><d:getlastmodified/>"
                            + "</d:prop></d:propfind>")
                    .exchangeToMono(clientResponse -> {
                        int status = clientResponse.statusCode().value();
                        if (status == 207 || status == 200) {
                            return clientResponse.bodyToMono(String.class);
                        }
                        return clientResponse.bodyToMono(String.class)
                                .defaultIfEmpty("")
                                .flatMap(body -> Mono.error(new RuntimeException(
                                        "HTTP " + status + ": " + body)));
                    })
                    .block();

            if (response != null) {
                List<Map<String, Object>> fileList = parseDavResponse(response, maxFiles, username);
                result.put("files", fileList);
                result.put("count", fileList.size());
                result.put("path", folderPath);
                filesCache.put(cacheKey, new CacheEntry<>(result));
            }

        } catch (Exception e) {
            System.err.println("Error getting Nextcloud files: " + e.getMessage());
            result.put("error", "Ошибка получения файлов: " + e.getMessage());
        }

        return result;
    }

    // ===== DOM-ПАРСЕР =====
    private List<Map<String, Object>> parseDavResponse(String xml, int maxFiles, String username) {
        List<Map<String, Object>> fileList = new ArrayList<>();
        String userPrefix = "/remote.php/dav/files/" + username;

        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setNamespaceAware(true);
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            Document doc = factory.newDocumentBuilder()
                    .parse(new InputSource(new StringReader(xml)));

            NodeList responses = doc.getElementsByTagNameNS("DAV:", "response");

            for (int i = 0; i < responses.getLength(); i++) {
                Element response = (Element) responses.item(i);

                NodeList hrefs = response.getElementsByTagNameNS("DAV:", "href");
                if (hrefs.getLength() == 0) continue;
                String href = hrefs.item(0).getTextContent();

                String decodedHref;
                try {
                    decodedHref = URLDecoder.decode(href, StandardCharsets.UTF_8);
                } catch (Exception e) {
                    decodedHref = href;
                }

                // resourcetype → collection?
                boolean isDirectory = false;
                NodeList rts = response.getElementsByTagNameNS("DAV:", "resourcetype");
                if (rts.getLength() > 0) {
                    Element rt = (Element) rts.item(0);
                    isDirectory = rt.getElementsByTagNameNS("DAV:", "collection").getLength() > 0;
                }

                // Первый response = сама запрошенная папка — пропускаем
                if (i == 0 && isDirectory) continue;

                String trimmed = decodedHref.endsWith("/")
                        ? decodedHref.substring(0, decodedHref.length() - 1)
                        : decodedHref;
                String name = trimmed.substring(trimmed.lastIndexOf('/') + 1);
                if (name.isEmpty()) continue;

                long size = 0;
                NodeList sizes = response.getElementsByTagNameNS("DAV:", "getcontentlength");
                if (sizes.getLength() > 0) {
                    try { size = Long.parseLong(sizes.item(0).getTextContent()); }
                    catch (NumberFormatException ignored) {}
                }

                String modified = "—";
                long mtimeRaw = 0L;
                NodeList mods = response.getElementsByTagNameNS("DAV:", "getlastmodified");
                if (mods.getLength() > 0) {
                    String raw = mods.item(0).getTextContent();
                    modified = formatDateString(raw);
                    try {
                        ZonedDateTime zdt = ZonedDateTime.parse(raw, DateTimeFormatter.RFC_1123_DATE_TIME);
                        mtimeRaw = zdt.toEpochSecond();
                    } catch (Exception ignored) {}
                }
                String relativePath = decodedHref;
                if (relativePath.startsWith(userPrefix)) {
                    relativePath = relativePath.substring(userPrefix.length());
                }
                if (relativePath.isEmpty()) relativePath = "/";
                if (!relativePath.startsWith("/")) relativePath = "/" + relativePath;

                Map<String, Object> fileInfo = new HashMap<>();
                fileInfo.put("name", name);
                fileInfo.put("path", relativePath);
                fileInfo.put("type", isDirectory ? "folder" : "file");
                fileInfo.put("size", isDirectory ? "—" : formatSize(size));
                fileInfo.put("mtime", modified);
                fileInfo.put("mtimeRaw", mtimeRaw);
                fileInfo.put("icon", getFileIcon(name, isDirectory));
                fileInfo.put("isDirectory", isDirectory);

                fileList.add(fileInfo);
            }

            // Сортировка: папки → файлы → по имени
            fileList.sort((a, b) -> {
                boolean aDir = Boolean.TRUE.equals(a.get("isDirectory"));
                boolean bDir = Boolean.TRUE.equals(b.get("isDirectory"));
                if (aDir != bDir) return aDir ? -1 : 1;

                long aTime = ((Number) a.getOrDefault("mtimeRaw", 0L)).longValue();
                long bTime = ((Number) b.getOrDefault("mtimeRaw", 0L)).longValue();
                if (aTime != bTime) return Long.compare(bTime, aTime);  // desc по дате

                return ((String) a.get("name")).compareToIgnoreCase((String) b.get("name"));
            });

            // Лимит после сортировки
            if (maxFiles > 0 && fileList.size() > maxFiles) {
                fileList = new ArrayList<>(fileList.subList(0, maxFiles));
            }

        } catch (Exception e) {
            System.err.println("Error parsing DAV response: " + e.getMessage());
            e.printStackTrace();
        }

        return fileList;
    }

    // ===== STORAGE =====
    public NextcloudStorage getStorage(String serverUrl, String username, String password) {
        String cacheKey = normalizeUrl(serverUrl) + "|" + username + "|storage";

        CacheEntry<NextcloudStorage> cached = storageCache.get(cacheKey);
        if (cached != null && !cached.isExpired()) {
            return cached.value;
        }

        try {
            String baseUrl = normalizeUrl(serverUrl);
            String apiUrl = baseUrl + "/ocs/v2.php/cloud/users/" + username;

            String auth = Base64.getEncoder()
                    .encodeToString((username + ":" + password).getBytes(StandardCharsets.UTF_8));

            String response = webClient.get()
                    .uri(apiUrl)
                    .header("Authorization", "Basic " + auth)
                    .header("OCS-APIRequest", "true")
                    .header("Accept", "application/json")
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            if (response != null && !response.trim().startsWith("<")) {
                JsonNode root = objectMapper.readTree(response);
                JsonNode data = root.path("ocs").path("data");

                if (!data.isMissingNode()) {
                    long used = data.path("used").asLong(0);
                    long quota = data.path("quota").asLong(0);

                    NextcloudStorage storage = new NextcloudStorage();
                    storage.setUsed(used);

                    if (quota <= 0) {
                        storage.setQuota(0L);
                        storage.setTotal(used);
                        storage.setFree(0L);
                        storage.setRelative(0.0);
                    } else {
                        storage.setQuota(quota);
                        storage.setTotal(quota);
                        storage.setFree(Math.max(0, quota - used));
                        storage.setRelative((double) used / quota * 100);
                    }

                    storageCache.put(cacheKey, new CacheEntry<>(storage));
                    return storage;
                }
            }
        } catch (Exception e) {
            System.err.println("Error getting storage info: " + e.getMessage());
        }
        return null;
    }

    // ===== TEST CONNECTION =====
    public boolean testConnection(String serverUrl, String username, String password) {
        try {
            Map<String, Object> result = getFiles(serverUrl, username, password, "/", 1);
            boolean ok = result != null && !result.containsKey("error");
            System.out.println("Connection test: " + (ok ? "SUCCESS" : "FAILED"));
            return ok;
        } catch (Exception e) {
            System.err.println("Connection test failed: " + e.getMessage());
            return false;
        }
    }

    // ===== СКАЧИВАНИЕ =====
    public Resource downloadFile(String serverUrl, String username, String password, String filePath) {
        try {
            String baseUrl = normalizeUrl(serverUrl);
            String davUrl = baseUrl + "/remote.php/dav/files/" + username;
            if (!filePath.startsWith("/")) filePath = "/" + filePath;
            String fullUrl = davUrl + encodePath(filePath);

            String auth = Base64.getEncoder()
                    .encodeToString((username + ":" + password).getBytes(StandardCharsets.UTF_8));
            URI uri = URI.create(fullUrl);

            byte[] bytes = webClient.get()
                    .uri(uri)
                    .header("Authorization", "Basic " + auth)
                    .retrieve()
                    .bodyToMono(byte[].class)
                    .block();

            if (bytes == null) return null;
            return new ByteArrayResource(bytes);

        } catch (Exception e) {
            System.err.println("Error downloading file: " + e.getMessage());
            return null;
        }
    }

    // ===== ХЕЛПЕРЫ =====
    private String normalizeUrl(String url) {
        if (url == null) return "";
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }

    private String encodePath(String path) {
        if (path == null || path.isEmpty() || "/".equals(path)) return "/";

        StringBuilder sb = new StringBuilder();
        String[] segments = path.split("/");
        for (String segment : segments) {
            if (segment.isEmpty()) continue;  // пропускаем пустые, ведущий / добавим в конце
            sb.append("/");
            sb.append(URLEncoder.encode(segment, StandardCharsets.UTF_8).replace("+", "%20"));
        }
        if (sb.length() == 0) sb.append("/");
        return sb.toString();
    }

    private String formatDateString(String dateStr) {
        try {
            ZonedDateTime zdt = ZonedDateTime.parse(dateStr, DateTimeFormatter.RFC_1123_DATE_TIME);
            return zdt.format(DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm"));
        } catch (Exception e) {
            return dateStr;
        }
    }

    private String formatSize(long size) {
        if (size == 0) return "—";
        String[] units = {"B", "KB", "MB", "GB", "TB"};
        int unitIndex = 0;
        double fileSize = size;
        while (fileSize > 1024 && unitIndex < units.length - 1) {
            fileSize /= 1024;
            unitIndex++;
        }
        return String.format("%.1f %s", fileSize, units[unitIndex]);
    }

    private String getFileIcon(String name, Boolean isDirectory) {
        if (Boolean.TRUE.equals(isDirectory)) return "📁";

        String ext = name.lastIndexOf('.') > 0
                ? name.substring(name.lastIndexOf('.') + 1).toLowerCase()
                : "";

        switch (ext) {
            case "pdf": return "📄";
            case "doc": case "docx": return "📝";
            case "xls": case "xlsx": return "📊";
            case "ppt": case "pptx": return "📽️";
            case "jpg": case "jpeg": case "png": case "gif": case "svg": case "webp": return "🖼️";
            case "mp3": case "wav": case "flac": case "ogg": return "🎵";
            case "mp4": case "avi": case "mkv": case "mov": return "🎬";
            case "zip": case "rar": case "7z": case "tar": case "gz": return "📦";
            case "txt": case "md": case "log": return "📃";
            default: return "📄";
        }
    }
}