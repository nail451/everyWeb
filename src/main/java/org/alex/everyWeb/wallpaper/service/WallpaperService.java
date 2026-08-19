package org.alex.everyWeb.wallpaper.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.transaction.Transactional;
import org.alex.everyWeb.page.model.Page;
import org.alex.everyWeb.page.repository.PageRepository;
import org.alex.everyWeb.wallpaper.model.WallpaperSettings;
import org.alex.everyWeb.wallpaper.repository.DTO.WallpaperInfoDTO;
import org.alex.everyWeb.wallpaper.repository.DTO.WallpaperSettingsDTO;
import org.alex.everyWeb.wallpaper.repository.WallpaperSettingsRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.*;

@Service
@Transactional
public class WallpaperService {

    private static final Logger logger = LoggerFactory.getLogger(WallpaperService.class);

    @Autowired
    private WallpaperSettingsRepository wallpaperSettingsRepository;

    @Autowired
    private PageRepository pageRepository;

    @Value("${app.wallpaper.upload-dir:./wallpapers}")
    private String uploadDir;

    @Value("${app.wallpaper.max-file-size:52428800}")
    private long maxFileSize;

    private final ObjectMapper objectMapper = new ObjectMapper();

    // ===== ПОЛУЧЕНИЕ НАСТРОЕК =====
    public WallpaperSettings getSettings(Long pageId) {
        return wallpaperSettingsRepository.findByPageId(pageId)
                .orElseGet(() -> createDefaultSettings(pageId));
    }

    private WallpaperSettings createDefaultSettings(Long pageId) {
        logger.info("Creating default wallpaper settings for page: {}", pageId);
        Page page = pageRepository.findById(pageId)
                .orElseThrow(() -> new RuntimeException("Page not found: " + pageId));

        WallpaperSettings settings = new WallpaperSettings();
        settings.setPage(page);
        settings.setMode("STATIC");
        settings.setWallpapersList("[]");
        settings.setCurrentIndex(0);
        settings.setAutoChange(false);
        settings.setChangeInterval(30);
        settings.setChangeMode("RANDOM");
        settings.setLastChangedAt(LocalDateTime.now());

        return wallpaperSettingsRepository.save(settings);
    }

    // ===== ЗАГРУЗКА ОБОЕВ =====
    public String uploadWallpaper(Long pageId, MultipartFile file) throws IOException {
        logger.info("Uploading wallpaper for page: {}, file size: {} bytes", pageId, file.getSize());

        // Валидация
        validateFile(file);

        // Проверяем, что это действительно изображение
        if (!isValidImage(file)) {
            throw new RuntimeException("File is not a valid image");
        }

        // Создаем директорию для страницы
        Path pageDir = getPageDirectory(pageId);
        if (!Files.exists(pageDir)) {
            Files.createDirectories(pageDir);
        }

        // Генерируем имя файла
        String filename = generateFileName(file.getOriginalFilename());
        Path filePath = pageDir.resolve(filename);

        // Сохраняем файл
        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
        logger.info("Uploaded wallpaper: {} for page: {}", filename, pageId);

        // Обновляем настройки
        String relativePath = "/wallpapers/page_" + pageId + "/" + filename;
        WallpaperSettings settings = getSettings(pageId);
        List<String> wallpapers = getWallpapersList(settings);
        wallpapers.add(relativePath);
        settings.setWallpapersList(objectMapper.writeValueAsString(wallpapers));

        // Если это первое изображение или режим STATIC - устанавливаем как текущее
        if (settings.getMode().equals("STATIC") || settings.getCurrentWallpaper() == null) {
            settings.setCurrentWallpaper(relativePath);
            settings.setCurrentIndex(wallpapers.size() - 1);
        }

        wallpaperSettingsRepository.save(settings);
        return relativePath;
    }

    private void validateFile(MultipartFile file) {
        if (file.isEmpty()) {
            throw new RuntimeException("File is empty");
        }

        // Проверка размера
        if (file.getSize() > maxFileSize) {
            throw new RuntimeException(String.format(
                    "File too large. Max size: %d MB, your file: %d MB",
                    maxFileSize / 1024 / 1024,
                    file.getSize() / 1024 / 1024
            ));
        }

        // Проверка Content-Type
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new RuntimeException("Only images are allowed. Content-Type: " + contentType);
        }

