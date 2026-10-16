package org.alex.everyWeb.modules.impl.torrent;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.alex.everyWeb.modules.entity.ModuleEntity;
import org.alex.everyWeb.modules.impl.torrent.dto.TorrentDTO;
import org.alex.everyWeb.modules.impl.torrent.dto.TorrentFileDTO;
import org.alex.everyWeb.modules.impl.torrent.dto.TorrentPropertiesDTO;
import org.alex.everyWeb.modules.repository.ModuleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpRange;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/torrents")
public class TorrentStreamController {

    private static final Logger log = LoggerFactory.getLogger(TorrentStreamController.class);

    /** Размер куска по умолчанию (если Range не задан) — 1 МБ */
    private static final long CHUNK_SIZE = 1024 * 1024L;

    @Autowired
    private ModuleRepository moduleRepository;

    @Autowired
    private TorrentService torrentService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Стриминг файла торрента.
     * GET /api/torrents/{moduleId}/{hash}/stream?fileIndex=0
     */
    @GetMapping("/{moduleId}/{hash}/stream")
    public ResponseEntity<?> stream(@PathVariable Long moduleId,
                                    @PathVariable String hash,
                                    @RequestParam("fileIndex") int fileIndex,
                                    @RequestHeader(value = HttpHeaders.RANGE, required = false) String rangeHeader) {
        TorrentData data = getTorrentData(moduleId);
        if (data == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Модуль не найден"));
        }

        // 1. Найти торрент
        TorrentDTO torrent = torrentService.findTorrent(data, hash);
        if (torrent == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Торрент не найден"));
        }

        // 2. Получить свойства (save_path)
        TorrentPropertiesDTO props = torrentService.properties(data, hash);
        if (props == null || props.getSavePath() == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Не удалось получить save_path"));
        }

        // 3. Найти файл по индексу
        List<TorrentFileDTO> files = torrentService.files(data, hash);
        if (fileIndex < 0 || fileIndex >= files.size()) {
            return ResponseEntity.badRequest().body(Map.of("error", "fileIndex вне диапазона"));
        }
        TorrentFileDTO fileDto = files.get(fileIndex);

        // 4. Собрать полный путь к файлу
        String savePath = props.getSavePath();
        String relativeName = fileDto.getName();

        // Маппинг: контейнер qBittorrent → путь на хосте
        String hostSavePath = mapContainerToHostPath(savePath);

        // Защита от path traversal
        Path basePath = Paths.get(hostSavePath).toAbsolutePath().normalize();
        Path filePath = basePath.resolve(relativeName).toAbsolutePath().normalize();
        if (!filePath.startsWith(basePath)) {
            log.warn("Path traversal попытка: {} → {}", hostSavePath, relativeName);
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Недопустимый путь файла"));
        }

        File file = filePath.toFile();
        if (!file.exists() || !file.isFile()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Файл ещё не скачан: " + relativeName));
        }

        // 5. Отдать файл с Range-поддержкой (ручной расчёт)
        long contentLength = file.length();

        try {
            long start;
            long end;
            HttpStatus status;

            if (rangeHeader == null || rangeHeader.isBlank()) {
                start = 0;
                end = Math.min(CHUNK_SIZE, contentLength) - 1;
                status = HttpStatus.PARTIAL_CONTENT;
            } else {
                List<HttpRange> ranges = HttpRange.parseRanges(rangeHeader);
                HttpRange range = ranges.get(0);
                start = range.getRangeStart(contentLength);
                end = range.getRangeEnd(contentLength);

                // Ограничиваем кусок
                if (end - start + 1 > CHUNK_SIZE) {
                    end = start + CHUNK_SIZE - 1;
                }
                status = HttpStatus.PARTIAL_CONTENT;
            }

            long length = end - start + 1;

            // Читаем ровно этот кусок
            byte[] buffer = new byte[(int) length];
            try (java.io.RandomAccessFile raf = new java.io.RandomAccessFile(file, "r")) {
                raf.seek(start);
                raf.readFully(buffer);
            }

            HttpHeaders headers = new HttpHeaders();
            headers.set(HttpHeaders.CONTENT_TYPE, "application/octet-stream");
            headers.set(HttpHeaders.ACCEPT_RANGES, "bytes");
            headers.set(HttpHeaders.CONTENT_LENGTH, String.valueOf(length));
            headers.set(HttpHeaders.CONTENT_RANGE,
                    "bytes " + start + "-" + end + "/" + contentLength);

            return ResponseEntity.status(status)
                    .headers(headers)
                    .body(buffer);

        } catch (Exception e) {
            log.error("Ошибка стриминга {}: {}", filePath, e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Ошибка стриминга: " + e.getMessage()));
        }
    }

    // ============================================================
    //  УТИЛИТЫ
    // ============================================================

    /**
     * Маппинг пути qBittorrent-контейнера в путь на хосте.
     * qBittorrent видит папку загрузок как /downloads, а на хосте это /home/alsa/torrent.
     */
    private String mapContainerToHostPath(String containerPath) {
        if (containerPath == null) return null;
        final String CONTAINER_ROOT = "/downloads";
        final String HOST_ROOT = "/home/alsa/torrent";
        if (containerPath.equals(CONTAINER_ROOT)) return HOST_ROOT;
        if (containerPath.startsWith(CONTAINER_ROOT + "/")) {
            return HOST_ROOT + containerPath.substring(CONTAINER_ROOT.length());
        }
        return containerPath;
    }

    private String detectContentType(String fileName) {
        String lower = fileName.toLowerCase();
        if (lower.endsWith(".mp4") || lower.endsWith(".m4v")) return "video/mp4";
        if (lower.endsWith(".webm")) return "video/webm";
        if (lower.endsWith(".mkv")) return "video/x-matroska";
        if (lower.endsWith(".avi")) return "video/x-msvideo";
        if (lower.endsWith(".mov")) return "video/quicktime";
        if (lower.endsWith(".mp3")) return "audio/mpeg";
        if (lower.endsWith(".flac")) return "audio/flac";
        if (lower.endsWith(".ogg")) return "audio/ogg";
        if (lower.endsWith(".wav")) return "audio/wav";
        if (lower.endsWith(".m4a")) return "audio/mp4";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".gif")) return "image/gif";
        if (lower.endsWith(".webp")) return "image/webp";
        return "application/octet-stream";
    }

    private TorrentData getTorrentData(Long moduleId) {
        try {
            ModuleEntity module = moduleRepository.findById(moduleId).orElse(null);
            if (module == null || !"TORRENT".equals(module.getType())) {
                return null;
            }
            return parseTorrentData(module.getSettings());
        } catch (Exception e) {
            log.error("Ошибка чтения настроек торрента: {}", e.getMessage());
            return null;
        }
    }

    private TorrentData parseTorrentData(String settingsJson) {
        try {
            if (settingsJson == null || settingsJson.isEmpty()) return new TorrentData();
            Map<String, Object> map = objectMapper.readValue(settingsJson,
                    new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {});
            Object obj = map.get("torrentData");
            if (obj instanceof String) {
                return objectMapper.readValue((String) obj, TorrentData.class);
            } else if (obj instanceof Map) {
                return objectMapper.convertValue(obj, TorrentData.class);
            }
        } catch (Exception e) {
            log.error("Ошибка парсинга torrentData: {}", e.getMessage());
        }
        return new TorrentData();
    }
}