package org.alex.everyWeb.page.controller;

import org.alex.everyWeb.link.model.Link;
import org.alex.everyWeb.link.repository.DTO.LinkRequestDTO;
import org.alex.everyWeb.link.service.LinksService;
import org.alex.everyWeb.module.model.Module;
import org.alex.everyWeb.page.model.Page;
import org.alex.everyWeb.page.service.PageService;
import org.alex.everyWeb.wallpaper.service.WallpaperService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class ApiController {

    @Autowired
    private PageService pageService;

    @Autowired
    private LinksService linksService;

    @Autowired
    private WallpaperService wallpaperService;

    // ===== НАСТРОЙКИ =====
    @GetMapping("/settings/{pageId}")
    public ResponseEntity<?> getSettings(@PathVariable Long pageId) {
        try {
            Page page = pageService.getPageById(pageId);
            Map<String, Object> settings = new HashMap<>();

            // Доступные модули
            List<Map<String, Object>> availableModules = Arrays.asList(
                    createModuleType("WEATHER", "Погода", "Показывает погоду в выбранном городе", "🌤️", true),
                    createModuleType("NOTES", "Заметки", "Быстрые заметки", "📝", true),
                    createModuleType("CALENDAR", "Календарь", "Календарь с событиями", "📅", true),
                    createModuleType("CLOCK", "Часы", "Цифровые часы", "🕐", true),
                    createModuleType("TODO", "Список дел", "To-Do список", "✅", true)
            );
            settings.put("availableModules", availableModules);

            // ===== ССЫЛКИ - ПРАВИЛЬНО ПЕРЕДАЕМ ВСЕ ПОЛЯ =====
            List<Map<String, Object>> links = page.getLinks().stream()
                    .map(link -> {
                        Map<String, Object> map = new HashMap<>();
                        map.put("id", link.getId());
                        map.put("title", link.getTitle());
                        map.put("url", link.getUrl());
                        map.put("icon", link.getIcon());
                        map.put("iconType", link.getIconType());        // ← ДОБАВЛЯЕМ
                        map.put("customImage", link.getCustomImage());  // ← ДОБАВЛЯЕМ
                        map.put("position", link.getPosition());
                        return map;
                    })
                    .collect(Collectors.toList());
            settings.put("links", links);

            // Модули
            List<Map<String, Object>> modules = page.getModules().stream()
                    .map(module -> {
                        Map<String, Object> map = new HashMap<>();
                        map.put("id", module.getId());
                        map.put("type", module.getType());
                        map.put("title", module.getTitle());
                        map.put("settings", module.getSettings() != null ? module.getSettings() : "{}");
                        map.put("position", module.getPosition());
                        return map;
                    })
                    .collect(Collectors.toList());
            settings.put("modules", modules);

            // Информация об обоях
            try {
                var wallpaperInfo = wallpaperService.getWallpaperInfo(pageId);
                settings.put("currentWallpaper", wallpaperInfo.getCurrentWallpaper());
                settings.put("availableWallpapers", wallpaperInfo.getWallpapers());
                settings.put("wallpaperCount", wallpaperInfo.getCount());
                settings.put("wallpaperMode", wallpaperInfo.getMode());
                settings.put("wallpaperAutoChange", wallpaperInfo.isAutoChange());
                settings.put("wallpaperChangeInterval", wallpaperInfo.getChangeInterval());
                settings.put("wallpaperChangeMode", wallpaperInfo.getChangeMode());
            } catch (Exception e) {
                settings.put("currentWallpaper", null);
                settings.put("availableWallpapers", new ArrayList<>());
                settings.put("wallpaperCount", 0);
                settings.put("wallpaperMode", "STATIC");
                settings.put("wallpaperAutoChange", false);
                settings.put("wallpaperChangeInterval", 30);
                settings.put("wallpaperChangeMode", "RANDOM");
            }

            return ResponseEntity.ok(settings);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }

    // ===== ССЫЛКИ =====
    @PostMapping("/links/add")
    public ResponseEntity<?> addLink(@RequestBody LinkRequestDTO request) {
        try {
            String title = request.getTitle();
            String url = request.getUrl();
            String icon = request.getIcon();
            String iconType = request.getIconType();
            String customImage = request.getCustomImage();
            Long pageId = request.getPageId();

            if (pageId == null) {
                return ResponseEntity.badRequest().body("Page ID is required");
            }
            if (title == null || title.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("Title is required");
            }
            if (url == null || url.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("URL is required");
            }

            url = url.trim();
            if (!url.startsWith("http://") && !url.startsWith("https://")) {
                url = "https://" + url;
            }

            // ===== ЛОГИКА ОПРЕДЕЛЕНИЯ ИКОНКИ =====
            System.out.println("=== ADD LINK DEBUG ===");
            System.out.println("Received icon: " + icon);
            System.out.println("Received iconType: " + iconType);
            System.out.println("Received customImage: " + (customImage != null ? "present" : "null"));

            // 1. Если это custom image - НЕ трогаем icon и iconType
            if ("custom".equals(iconType) && customImage != null) {
                System.out.println("✅ Custom image detected, keeping as is");
                // icon должен быть "🔗", iconType должен быть "custom"
                if (icon == null || icon.isEmpty()) {
                    icon = "🔗";
                }
            }
            // 2. Если это favicon - пробуем получить favicon
            else if ("favicon".equals(iconType)) {
                System.out.println("✅ Favicon requested");
                if (icon == null || icon.isEmpty() || icon.equals("🔗")) {
                    String favicon = linksService.getFavicon(url);
                    if (favicon != null) {
                        icon = favicon;
                    } else {
                        icon = "🔗";
                        iconType = "emoji";
                    }
                }
            }
            // 3. Если это эмодзи или не указано
            else {
                System.out.println("✅ Emoji or auto-detect");
                // Если иконка не указана или это дефолтная
                if (icon == null || icon.isEmpty() || icon.equals("🔗")) {
                    String favicon = linksService.getFavicon(url);
                    if (favicon != null) {
                        icon = favicon;
                        iconType = "favicon";
                    } else {
                        icon = "🔗";
                        iconType = "emoji";
                    }
                } else {
                    iconType = "emoji";
                }
            }

            System.out.println("Final icon: " + icon);
            System.out.println("Final iconType: " + iconType);
            System.out.println("Final customImage: " + (customImage != null ? "present" : "null"));

            var linkResponse = linksService.addLink(
                    pageId,
                    title.trim(),
                    url,
                    icon,
                    iconType,
                    customImage
            );
            return ResponseEntity.ok(linkResponse);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }

    @PutMapping("/links/{linkId}")
    public ResponseEntity<?> updateLink(@PathVariable Long linkId, @RequestBody Map<String, String> request) {
        try {
            String title = request.get("title");
            String url = request.get("url");
            String icon = request.get("icon");
            String iconType = request.get("iconType");
            String customImage = request.get("customImage");

            var linkResponse = linksService.updateLink(
                    linkId,
                    title,
                    url,
                    icon,
                    iconType != null ? iconType : "emoji",
                    customImage
            );
            return ResponseEntity.ok(linkResponse);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }

    @DeleteMapping("/links/{linkId}")
    public ResponseEntity<?> deleteLink(@PathVariable Long linkId) {
        try {
            linksService.deleteLink(linkId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }

    @PostMapping("/pages/{pageId}/links/reorder")
    public ResponseEntity<?> reorderLinks(@PathVariable Long pageId, @RequestBody List<Long> linkIds) {
        try {
            linksService.reorderLinks(pageId, linkIds);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }

    @GetMapping("/links/favicon")
    public ResponseEntity<?> getFavicon(@RequestParam String url) {
        try {
            String favicon = linksService.getFavicon(url);
            if (favicon != null) {
                return ResponseEntity.ok(favicon);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }

    @GetMapping("/links/{linkId}")
    public ResponseEntity<?> getLink(@PathVariable Long linkId) {
        try {
            // Получаем ссылку из базы
            Link link = linksService.getLinkById(linkId);
            if (link == null) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok(link);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }

    // ===== СТРАНИЦЫ =====
    @PostMapping("/pages")
    public ResponseEntity<?> createPage(@RequestBody Map<String, String> request) {
        try {
            String name = request.get("name");
            if (name == null || name.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("Name is required");
            }
            Page page = pageService.createPage(name.trim());
            return ResponseEntity.ok(page);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }

    @DeleteMapping("/pages/{pageId}")
    public ResponseEntity<?> deletePage(@PathVariable Long pageId) {
        try {
            pageService.deletePage(pageId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }

    // ===== МОДУЛИ =====
    @PostMapping("/pages/{pageId}/modules")
    public ResponseEntity<?> addModule(@PathVariable Long pageId, @RequestBody Map<String, String> request) {
        try {
            String type = request.get("type");
            String title = request.get("title");
            String settings = request.get("settings");

            if (type == null || type.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("Type is required");
            }
            if (title == null || title.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("Title is required");
            }

            Module module = pageService.addModule(
                    pageId,
                    type.trim(),
                    title.trim(),
                    settings != null ? settings : "{}"
            );
            return ResponseEntity.ok(module);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }

    @PutMapping("/modules/{moduleId}")
    public ResponseEntity<?> updateModule(@PathVariable Long moduleId, @RequestBody Map<String, String> request) {
        try {
            String title = request.get("title");
            String settings = request.get("settings");

            Module module = pageService.updateModule(moduleId, title, settings);
            return ResponseEntity.ok(module);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }

    @DeleteMapping("/modules/{moduleId}")
    public ResponseEntity<?> deleteModule(@PathVariable Long moduleId) {
        try {
            pageService.deleteModule(moduleId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }

    @PostMapping("/pages/{pageId}/modules/reorder")
    public ResponseEntity<?> reorderModules(@PathVariable Long pageId, @RequestBody List<Long> moduleIds) {
        try {
            pageService.reorderModules(pageId, moduleIds);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }

    private Map<String, Object> createModuleType(String type, String name, String description, String icon, boolean enabled) {
        Map<String, Object> map = new HashMap<>();
        map.put("type", type);
        map.put("name", name);
        map.put("description", description);
        map.put("icon", icon);
        map.put("enabled", enabled);
        return map;
    }

    // ===== НАСТРОЙКИ ССЫЛОК =====
    @PutMapping("/pages/{pageId}/links/settings")
    public ResponseEntity<?> updateLinkSettings(@PathVariable Long pageId,
                                                @RequestBody Map<String, Object> request) {
        try {
            Integer iconSize = request.get("iconSize") != null ?
                    Integer.parseInt(request.get("iconSize").toString()) : null;
            Integer fontSize = request.get("fontSize") != null ?
                    Integer.parseInt(request.get("fontSize").toString()) : null;
            Integer bgOpacity = request.get("bgOpacity") != null ?
                    Integer.parseInt(request.get("bgOpacity").toString()) : null;
            Integer bgDarkness = request.get("bgDarkness") != null ?
                    Integer.parseInt(request.get("bgDarkness").toString()) : null;

            Page page = pageService.updateLinkSettings(pageId, iconSize, fontSize, bgOpacity, bgDarkness);

            // ===== ВАЖНО: Возвращаем ВСЕ настройки =====
            Map<String, Object> response = new HashMap<>();
            response.put("id", page.getId());
            response.put("iconSize", page.getLinkIconSize());
            response.put("fontSize", page.getLinkFontSize());
            response.put("bgOpacity", page.getLinkBgOpacity());
            response.put("bgDarkness", page.getLinkBgDarkness());
            response.put("showAddLinkButton", page.getShowAddLinkButton() != null ? page.getShowAddLinkButton() : true);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }

    @GetMapping("/pages/{pageId}/links/settings")
    public ResponseEntity<?> getLinkSettings(@PathVariable Long pageId) {
        try {
            Page page = pageService.getPageById(pageId);
            Map<String, Object> settings = new HashMap<>();
            settings.put("iconSize", page.getLinkIconSize());
            settings.put("fontSize", page.getLinkFontSize());
            settings.put("bgOpacity", page.getLinkBgOpacity());
            settings.put("bgDarkness", page.getLinkBgDarkness());
            // ===== ВАЖНО: Добавляем showAddLinkButton =====
            settings.put("showAddLinkButton", page.getShowAddLinkButton() != null ? page.getShowAddLinkButton() : true);
            return ResponseEntity.ok(settings);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }

    // ===== НАСТРОЙКА КНОПКИ ДОБАВЛЕНИЯ =====
    @PutMapping("/pages/{pageId}/show-add-button")
    public ResponseEntity<?> updateShowAddLinkButton(@PathVariable Long pageId,
                                                     @RequestBody Map<String, Boolean> request) {
        try {
            Boolean show = request.get("show");
            Page page = pageService.updateShowAddLinkButton(pageId, show);
            return ResponseEntity.ok(page);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }

    @GetMapping("/pages/{pageId}/show-add-button")
    public ResponseEntity<?> getShowAddLinkButton(@PathVariable Long pageId) {
        try {
            Page page = pageService.getPageById(pageId);
            Map<String, Boolean> response = new HashMap<>();
            response.put("show", page.getShowAddLinkButton() != null ? page.getShowAddLinkButton() : true);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }
}