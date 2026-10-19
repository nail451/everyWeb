package org.alex.everyWeb.modules.impl.torrent;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.alex.everyWeb.modules.impl.torrent.dto.TorrentDTO;
import org.alex.everyWeb.modules.impl.torrent.dto.TorrentFileDTO;
import org.alex.everyWeb.modules.impl.torrent.dto.TorrentPropertiesDTO;
import org.alex.everyWeb.modules.impl.torrent.dto.TorrentTrackerDTO;
import org.alex.everyWeb.modules.impl.torrent.dto.TorrentPeerDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Обёртка над Web API qBittorrent v2.
 *
 * Особенности:
 *  - cookie-сессия (SID), храним в AtomicReference
 *  - при 403 — перелогин и повтор запроса
 *  - все запросы синхронные (block), т.к. вызываются из MVC-контроллеров
 *  - Jackson 2 (com.fasterxml) — ObjectMapper, как в других сервисах проекта
 */
@Component
public class QbittorrentClient {

    private static final Logger log = LoggerFactory.getLogger(QbittorrentClient.class);

    private static final Duration TIMEOUT = Duration.ofSeconds(10);

    private final ObjectMapper objectMapper = new ObjectMapper();

    /** Текущая cookie-сессия: "SID=..." */
    private final AtomicReference<String> sidCookie = new AtomicReference<>(null);

    // Блокировка после неудачного логина — 60 секунд
    private volatile long lastFailedLoginAt = 0L;
    private static final long LOGIN_BACKOFF_MS = 60_000L;

    /** Параметры подключения — задаются через configure() */
    private volatile String baseUrl;
    private volatile String username;
    private volatile String password;

    public QbittorrentClient() {
        // без аргументов
    }

    /**
     * Настроить клиент. Вызывается из TorrentService при каждом запросе
     * (настройки читаются из ModuleEntity.settings).
     * Если параметры изменились — сбрасываем сессию.
     */
    public void configure(String baseUrl, String username, String password) {
        boolean changed = !equalsSafe(this.baseUrl, baseUrl)
                || !equalsSafe(this.username, username)
                || !equalsSafe(this.password, password);
        this.baseUrl = baseUrl;
        this.username = username;
        this.password = password;
        if (changed) {
            sidCookie.set(null);
        }
    }

    private boolean equalsSafe(String a, String b) {
        return a == null ? b == null : a.equals(b);
    }

    private boolean isConfigured() {
        return baseUrl != null && !baseUrl.isBlank();
    }

    // ============================================================
    //  АВТОРИЗАЦИЯ
    // ============================================================

    /**
     * Логин. Возвращает true при успехе.
     */
    public boolean login() {
        if (!isConfigured()) {
            log.warn("QbittorrentClient не настроен (baseUrl пуст)");
            return false;
        }

        // Backoff: не пытаться логиниться, если недавно была неудача
        long now = System.currentTimeMillis();
        if (now - lastFailedLoginAt < LOGIN_BACKOFF_MS) {
            log.debug("QbittorrentClient: backoff, пропускаем логин");
            return false;
        }

        try {
            WebClient client = WebClient.builder()
                    .baseUrl(baseUrl)
                    .defaultHeader(HttpHeaders.USER_AGENT, "EverWeb/0.1")
                    .build();

            MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
            form.add("username", username == null ? "" : username);
            form.add("password", password == null ? "" : password);

            String body = client.post()
                    .uri("/api/v2/auth/login")
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(BodyInserters.fromFormData(form))
                    .exchangeToMono(response -> {
                        // Забираем Set-Cookie: SID=...
                        List<String> cookies = response.headers().asHttpHeaders().get(HttpHeaders.SET_COOKIE);
                        if (cookies != null) {
                            for (String c : cookies) {
                                // qBittorrent 4.x: SID=...   qBittorrent 5.x: QBT_SID_<port>=...
                                if (c.startsWith("SID=") || c.startsWith("QBT_SID_")) {
                                    String value = c.split(";", 2)[0];
                                    sidCookie.set(value);
                                    break;
                                }
                            }
                        }
                        return response.bodyToMono(String.class);
                    })
                    .timeout(TIMEOUT)
                    .onErrorResume(e -> {
                        log.warn("Ошибка логина в qBittorrent: {}", e.getMessage());
                        return Mono.empty();
                    })
                    .block();

            // qBittorrent 5.x: если cookie установилась — логин прошёл (независимо от тела ответа)
            boolean ok = sidCookie.get() != null;
            if (ok) {
                lastFailedLoginAt = 0;
                log.info("QbittorrentClient: логин успешен (cookie установлена)");
            } else {
                lastFailedLoginAt = System.currentTimeMillis();
                log.warn("QbittorrentClient: логин не удался — cookie не установлена, ответ='{}'", body);
            }
            return ok;
        } catch (Exception e) {
            log.error("QbittorrentClient: исключение при логине: {}", e.getMessage(), e);
            return false;
        }
    }

