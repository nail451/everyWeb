package org.alex.everyWeb.modules.impl.nextcloud;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class NextcloudService {

    private final WebClient webClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public NextcloudService() {
        this.webClient = WebClient.builder()
                .build();
    }

    public Map<String, Object> getFiles(String serverUrl, String username, String password, String path, int maxFiles) {
        Map<String, Object> result = new HashMap<>();

        try {
            String baseUrl = serverUrl.endsWith("/") ? serverUrl.substring(0, serverUrl.length() - 1) : serverUrl;

            // Правильный путь для WebDAV (более простой и стабильный)
            String davUrl = baseUrl + "/remote.php/dav/files/" + username;

            // Путь к папке
            String folderPath = path != null && !path.isEmpty() ? path : "/";
            if (!folderPath.startsWith("/")) {
                folderPath = "/" + folderPath;
            }

            System.out.println("Nextcloud DAV URL: " + davUrl + folderPath);

            // Создаем Basic Auth
            String auth = username + ":" + password;
            String encodedAuth = Base64.getEncoder().encodeToString(auth.getBytes());

            // Используем WebDAV PROPFIND для получения списка файлов
            String response = webClient
                    .method(org.springframework.http.HttpMethod.valueOf("PROPFIND"))
                    .uri(davUrl + folderPath)
                    .header("Authorization", "Basic " + encodedAuth)
                    .header("Depth", "1")
                    .header("Content-Type", "application/xml")
                    .header("Accept", "application/xml")
                    .retrieve()
                    .onStatus(status -> status.isError(), clientResponse -> {
                        return clientResponse.bodyToMono(String.class)
                                .flatMap(error -> {
                                    System.err.println("Nextcloud DAV error: " + error);
                                    return Mono.error(new RuntimeException("Nextcloud DAV error: " + error));
                                });
                    })
                    .bodyToMono(String.class)
                    .block();

            if (response != null) {
                // Парсим XML ответ
                List<Map<String, Object>> fileList = parseDavResponse(response, maxFiles);
                result.put("files", fileList);
                result.put("count", fileList.size());
                result.put("path", folderPath);
            }

        } catch (Exception e) {
            System.err.println("Error getting Nextcloud files: " + e.getMessage());
            e.printStackTrace();
            result.put("error", "Ошибка получения файлов: " + e.getMessage());
        }

        return result;
    }

    private List<Map<String, Object>> parseDavResponse(String xml, int maxFiles) {
        List<Map<String, Object>> fileList = new ArrayList<>();

        try {
            // Простой парсинг XML без внешних библиотек
            // Извлекаем элементы <d:response>
            String[] responses = xml.split("</d:response>");

            for (int i = 0; i < responses.length && fileList.size() < maxFiles; i++) {
                String response = responses[i];

                // Извлекаем href (путь к файлу)
                String href = extractTag(response, "d:href");
                if (href == null) continue;

                // Пропускаем саму папку
                if (href.endsWith("/")) continue;

                // Извлекаем имя файла из пути
                String name = href.substring(href.lastIndexOf('/') + 1);
                if (name.isEmpty()) continue;

                // Извлекаем размер
                String sizeStr = extractTag(response, "d:getcontentlength");
                long size = 0;
                if (sizeStr != null) {
                    try {
                        size = Long.parseLong(sizeStr);
                    } catch (NumberFormatException e) {
                        size = 0;
                    }
                }

                // Извлекаем дату изменения
                String modifiedStr = extractTag(response, "d:getlastmodified");
                String modified = "—";
                if (modifiedStr != null) {
                    try {
                        modified = formatDateString(modifiedStr);
                    } catch (Exception e) {
                        modified = modifiedStr;
                    }
                }

                // Проверяем, является ли папкой
                boolean isDirectory = response.contains("<d:collection/>") || response.contains("<d:collection");

                Map<String, Object> fileInfo = new HashMap<>();
                fileInfo.put("name", name);
                fileInfo.put("path", href);
                fileInfo.put("type", isDirectory ? "folder" : "file");
                fileInfo.put("size", isDirectory ? "—" : formatSize(size));
                fileInfo.put("mtime", modified);
                fileInfo.put("icon", getFileIcon(name, isDirectory));
                fileInfo.put("isDirectory", isDirectory);

                fileList.add(fileInfo);
            }

        } catch (Exception e) {
            System.err.println("Error parsing DAV response: " + e.getMessage());
        }

        return fileList;
    }

    private String extractTag(String xml, String tag) {
        int start = xml.indexOf("<" + tag + ">");
        if (start == -1) return null;
        int end = xml.indexOf("</" + tag + ">", start);
        if (end == -1) return null;
        return xml.substring(start + tag.length() + 2, end);
    }

    public NextcloudStorage getStorage(String serverUrl, String username, String password) {
        try {
            String baseUrl = serverUrl.endsWith("/") ? serverUrl.substring(0, serverUrl.length() - 1) : serverUrl;
            String apiUrl = baseUrl + "/ocs/v1.php/cloud/users/" + username;

            String auth = username + ":" + password;
            String encodedAuth = Base64.getEncoder().encodeToString(auth.getBytes());

            String response = webClient.get()
                    .uri(apiUrl)
                    .header("Authorization", "Basic " + encodedAuth)
                    .header("OCS-APIRequest", "true")
                    .header("Accept", "application/json")
                    .retrieve()
                    .onStatus(status -> status.isError(), clientResponse -> {
                        return clientResponse.bodyToMono(String.class)
                                .flatMap(error -> {
                                    System.err.println("Storage API error: " + error);
                                    return Mono.error(new RuntimeException("Storage API error: " + error));
                                });
                    })
                    .bodyToMono(String.class)
                    .block();

            if (response != null && !response.trim().startsWith("<")) {
                JsonNode root = objectMapper.readTree(response);
                JsonNode data = root.path("ocs").path("data");

                if (!data.isMissingNode()) {
                    NextcloudStorage storage = new NextcloudStorage();
                    storage.setUsed(data.path("used").asLong());
                    storage.setTotal(data.path("quota").asLong());
                    storage.setFree(data.path("quota").asLong() - data.path("used").asLong());
                    storage.setQuota(data.path("quota").asLong());

                    if (storage.getQuota() > 0) {
                        storage.setRelative((double) storage.getUsed() / storage.getQuota() * 100);
                    }
                    return storage;
                }
            }
        } catch (Exception e) {
            System.err.println("Error getting storage info: " + e.getMessage());
        }
        return null;
    }

    public boolean testConnection(String serverUrl, String username, String password) {
        try {
            String baseUrl = serverUrl.endsWith("/") ? serverUrl.substring(0, serverUrl.length() - 1) : serverUrl;
            String davUrl = baseUrl + "/remote.php/dav/files/" + username + "/";

            String auth = username + ":" + password;
            String encodedAuth = Base64.getEncoder().encodeToString(auth.getBytes());

            // Используем PROPFIND для проверки подключения
            String response = webClient
                    .method(org.springframework.http.HttpMethod.valueOf("PROPFIND"))
                    .uri(davUrl)
                    .header("Authorization", "Basic " + encodedAuth)
                    .header("Depth", "0")
                    .header("Content-Type", "application/xml")
                    .retrieve()
                    .onStatus(status -> status.isError(), clientResponse -> {
                        return clientResponse.bodyToMono(String.class)
                                .flatMap(error -> {
                                    System.err.println("Connection test error: " + error);
                                    return Mono.error(new RuntimeException("Connection test error: " + error));
                                });
                    })
                    .bodyToMono(String.class)
                    .block();

            // Проверяем, что ответ содержит ожидаемые данные
            boolean success = response != null &&
                    !response.contains("<d:status>HTTP/1.1 401") &&
                    response.contains("d:multistatus");

            System.out.println("Connection test: " + (success ? "SUCCESS" : "FAILED"));
            return success;
        } catch (Exception e) {
            System.err.println("Connection test failed: " + e.getMessage());
            return false;
        }
    }

    private String formatDateString(String dateStr) {
        try {
            // Парсим дату из формата RFC 1123
            java.time.format.DateTimeFormatter formatter =
                    java.time.format.DateTimeFormatter.RFC_1123_DATE_TIME;
            java.time.ZonedDateTime zdt = java.time.ZonedDateTime.parse(dateStr, formatter);
            return zdt.format(java.time.format.DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm"));
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
        if (isDirectory != null && isDirectory) return "📁";

        String ext = name.lastIndexOf('.') > 0 ? name.substring(name.lastIndexOf('.') + 1).toLowerCase() : "";

        switch (ext) {
            case "pdf": return "📄";
            case "doc":
            case "docx": return "📝";
            case "xls":
            case "xlsx": return "📊";
            case "ppt":
            case "pptx": return "📽️";
            case "jpg":
            case "jpeg":
            case "png":
            case "gif":
            case "svg": return "🖼️";
            case "mp3":
            case "wav":
            case "flac": return "🎵";
            case "mp4":
            case "avi":
            case "mkv": return "🎬";
            case "zip":
            case "rar":
            case "7z": return "📦";
            default: return "📄";
        }
    }
}