package org.alex.everyWeb.wallpaper.contoller;

import org.alex.everyWeb.wallpaper.model.WallpaperSettings;
import org.alex.everyWeb.wallpaper.repository.DTO.WallpaperInfoDTO;
import org.alex.everyWeb.wallpaper.repository.DTO.WallpaperSettingsDTO;
import org.alex.everyWeb.wallpaper.service.WallpaperService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/wallpaper")
public class WallpaperController {

    private static final Logger logger = LoggerFactory.getLogger(WallpaperController.class);

    @Autowired
    private WallpaperService wallpaperService;

    // ===== ПОЛУЧЕНИЕ ИНФОРМАЦИИ =====
    @GetMapping("/{pageId}")
    public ResponseEntity<?> getWallpaperInfo(@PathVariable Long pageId) {
        try {
            WallpaperInfoDTO info = wallpaperService.getWallpaperInfo(pageId);
            return ResponseEntity.ok(info);
        } catch (Exception e) {
            logger.error("Error getting wallpaper info for page {}: {}", pageId, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }

    @GetMapping("/{pageId}/list")
    public ResponseEntity<?> getWallpapersList(@PathVariable Long pageId) {
        try {
            List<String> wallpapers = wallpaperService.getWallpapersList(pageId);
            return ResponseEntity.ok(wallpapers);
        } catch (Exception e) {
            logger.error("Error getting wallpapers list for page {}: {}", pageId, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }

    // ===== ЗАГРУЗКА =====
    @PostMapping("/upload/{pageId}")
    public ResponseEntity<?> uploadWallpaper(
            @PathVariable Long pageId,
            @RequestParam("file") MultipartFile file) {
        try {
            logger.info("Upload request for page: {}, file size: {}", pageId, file.getSize());
            String path = wallpaperService.uploadWallpaper(pageId, file);

            Map<String, Object> response = new HashMap<>();
            response.put("path", path);
            response.put("message", "Wallpaper uploaded successfully");
            response.put("size", file.getSize());
            response.put("contentType", file.getContentType());

            return ResponseEntity.ok(response);
        } catch (MaxUploadSizeExceededException e) {
            logger.error("Upload size exceeded: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                    .body("File is too large. Maximum size: 50MB");
        } catch (Exception e) {
            logger.error("Error uploading wallpaper for page {}: {}", pageId, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }

    // ===== УСТАНОВКА ТЕКУЩИХ ОБОЕВ =====
    @PutMapping("/{pageId}/set")
    public ResponseEntity<?> setCurrentWallpaper(
            @PathVariable Long pageId,
            @RequestBody Map<String, String> request) {
        try {
            String path = request.get("path");
            if (path == null || path.isEmpty()) {
                return ResponseEntity.badRequest().body("Path is required");
            }
            String result = wallpaperService.setCurrentWallpaper(pageId, path);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            logger.error("Error setting wallpaper for page {}: {}", pageId, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }

    // ===== СЛЕДУЮЩИЕ ОБОИ =====
    @PostMapping("/{pageId}/next")
    public ResponseEntity<?> getNextWallpaper(@PathVariable Long pageId) {
        try {
            String path = wallpaperService.getNextWallpaper(pageId);
            if (path == null) {
                return ResponseEntity.badRequest().body("No wallpapers available");
            }
            Map<String, Object> response = new HashMap<>();
            response.put("path", path);
            response.put("message", "Wallpaper changed");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error getting next wallpaper for page {}: {}", pageId, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }

    // ===== ПОЛУЧЕНИЕ СЛУЧАЙНЫХ ОБОЕВ =====
    @GetMapping("/{pageId}/random")
    public ResponseEntity<?> getRandomWallpaper(@PathVariable Long pageId) {
        try {
            String path = wallpaperService.getRandomWallpaper(pageId);
            if (path == null) {
                return ResponseEntity.badRequest().body("No wallpapers available");
            }
            return ResponseEntity.ok(path);
        } catch (Exception e) {
            logger.error("Error getting random wallpaper for page {}: {}", pageId, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }

    // ===== УДАЛЕНИЕ =====
    @DeleteMapping("/{pageId}/delete")
    public ResponseEntity<?> deleteWallpaper(
            @PathVariable Long pageId,
            @RequestBody Map<String, String> request) {
        try {
            String path = request.get("path");
            if (path == null || path.isEmpty()) {
                return ResponseEntity.badRequest().body("Path is required");
            }
            wallpaperService.deleteWallpaper(pageId, path);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            logger.error("Error deleting wallpaper for page {}: {}", pageId, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }

    @DeleteMapping("/{pageId}/delete-all")
    public ResponseEntity<?> deleteAllWallpapers(@PathVariable Long pageId) {
        try {
            wallpaperService.deleteAllWallpapers(pageId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            logger.error("Error deleting all wallpapers for page {}: {}", pageId, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }

    // ===== НАСТРОЙКИ =====
    @PutMapping("/{pageId}/settings")
    public ResponseEntity<?> updateSettings(
            @PathVariable Long pageId,
            @RequestBody WallpaperSettingsDTO settings) {
        try {
            WallpaperSettings result = wallpaperService.updateSettings(pageId, settings);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            logger.error("Error updating wallpaper settings for page {}: {}", pageId, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }

    // ===== ПРОВЕРКА СМЕНЫ =====
    @GetMapping("/{pageId}/check")
    public ResponseEntity<?> checkAndChange(@PathVariable Long pageId) {
        try {
            WallpaperService.WallpaperChangeResult result =
                    wallpaperService.checkAndChangeIfNeeded(pageId);

            Map<String, Object> response = new HashMap<>();
            response.put("changed", result.isChanged());
            response.put("path", result.getPath());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error checking wallpaper change for page {}: {}", pageId, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }
}