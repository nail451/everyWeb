package org.alex.everyWeb.wallpaper.scheduler;

import org.alex.everyWeb.wallpaper.service.WallpaperService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class WallpaperScheduler {

    private static final Logger logger = LoggerFactory.getLogger(WallpaperScheduler.class);

    @Autowired
    private WallpaperService wallpaperService;

    // Кэш для хранения последнего изменения (чтобы не дублировать логи)
    private final Map<Long, String> lastWallpaperCache = new ConcurrentHashMap<>();

    // Проверяем каждые 10 секунд
    @Scheduled(fixedDelay = 10000)
    public void checkWallpapers() {
        // Здесь можно реализовать проверку для всех активных страниц
        // Для простоты пока просто логируем
        logger.debug("Wallpaper scheduler running...");
    }

    // Проверка для конкретной страницы вызывается через API
    public void checkPage(Long pageId) {
        try {
            WallpaperService.WallpaperChangeResult result =
                    wallpaperService.checkAndChangeIfNeeded(pageId);

            if (result.isChanged()) {
                String newPath = result.getPath();
                String oldPath = lastWallpaperCache.put(pageId, newPath);
                logger.info("Wallpaper auto-changed for page {}: {} -> {}",
                        pageId, oldPath, newPath);
            }
        } catch (Exception e) {
            logger.error("Error checking page {}: {}", pageId, e.getMessage());
        }
    }
}