    /**
     * Гарантировать наличие сессии. Если cookie нет — логинимся.
     */
    private void ensureSession() {
        if (sidCookie.get() == null) {
            login();
        }
    }

    /**
     * Сбросить сессию (например, при 403).
     */
    private void resetSession() {
        sidCookie.set(null);
    }

    // ============================================================
    //  БАЗОВЫЙ GET / POST
    // ============================================================

    /**
     * GET-запрос. Автоматически логинится и повторяет при 403.
     */
    private String doGet(String pathAndQuery) {
        if (!isConfigured()) return null;
        ensureSession();
        String result = doGetOnce(pathAndQuery);
        if (result == null) {
            // возможно, cookie протух — перелогинимся и попробуем ещё раз
            resetSession();
            if (login()) {
                result = doGetOnce(pathAndQuery);
            }
        }
        return result;
    }

    private String doGetOnce(String pathAndQuery) {
        try {
            WebClient client = WebClient.builder()
                    .baseUrl(baseUrl)
                    .defaultHeader(HttpHeaders.USER_AGENT, "EverWeb/0.1")
                    .defaultHeader(HttpHeaders.COOKIE, sidCookie.get() == null ? "" : sidCookie.get())
                    .build();

            return client.get()
                    .uri(pathAndQuery)
                    .exchangeToMono(response -> {
                        HttpStatusCode status = response.statusCode();
                        if (status.value() == 403) {
                            return Mono.just("__FORBIDDEN__");
                        }
                        if (status.isError()) {
                            log.warn("qBittorrent GET {} → {}", pathAndQuery, status.value());
                            return Mono.just("__ERROR__");
                        }
                        return response.bodyToMono(String.class);
                    })
                    .timeout(TIMEOUT)
                    .onErrorResume(e -> {
                        log.warn("qBittorrent GET {} ошибка: {}", pathAndQuery, e.getMessage());
                        return Mono.just("__ERROR__");
                    })
                    .block();
        } catch (Exception e) {
            log.error("qBittorrent GET {} исключение: {}", pathAndQuery, e.getMessage());
            return "__ERROR__";
        }
    }

    /**
     * POST-запрос (form-urlencoded). Возвращает true при 200.
     * При 403 — перелогин и повтор.
     */
    private boolean doPost(String path, MultiValueMap<String, String> form) {
        if (!isConfigured()) return false;
        ensureSession();
        boolean ok = doPostOnce(path, form);
        if (!ok) {
            resetSession();
            if (login()) {
                ok = doPostOnce(path, form);
            }
        }
        return ok;
    }

    private boolean doPostOnce(String path, MultiValueMap<String, String> form) {
        try {
            WebClient client = WebClient.builder()
                    .baseUrl(baseUrl)
                    .defaultHeader(HttpHeaders.USER_AGENT, "EverWeb/0.1")
                    .defaultHeader(HttpHeaders.COOKIE, sidCookie.get() == null ? "" : sidCookie.get())
                    .build();

            Boolean result = client.post()
                    .uri(path)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(BodyInserters.fromFormData(form == null ? new LinkedMultiValueMap<>() : form))
                    .exchangeToMono(response -> {
                        int code = response.statusCode().value();
                        if (code == 403) return Mono.just(Boolean.FALSE);
                        if (code >= 200 && code < 300) return Mono.just(Boolean.TRUE);
                        log.warn("qBittorrent POST {} → {}", path, code);
                        return Mono.just(Boolean.FALSE);
                    })
                    .timeout(TIMEOUT)
                    .onErrorResume(e -> {
                        log.warn("qBittorrent POST {} ошибка: {}", path, e.getMessage());
                        return Mono.just(Boolean.FALSE);
                    })
                    .block();

            return Boolean.TRUE.equals(result);
        } catch (Exception e) {
            log.error("qBittorrent POST {} исключение: {}", path, e.getMessage());
            return false;
        }
    }