        // Проверка расширения
        String filename = file.getOriginalFilename();
        if (filename != null) {
            String extension = filename.substring(filename.lastIndexOf('.')).toLowerCase();
            List<String> allowedExtensions = Arrays.asList(".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp");
            if (!allowedExtensions.contains(extension)) {
                throw new RuntimeException("Unsupported file format: " + extension +
                        ". Allowed: " + String.join(", ", allowedExtensions));
            }
        }
    }

    private boolean isValidImage(MultipartFile file) {
        try {
            BufferedImage image = ImageIO.read(file.getInputStream());
            return image != null;
        } catch (IOException e) {
            logger.error("Error reading image: {}", e.getMessage());
            return false;
        }
    }

    private Path getPageDirectory(Long pageId) {
        return Paths.get(uploadDir, "page_" + pageId);
    }

    private String generateFileName(String originalFilename) {
        String extension = originalFilename.substring(originalFilename.lastIndexOf('.'));
        return System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 8) + extension;
    }

    // ===== РАБОТА СО СПИСКОМ ОБОЕВ =====
    public List<String> getWallpapersList(Long pageId) {
        WallpaperSettings settings = getSettings(pageId);
        return getWallpapersList(settings);
    }

    private List<String> getWallpapersList(WallpaperSettings settings) {
        try {
            String json = settings.getWallpapersList();
            if (json == null || json.isEmpty() || json.equals("[]")) {
                return new ArrayList<>();
            }
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            logger.error("Error parsing wallpapers list: {}", e.getMessage());
            return new ArrayList<>();
        }
    }

    private void saveWallpapersList(WallpaperSettings settings, List<String> wallpapers) {
        try {
            settings.setWallpapersList(objectMapper.writeValueAsString(wallpapers));
        } catch (Exception e) {
            logger.error("Error saving wallpapers list: {}", e.getMessage());
            throw new RuntimeException("Error saving wallpapers list", e);
        }
    }

    // ===== УПРАВЛЕНИЕ ТЕКУЩИМИ ОБОЯМИ =====
    public String setCurrentWallpaper(Long pageId, String wallpaperPath) {
        WallpaperSettings settings = getSettings(pageId);
        List<String> wallpapers = getWallpapersList(settings);

        if (!wallpapers.contains(wallpaperPath)) {
            throw new RuntimeException("Wallpaper not found for this page");
        }

        settings.setCurrentWallpaper(wallpaperPath);
        settings.setMode("STATIC");
        settings.setCurrentIndex(wallpapers.indexOf(wallpaperPath));
        settings.setLastChangedAt(LocalDateTime.now());
        wallpaperSettingsRepository.save(settings);

        logger.info("Set current wallpaper for page {}: {}", pageId, wallpaperPath);
        return wallpaperPath;
    }

    public String getNextWallpaper(Long pageId) {
        WallpaperSettings settings = getSettings(pageId);
        List<String> wallpapers = getWallpapersList(settings);

        if (wallpapers.isEmpty()) {
            return null;
        }

        if (wallpapers.size() == 1) {
            settings.setCurrentWallpaper(wallpapers.get(0));
            settings.setCurrentIndex(0);
            wallpaperSettingsRepository.save(settings);
            return wallpapers.get(0);
        }

        String nextWallpaper;
        int newIndex;

        if ("SEQUENTIAL".equals(settings.getChangeMode())) {
            newIndex = (settings.getCurrentIndex() + 1) % wallpapers.size();
            nextWallpaper = wallpapers.get(newIndex);
        } else {
            Random random = new Random();
            int randomIndex;
            do {
                randomIndex = random.nextInt(wallpapers.size());
            } while (wallpapers.size() > 1 && randomIndex == settings.getCurrentIndex());
            newIndex = randomIndex;
            nextWallpaper = wallpapers.get(randomIndex);
        }

        settings.setCurrentIndex(newIndex);
        settings.setCurrentWallpaper(nextWallpaper);
        settings.setLastChangedAt(LocalDateTime.now());
        wallpaperSettingsRepository.save(settings);

        logger.info("Changed wallpaper for page {}: {}", pageId, nextWallpaper);
        return nextWallpaper;
    }

    public String getRandomWallpaper(Long pageId) {
        List<String> wallpapers = getWallpapersList(pageId);
        if (wallpapers.isEmpty()) {
            return null;
        }
        Random random = new Random();
        String randomPath = wallpapers.get(random.nextInt(wallpapers.size()));

        // Обновляем текущие обои
        WallpaperSettings settings = getSettings(pageId);
        settings.setCurrentWallpaper(randomPath);
        settings.setCurrentIndex(wallpapers.indexOf(randomPath));
        settings.setLastChangedAt(LocalDateTime.now());
        wallpaperSettingsRepository.save(settings);

        return randomPath;
    }

    // ===== УДАЛЕНИЕ ОБОЕВ =====
    public void deleteWallpaper(Long pageId, String wallpaperPath) throws IOException {
        WallpaperSettings settings = getSettings(pageId);
        List<String> wallpapers = getWallpapersList(settings);

        if (!wallpapers.contains(wallpaperPath)) {
            throw new RuntimeException("Wallpaper not found");
        }

        // Удаляем из списка
        wallpapers.remove(wallpaperPath);
        saveWallpapersList(settings, wallpapers);

        // Если удаляем текущие обои
        if (wallpaperPath.equals(settings.getCurrentWallpaper())) {
            if (!wallpapers.isEmpty()) {
                settings.setCurrentWallpaper(wallpapers.get(0));
                settings.setCurrentIndex(0);
            } else {
                settings.setCurrentWallpaper(null);
                settings.setCurrentIndex(0);
            }
            settings.setLastChangedAt(LocalDateTime.now());
        }

        wallpaperSettingsRepository.save(settings);

        // Удаляем файл
        String fileName = wallpaperPath.substring(wallpaperPath.lastIndexOf('/') + 1);
        Path pageDir = getPageDirectory(pageId);
        Path filePath = pageDir.resolve(fileName);
        boolean deleted = Files.deleteIfExists(filePath);

        if (deleted) {
            logger.info("Deleted wallpaper: {} for page: {}", fileName, pageId);
        } else {
            logger.warn("Wallpaper file not found: {}", filePath);
        }
    }

    public void deleteAllWallpapers(Long pageId) throws IOException {
        WallpaperSettings settings = getSettings(pageId);
        List<String> wallpapers = getWallpapersList(settings);

        // Удаляем все файлы
        Path pageDir = getPageDirectory(pageId);
        for (String path : wallpapers) {
            String fileName = path.substring(path.lastIndexOf('/') + 1);
            Path filePath = pageDir.resolve(fileName);
            Files.deleteIfExists(filePath);
        }

        // Очищаем настройки
        settings.setWallpapersList("[]");
        settings.setCurrentWallpaper(null);
        settings.setCurrentIndex(0);
        settings.setLastChangedAt(LocalDateTime.now());
        wallpaperSettingsRepository.save(settings);

        // Удаляем директорию если она пуста
        try {
            Files.deleteIfExists(pageDir);
        } catch (IOException e) {
            logger.warn("Could not delete page directory: {}", pageDir);
        }

        logger.info("Deleted all wallpapers for page: {}", pageId);
    }

    // ===== ОБНОВЛЕНИЕ НАСТРОЕК =====
    public WallpaperSettings updateSettings(Long pageId, WallpaperSettingsDTO dto) {
        WallpaperSettings settings = getSettings(pageId);

        if (dto.getMode() != null) {
            settings.setMode(dto.getMode());
        }

        if (dto.getAutoChange() != null) {
            settings.setAutoChange(dto.getAutoChange());
        }

        if (dto.getChangeInterval() != null) {
            if (dto.getChangeInterval() < 5) {
                throw new RuntimeException("Change interval must be at least 5 seconds");
            }
            settings.setChangeInterval(dto.getChangeInterval());
        }

        if (dto.getChangeMode() != null) {
            settings.setChangeMode(dto.getChangeMode());
        }

        return wallpaperSettingsRepository.save(settings);
    }

    // ===== ПОЛУЧЕНИЕ ИНФОРМАЦИИ =====
    public WallpaperInfoDTO getWallpaperInfo(Long pageId) {
        WallpaperSettings settings = getSettings(pageId);
        List<String> wallpapers = getWallpapersList(settings);

        WallpaperInfoDTO info = new WallpaperInfoDTO();
        info.setCurrentWallpaper(settings.getCurrentWallpaper());
        info.setWallpapers(wallpapers);
        info.setCount(wallpapers.size());
        info.setMode(settings.getMode());
        info.setAutoChange(settings.isAutoChange());
        info.setChangeInterval(settings.getChangeInterval());
        info.setChangeMode(settings.getChangeMode());
        info.setCurrentIndex(settings.getCurrentIndex());
        info.setLastChangedAt(settings.getLastChangedAt());

        // Рассчитываем время следующей смены
        if (settings.isAutoChange() && settings.getLastChangedAt() != null) {
            info.setNextChangeAt(settings.getLastChangedAt().plusSeconds(settings.getChangeInterval()));
        }

        return info;
    }

    // ===== ПРОВЕРКА НЕОБХОДИМОСТИ СМЕНЫ =====
    public WallpaperChangeResult checkAndChangeIfNeeded(Long pageId) {
        WallpaperSettings settings = getSettings(pageId);
        List<String> wallpapers = getWallpapersList(settings);

        if (!settings.isAutoChange() || wallpapers.isEmpty() || wallpapers.size() <= 1) {
            return new WallpaperChangeResult(false, settings.getCurrentWallpaper());
        }

        if (settings.getCurrentWallpaper() == null) {
            String next = getNextWallpaper(pageId);
            return new WallpaperChangeResult(true, next);
        }

        LocalDateTime lastChanged = settings.getLastChangedAt();
        if (lastChanged == null) {
            String next = getNextWallpaper(pageId);
            return new WallpaperChangeResult(true, next);
        }

        long secondsSinceLastChange = java.time.Duration.between(lastChanged, LocalDateTime.now()).getSeconds();
        if (secondsSinceLastChange >= settings.getChangeInterval()) {
            String next = getNextWallpaper(pageId);
            return new WallpaperChangeResult(true, next);
        }

        return new WallpaperChangeResult(false, settings.getCurrentWallpaper());
    }

    // ===== ВНУТРЕННИЙ КЛАСС ДЛЯ РЕЗУЛЬТАТА =====
    public static class WallpaperChangeResult {
        private final boolean changed;
        private final String path;

        public WallpaperChangeResult(boolean changed, String path) {
            this.changed = changed;
            this.path = path;
        }

        public boolean isChanged() { return changed; }
        public String getPath() { return path; }
    }
}