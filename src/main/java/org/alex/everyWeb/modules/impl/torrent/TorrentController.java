package org.alex.everyWeb.modules.impl.torrent;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.alex.everyWeb.modules.entity.ModuleEntity;
import org.alex.everyWeb.modules.impl.torrent.dto.FilePriorityRequestDTO;
import org.alex.everyWeb.modules.impl.torrent.dto.TorrentAddRequestDTO;
import org.alex.everyWeb.modules.impl.torrent.dto.TorrentDTO;
import org.alex.everyWeb.modules.impl.torrent.dto.TorrentFileDTO;
import org.alex.everyWeb.modules.impl.torrent.dto.TorrentPeerDTO;
import org.alex.everyWeb.modules.impl.torrent.dto.TorrentPropertiesDTO;
import org.alex.everyWeb.modules.impl.torrent.dto.TorrentTrackerDTO;
import org.alex.everyWeb.modules.repository.ModuleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/torrents")
public class TorrentController {

    private static final Logger log = LoggerFactory.getLogger(TorrentController.class);

    @Autowired
    private ModuleRepository moduleRepository;

    @Autowired
    private TorrentService torrentService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    // ============================================================
    //  СТАТУС / СПИСОК
    // ============================================================

    @GetMapping("/{moduleId}/list")
    public ResponseEntity<?> list(@PathVariable Long moduleId) {
        try {
            TorrentData data = getTorrentData(moduleId);
            if (data == null) return badModule();

            Map<String, Object> result = new HashMap<>();
            result.put("connected", torrentService.ping(data));
            result.put("version", torrentService.getVersion(data));
            result.put("torrents", torrentService.list(data));
            result.put("transferInfo", torrentService.transferInfo(data));
            result.put("speedLimitsMode", torrentService.getSpeedLimitsMode(data));
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Ошибка /list: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{moduleId}/status")
    public ResponseEntity<?> status(@PathVariable Long moduleId) {
        try {
            TorrentData data = getTorrentData(moduleId);
            if (data == null) return badModule();

            Map<String, Object> result = new HashMap<>();
            result.put("connected", torrentService.ping(data));
            result.put("version", torrentService.getVersion(data));
            result.put("speedLimitsMode", torrentService.getSpeedLimitsMode(data));
            result.put("transferInfo", torrentService.transferInfo(data));
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Ошибка /status: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    // ============================================================
    //  ФАЙЛЫ / ТРЕКЕРЫ / ПИРЫ / СВОЙСТВА
    // ============================================================

    @GetMapping("/{moduleId}/{hash}/files")
    public ResponseEntity<?> files(@PathVariable Long moduleId, @PathVariable String hash) {
        TorrentData data = getTorrentData(moduleId);
        if (data == null) return badModule();
        List<TorrentFileDTO> files = torrentService.files(data, hash);
        return ResponseEntity.ok(files);
    }

    @GetMapping("/{moduleId}/{hash}/trackers")
    public ResponseEntity<?> trackers(@PathVariable Long moduleId, @PathVariable String hash) {
        TorrentData data = getTorrentData(moduleId);
        if (data == null) return badModule();
        List<TorrentTrackerDTO> trackers = torrentService.trackers(data, hash);
        return ResponseEntity.ok(trackers);
    }

    @GetMapping("/{moduleId}/{hash}/peers")
    public ResponseEntity<?> peers(@PathVariable Long moduleId, @PathVariable String hash) {
        TorrentData data = getTorrentData(moduleId);
        if (data == null) return badModule();
        List<TorrentPeerDTO> peers = torrentService.peers(data, hash);
        // qBittorrent 4.6.3 не поддерживает /peers — вернём пустой список + флаг
        return ResponseEntity.ok(Map.of(
                "supported", !peers.isEmpty(),
                "peers", peers
        ));
    }

    @GetMapping("/{moduleId}/{hash}/properties")
    public ResponseEntity<?> properties(@PathVariable Long moduleId, @PathVariable String hash) {
        TorrentData data = getTorrentData(moduleId);
        if (data == null) return badModule();
        TorrentPropertiesDTO props = torrentService.properties(data, hash);
        if (props == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(props);
    }

    // ============================================================
    //  ДЕЙСТВИЯ
    // ============================================================

    @PostMapping("/{moduleId}/add")
    public ResponseEntity<?> add(@PathVariable Long moduleId, @RequestBody TorrentAddRequestDTO req) {
        TorrentData data = getTorrentData(moduleId);
        if (data == null) return badModule();

        if (req.getUrl() == null || req.getUrl().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "URL не задан"));
        }

        boolean ok = torrentService.add(
                data,
                req.getUrl().trim(),
                req.getSavePath(),
                req.getCategory(),
                req.getSequentialDownload(),
                req.getFirstLastPiecePrio()
        );

        return ResponseEntity.ok(Map.of(
                "success", ok,
                "message", ok ? "✅ Торрент добавлен" : "❌ Не удалось добавить торрент"
        ));
    }

    @PostMapping("/{moduleId}/{hash}/pause")
    public ResponseEntity<?> pause(@PathVariable Long moduleId, @PathVariable String hash) {
        TorrentData data = getTorrentData(moduleId);
        if (data == null) return badModule();
        boolean ok = torrentService.pause(data, hash);
        return ResponseEntity.ok(Map.of("success", ok));
    }

    @PostMapping("/{moduleId}/{hash}/resume")
    public ResponseEntity<?> resume(@PathVariable Long moduleId, @PathVariable String hash) {
        TorrentData data = getTorrentData(moduleId);
        if (data == null) return badModule();
        boolean ok = torrentService.resume(data, hash);
        return ResponseEntity.ok(Map.of("success", ok));
    }

    @PostMapping("/{moduleId}/{hash}/delete")
    public ResponseEntity<?> delete(@PathVariable Long moduleId,
                                    @PathVariable String hash,
                                    @RequestParam(name = "deleteFiles", defaultValue = "false") boolean deleteFiles) {
        TorrentData data = getTorrentData(moduleId);
        if (data == null) return badModule();
        boolean ok = torrentService.delete(data, hash, deleteFiles);
        return ResponseEntity.ok(Map.of("success", ok));
    }

    @PostMapping("/{moduleId}/{hash}/toggle-sequential")
    public ResponseEntity<?> toggleSequential(@PathVariable Long moduleId, @PathVariable String hash) {
        TorrentData data = getTorrentData(moduleId);
        if (data == null) return badModule();
        boolean ok = torrentService.toggleSequential(data, hash);
        // после toggle возвращаем новое состояние
        TorrentDTO t = torrentService.findTorrent(data, hash);
        return ResponseEntity.ok(Map.of(
                "success", ok,
                "sequentialDownload", t != null && t.isSequentialDownload()
        ));
    }

    @PostMapping("/{moduleId}/{hash}/toggle-first-last")
    public ResponseEntity<?> toggleFirstLast(@PathVariable Long moduleId, @PathVariable String hash) {
        TorrentData data = getTorrentData(moduleId);
        if (data == null) return badModule();
        boolean ok = torrentService.toggleFirstLast(data, hash);
        TorrentDTO t = torrentService.findTorrent(data, hash);
        return ResponseEntity.ok(Map.of(
                "success", ok,
                "firstLastPiecePrio", t != null && t.isFirstLastPiecePrio()
        ));
    }

    @PostMapping("/{moduleId}/{hash}/reannounce")
    public ResponseEntity<?> reannounce(@PathVariable Long moduleId, @PathVariable String hash) {
        TorrentData data = getTorrentData(moduleId);
        if (data == null) return badModule();
        boolean ok = torrentService.reannounce(data, hash);
        return ResponseEntity.ok(Map.of("success", ok));
    }

    @PostMapping("/{moduleId}/file-priority")
    public ResponseEntity<?> filePriority(@PathVariable Long moduleId,
                                          @RequestBody FilePriorityRequestDTO req) {
        TorrentData data = getTorrentData(moduleId);
        if (data == null) return badModule();
        if (req.getHash() == null || req.getFileIds() == null || req.getFileIds().length == 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "hash/fileIds не заданы"));
        }
        boolean ok = torrentService.setFilePriority(data, req.getHash(), req.getFileIds(), req.getPriority());
        return ResponseEntity.ok(Map.of("success", ok));
    }

    @PostMapping("/{moduleId}/speed-limits-mode")
    public ResponseEntity<?> speedLimitsMode(@PathVariable Long moduleId,
                                             @RequestParam(name = "slow", required = false) Boolean slow) {
        TorrentData data = getTorrentData(moduleId);
        if (data == null) return badModule();

        boolean ok;
        if (slow == null) {
            // чистый toggle
            ok = torrentService.toggleSpeedLimitsMode(data);
        } else {
            ok = torrentService.setSpeedLimitsMode(data, slow);
        }
        int mode = torrentService.getSpeedLimitsMode(data);
        return ResponseEntity.ok(Map.of(
                "success", ok,
                "speedLimitsMode", mode
        ));
    }

    // ============================================================
    //  ХЕЛПЕРЫ
    // ============================================================

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

    @PostMapping("/{moduleId}/add-file")
    public ResponseEntity<?> addFile(@PathVariable Long moduleId,
                                     @RequestParam("file") org.springframework.web.multipart.MultipartFile file,
                                     @RequestParam(value = "savePath", required = false) String savePath,
                                     @RequestParam(value = "sequentialDownload", required = false) Boolean sequential,
                                     @RequestParam(value = "firstLastPiecePrio", required = false) Boolean firstLast) {
        TorrentData data = getTorrentData(moduleId);
        if (data == null) return badModule();

        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Файл не задан"));
        }

        try {
            boolean ok = torrentService.addTorrentFile(
                    data,
                    file.getBytes(),
                    file.getOriginalFilename(),
                    savePath,
                    null,
                    sequential,
                    firstLast
            );
            return ResponseEntity.ok(Map.of(
                    "success", ok,
                    "message", ok ? "✅ Торрент добавлен" : "❌ Не удалось добавить"
            ));
        } catch (Exception e) {
            log.error("Ошибка add-file: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    private ResponseEntity<?> badModule() {
        return ResponseEntity.badRequest().body(Map.of("error", "Модуль не найден или не TORRENT"));
    }
}