    // ============================================================
    //  ПУБЛИЧНЫЕ МЕТОДЫ
    // ============================================================

    /**
     * Версия qBittorrent (например, "v4.6.3").
     */
    public String getVersion() {
        String body = doGet("/api/v2/app/version");
        if (body == null || body.startsWith("__")) return null;
        return body.trim();
    }

    /**
     * Список торрентов.
     */
    public List<TorrentDTO> getTorrents() {
        String body = doGet("/api/v2/torrents/info");
        if (body == null || body.startsWith("__")) return List.of();
        try {
            JsonNode root = objectMapper.readTree(body);
            if (!root.isArray()) return List.of();
            List<TorrentDTO> list = new ArrayList<>();
            for (JsonNode node : root) {
                list.add(mapTorrent(node));
            }
            return list;
        } catch (Exception e) {
            log.error("Ошибка парсинга списка торрентов: {}", e.getMessage());
            return List.of();
        }
    }

    /**
     * Файлы торрента.
     */
    public List<TorrentFileDTO> getTorrentFiles(String hash) {
        String body = doGet("/api/v2/torrents/files?hash=" + urlEncode(hash));
        if (body == null || body.startsWith("__")) return List.of();
        try {
            JsonNode root = objectMapper.readTree(body);
            if (!root.isArray()) return List.of();
            List<TorrentFileDTO> list = new ArrayList<>();
            int idx = 0;
            for (JsonNode node : root) {
                TorrentFileDTO f = new TorrentFileDTO();
                f.setIndex(idx++);
                f.setName(node.path("name").asText());
                f.setSize(node.path("size").asLong());
                f.setProgress(node.path("progress").asDouble());
                f.setPriority(node.path("priority").asInt());
                f.setSeed(node.path("is_seed").asBoolean(false));
                f.setPieceRangeStart(node.path("piece_range").path(0).asLong());
                f.setPieceRangeEnd(node.path("piece_range").path(1).asLong());
                f.setAvailability(node.path("availability").asInt(-1));
                list.add(f);
            }
            return list;
        } catch (Exception e) {
            log.error("Ошибка парсинга файлов торрента {}: {}", hash, e.getMessage());
            return List.of();
        }
    }

    /**
     * Свойства торрента.
     */
    public TorrentPropertiesDTO getTorrentProperties(String hash) {
        String body = doGet("/api/v2/torrents/properties?hash=" + urlEncode(hash));
        if (body == null || body.startsWith("__")) return null;
        try {
            JsonNode n = objectMapper.readTree(body);
            TorrentPropertiesDTO p = new TorrentPropertiesDTO();
            p.setSavePath(n.path("save_path").asText());
            p.setCreationDate(n.path("creation_date").asLong());
            p.setPieceSize(n.path("piece_size").asLong());
            p.setTotalSize(n.path("total_size").asLong());
            p.setTotalDownloaded(n.path("total_downloaded").asLong());
            p.setTotalUploaded(n.path("total_uploaded").asLong());
            p.setDlSpeed(n.path("dl_speed").asLong());
            p.setUpSpeed(n.path("up_speed").asLong());
            p.setSeeds(n.path("seeds").asInt());
            p.setPeers(n.path("peers").asInt());
            p.setPiecesHave(n.path("pieces_have").asInt());
            p.setPiecesTotal(n.path("pieces_total").asInt());
            p.setComment(n.path("comment").asText(""));
            p.setAdditionDate(n.path("addition_date").asLong());
            p.setCompletionDate(n.path("completion_date").asLong());
            p.setCreatedBy(n.path("created_by").asText(""));
            p.setTimeElapsed(n.path("time_elapsed").asLong());
            p.setSeedingTime(n.path("seeding_time").asLong());
            p.setEta(n.path("eta").asLong());
            return p;
        } catch (Exception e) {
            log.error("Ошибка парсинга свойств торрента {}: {}", hash, e.getMessage());
            return null;
        }
    }

