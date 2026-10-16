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
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.ResourceRegion;
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

        // Защита от path traversal
        Path basePath = Paths.get(savePath).toAbsolutePath().normalize();
        Path filePath = basePath.resolve(relativeName).toAbsolutePath().normalize();
        if (!filePath.startsWith(basePath)) {
            log.warn("Path traversal попытка: {} → {}", savePath, relativeName);
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Недопустимый путь файла"));
        }

        File file = filePath.toFile();
        if (!file.exists() || !file.isFile()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Файл ещё не скачан: " + relativeName));
        }

        // 5. Определить Content-Type
        String contentType = detectContentType(filePath.getFileName().toString());
        MediaType mediaType;
        try {
            mediaType = MediaType.parseMediaType(contentType);
        } catch (Exception e) {
            mediaType = MediaType.APPLICATION_OCTET_STREAM;
        }

        // 6. Отдать файл с Range-поддержкой
        Resource resource = new FileSystemResource(file);
        long contentLength;
        try {
            contentLength = resource.contentLength();
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Не удалось прочитать файл"));
        }

        try {
            ResourceRegion region;
            HttpStatus status;

            if (rangeHeader == null || rangeHeader.isBlank()) {
                // Нет Range — отдаём первый кусок (206), браузер сам дозапросит
                long end = Math.min(CHUNK_SIZE, contentLength);
                region = new ResourceRegion(resource, 0, end);
                status = HttpStatus.PARTIAL_CONTENT;
            } else {
                List<HttpRange> ranges = HttpRange.parseRanges(rangeHeader);
                HttpRange range = ranges.get(0);
                long start = range.getRangeStart(contentLength);
                long end = range.getRangeEnd(contentLength);
                long length = end - start + 1;

                // Ограничиваем размер куска, но не больше запрошенного
                if (length > CHUNK_SIZE) {
                    end = start + CHUNK_SIZE - 1;
                    length = CHUNK_SIZE;
                }

                region = new ResourceRegion(resource, start, length);
                status = HttpStatus.PARTIAL_CONTENT;
            }

            return ResponseEntity.status(status)
                    .contentType(mediaType)
                    .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                    .body(region);
        } catch (Exception e) {
            log.error("Ошибка стриминга {}: {}", filePath, e.getMessage());
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Ошибка стриминга: " + e.getMessage()));
        }
    }

    // ============================================================
    //  УТИЛИТЫ
    // ============================================================

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