    /**
     * Трекеры торрента.
     */
    public List<TorrentTrackerDTO> getTrackers(String hash) {
        String body = doGet("/api/v2/torrents/trackers?hash=" + urlEncode(hash));
        if (body == null || body.startsWith("__")) return List.of();
        try {
            JsonNode root = objectMapper.readTree(body);
            if (!root.isArray()) return List.of();
            List<TorrentTrackerDTO> list = new ArrayList<>();
            for (JsonNode n : root) {
                TorrentTrackerDTO t = new TorrentTrackerDTO();
                t.setUrl(n.path("url").asText(""));
                t.setStatus(n.path("status").asInt(0));
                t.setTier(n.path("tier").asInt(-1));
                t.setNumPeers(n.path("num_peers").asInt(-1));
                t.setNumSeeds(n.path("num_seeds").asInt(-1));
                t.setNumLeechs(n.path("num_leeches").asInt(-1));
                t.setNumDownloaded(n.path("num_downloaded").asInt(-1));
                t.setMsg(n.path("msg").asText(""));
                list.add(t);
            }
            return list;
        } catch (Exception e) {
            log.error("Ошибка парсинга трекеров торрента {}: {}", hash, e.getMessage());
            return List.of();
        }
    }

    /**
     * Пиры торрента.
     */
    public List<TorrentPeerDTO> getPeers(String hash) {
        String body = doGet("/api/v2/sync/torrentPeers?hash=" + urlEncode(hash));
        if (body == null || body.startsWith("__")) return List.of();
        try {
            // qBittorrent отдаёт либо массив, либо объект { peers: {...} } — в зависимости от версии
            JsonNode root = objectMapper.readTree(body);
            JsonNode peersNode;
            if (root.isArray()) {
                peersNode = root;
            } else if (root.has("peers")) {
                peersNode = root.get("peers");
            } else {
                return List.of();
            }

            List<TorrentPeerDTO> list = new ArrayList<>();
            if (peersNode.isArray()) {
                for (JsonNode n : peersNode) {
                    list.add(mapPeer(n));
                }
            } else if (peersNode.isObject()) {
                // старый формат: { "ip:port": { ... } }
                java.util.Iterator<java.util.Map.Entry<String, JsonNode>> it = peersNode.fields();
                while (it.hasNext()) {
                    java.util.Map.Entry<String, JsonNode> e = it.next();
                    JsonNode n = e.getValue();
                    TorrentPeerDTO p = mapPeer(n);
                    if (p.getIp() == null && e.getKey().contains(":")) {
                        String[] parts = e.getKey().split(":", 2);
                        p.setIp(parts[0]);
                        try { p.setPort(Integer.parseInt(parts[1])); } catch (NumberFormatException ignored) {}
                    }
                    list.add(p);
                }
            }
            return list;
        } catch (Exception e) {
            log.error("Ошибка парсинга пиров торрента {}: {}", hash, e.getMessage());
            return List.of();
        }
    }

    private TorrentPeerDTO mapPeer(JsonNode n) {
        TorrentPeerDTO p = new TorrentPeerDTO();
        p.setIp(n.path("ip").asText(""));
        p.setPort(n.path("port").asInt(0));
        p.setClient(n.path("client").asText(""));
        p.setPeerIdClient(n.path("peer_id_client").asText(""));
        p.setProgress(n.path("progress").asDouble());
        p.setDlSpeed(n.path("dl_speed").asLong());
        p.setUpSpeed(n.path("up_speed").asLong());
        p.setDownloaded(n.path("downloaded").asLong());
        p.setUploaded(n.path("uploaded").asLong());
        p.setFlags(n.path("flags").asText(""));
        p.setFlagsDesc(n.path("flags_desc").asText(""));
        p.setConnection(n.path("connection").asText(""));
        p.setCountry(n.path("country").asText(""));
        p.setCountryCode(n.path("country_code").asText(""));
        p.setHostName(n.path("host_name").asText(""));
        p.setFiles(n.path("files").asText(""));
        p.setRelevance(n.path("relevance").asDouble());
        p.setI2pDest(n.path("i2p_dest").asText(""));
        return p;
    }

    /**
     * Форсировать переподключение к трекерам.
     */
    public boolean reannounce(String hash) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("hashes", hash);
        return doPost("/api/v2/torrents/reannounce", form);
    }

    // -------- Действия над торрентами --------

    public boolean pause(String hash) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("hashes", hash);
        return doPost("/api/v2/torrents/pause", form);
    }

    public boolean resume(String hash) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("hashes", hash);
        return doPost("/api/v2/torrents/resume", form);
    }

    public boolean delete(String hash, boolean deleteFiles) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("hashes", hash);
        form.add("deleteFiles", String.valueOf(deleteFiles));
        return doPost("/api/v2/torrents/delete", form);
    }

    public boolean toggleSequentialDownload(String hash) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("hashes", hash);
        return doPost("/api/v2/torrents/toggleSequentialDownload", form);
    }

    public boolean toggleFirstLastPiecePrio(String hash) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("hashes", hash);
        return doPost("/api/v2/torrents/toggleFirstLastPiecePrio", form);
    }

    /**
     * Добавить торрент по URL (magnet или http-ссылка на .torrent).
     */
    public boolean addTorrent(String url, String savePath, String category,
                              Boolean sequential, Boolean firstLast) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("urls", url);
        if (savePath != null && !savePath.isBlank()) form.add("savepath", savePath);
        if (category != null && !category.isBlank()) form.add("category", category);
        if (Boolean.TRUE.equals(sequential)) form.add("sequentialDownload", "true");
        if (Boolean.TRUE.equals(firstLast)) form.add("firstLastPiecePrio", "true");
        return doPost("/api/v2/torrents/add", form);
    }

    /**
     * Приоритет файлов. priority: 0, 1, 6, 7.
     */
    public boolean setFilePriority(String hash, int[] fileIds, int priority) {
        if (fileIds == null || fileIds.length == 0) return false;
        StringBuilder ids = new StringBuilder();
        for (int i = 0; i < fileIds.length; i++) {
            if (i > 0) ids.append('|');
            ids.append(fileIds[i]);
        }
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("hash", hash);
        form.add("id", ids.toString());
        form.add("priority", String.valueOf(priority));
        return doPost("/api/v2/torrents/filePrio", form);
    }

    /**
     * Переключить режим лимитов скорости.
     * В qBittorrent это toggle: 0 ⇄ 1.
     */
    public boolean toggleSpeedLimitsMode() {
        return doPost("/api/v2/transfer/toggleSpeedLimitsMode", new LinkedMultiValueMap<>());
    }

    /**
     * Текущий режим лимитов: 0 = обычные, 1 = альтернативные.
     */
    public int getSpeedLimitsMode() {
        String body = doGet("/api/v2/transfer/speedLimitsMode");
        if (body == null || body.startsWith("__")) return -1;
        try {
            return Integer.parseInt(body.trim());
        } catch (NumberFormatException e) {
            return -1;
        }
    }

    /**
     * Глобальная статистика (скорости, кол-во торрентов).
     */
    public JsonNode getTransferInfo() {
        String body = doGet("/api/v2/transfer/info");
        if (body == null || body.startsWith("__")) return null;
        try {
            return objectMapper.readTree(body);
        } catch (Exception e) {
            return null;
        }
    }

    // ============================================================
    //  МАППИНГ
    // ============================================================

    private TorrentDTO mapTorrent(JsonNode n) {
        TorrentDTO t = new TorrentDTO();
        t.setHash(n.path("hash").asText());
        t.setName(n.path("name").asText());
        t.setState(n.path("state").asText());
        t.setProgress(n.path("progress").asDouble());
        t.setSize(n.path("size").asLong());
        t.setDownloaded(n.path("downloaded").asLong());
        t.setUploaded(n.path("uploaded").asLong());
        t.setDownloadSpeed(n.path("dlspeed").asLong());
        t.setUploadSpeed(n.path("upspeed").asLong());
        t.setEta(n.path("eta").asInt());
        t.setNumSeeds(n.path("num_seeds").asInt());
        t.setNumLeechs(n.path("num_leechs").asInt());
        t.setSavePath(n.path("save_path").asText());
        t.setCategory(n.path("category").asText(""));
        t.setSequentialDownload(n.path("seq_dl").asBoolean(false));
        t.setFirstLastPiecePrio(n.path("f_l_piece_prio").asBoolean(false));
        t.setAddedOn(n.path("added_on").asLong());
        t.setCompletionOn(n.path("completion_on").asLong(-1));
        return t;
    }

    /**
     * Добавить торрент из .torrent файла (multipart).
     * qBittorrent ждёт поле "torrents" с содержимым файла.
     */
    public boolean addTorrentFile(byte[] fileBytes, String fileName, String savePath, String category,
                                  Boolean sequential, Boolean firstLast) {
        if (!isConfigured() || fileBytes == null || fileBytes.length == 0) return false;
        ensureSession();
        boolean ok = addTorrentFileOnce(fileBytes, fileName, savePath, category, sequential, firstLast);
        if (!ok) {
            resetSession();
            if (login()) {
                ok = addTorrentFileOnce(fileBytes, fileName, savePath, category, sequential, firstLast);
            }
        }
        return ok;
    }

    private boolean addTorrentFileOnce(byte[] fileBytes, String fileName, String savePath, String category,
                                       Boolean sequential, Boolean firstLast) {
        try (org.apache.hc.client5.http.impl.classic.CloseableHttpClient httpClient =
                     org.apache.hc.client5.http.impl.classic.HttpClients.createDefault()) {

            org.apache.hc.client5.http.classic.methods.HttpPost post =
                    new org.apache.hc.client5.http.classic.methods.HttpPost(baseUrl + "/api/v2/torrents/add");

            if (sidCookie.get() != null) {
                post.setHeader("Cookie", sidCookie.get());
            }

            org.apache.hc.client5.http.entity.mime.MultipartEntityBuilder builder =
                    org.apache.hc.client5.http.entity.mime.MultipartEntityBuilder.create();

            // Файл в поле "torrents"
            builder.addBinaryBody("torrents", fileBytes,
                    org.apache.hc.core5.http.ContentType.APPLICATION_OCTET_STREAM,
                    "upload.torrent");

            // Обязательные поля
            builder.addTextBody("autoTMM", "false");
            builder.addTextBody("useDownloadPath", "false");
            builder.addTextBody("stopped", "false");
            builder.addTextBody("contentLayout", "Original");

            if (savePath != null && !savePath.isBlank()) {
                builder.addTextBody("savepath", savePath);
            }
            if (category != null && !category.isBlank()) {
                builder.addTextBody("category", category);
            }
            if (Boolean.TRUE.equals(sequential)) {
                builder.addTextBody("sequentialDownload", "true");
            }
            if (Boolean.TRUE.equals(firstLast)) {
                builder.addTextBody("firstLastPiecePrio", "true");
            }

            post.setEntity(builder.build());

            // Возвращаем результат: true только если 2xx
            return httpClient.execute(post, response -> {
                int code = response.getCode();
                if (code >= 200 && code < 300) {
                    return true;
                }

                // Если ошибка — логируем тело ответа (для qBittorrent 5.x это будет "Conflict", "Fails." и т.п.)
                String body = "";
                if (response.getEntity() != null) {
                    try {
                        body = org.apache.hc.core5.http.io.entity.EntityUtils.toString(response.getEntity());
                    } catch (Exception ignored) {}
                }
                log.warn("qBittorrent POST /torrents/add (file) → {} body='{}'", code, body);
                return false;
            });

        } catch (Exception e) {
            log.error("Исключение при загрузке .torrent через Apache HttpClient: {}", e.getMessage(), e);
            return false;
        }
    }

    private String sanitizeFilename(String name) {
        if (name == null) return "file.torrent";
        // Оставляем только ASCII, заменяем остальное на _
        String result = name.replaceAll("[^\\x20-\\x7E]", "_");
        // Убираем пробелы и подозрительные символы
        result = result.replaceAll("[\\r\\n\"]", "");
        if (!result.toLowerCase().endsWith(".torrent")) {
            result = "file.torrent";
        }
        return result;
    }

    // ============================================================
    //  УТИЛИТЫ
    // ============================================================

    private String urlEncode(String s) {
        if (s == null) return "";
        try {
            return java.net.URLEncoder.encode(s, java.nio.charset.StandardCharsets.UTF_8);
        } catch (Exception e) {
            return s;
        }
    }

    /**
     * Диагностика: проверить соединение.
     */
    public boolean ping() {
        String v = getVersion();
        return v != null && !v.isBlank();
    }
}