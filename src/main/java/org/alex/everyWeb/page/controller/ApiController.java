package org.alex.everyWeb.page.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.alex.everyWeb.config.PasswordService;
import org.alex.everyWeb.link.repository.DTO.LinkDTO;
import org.alex.everyWeb.link.repository.DTO.LinkRequestDTO;
import org.alex.everyWeb.link.service.LinksService;
import org.alex.everyWeb.modules.entity.ModuleEntity;
import org.alex.everyWeb.modules.impl.notes.CalendarNoteRepository;
import org.alex.everyWeb.modules.repository.ModuleRepository;
import org.alex.everyWeb.modules.service.AvailableModuleService;
import org.alex.everyWeb.modules.service.ModulesService;
import org.alex.everyWeb.page.dto.WidgetDTO;
import org.alex.everyWeb.page.entity.Page;
import org.alex.everyWeb.page.entity.PageLayout;
import org.alex.everyWeb.page.service.LayoutService;
import org.alex.everyWeb.page.service.PageService;
import org.alex.everyWeb.wallpaper.service.WallpaperService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
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

    @Autowired
    private ModulesService modulesService;

    @Autowired
    private AvailableModuleService availableModuleService;

    @Autowired
    private LayoutService layoutService;

    @Autowired
    private PasswordService passwordService;

    @Autowired
    private ModuleRepository moduleRepository;

    @Autowired
    private CalendarNoteRepository calendarNoteRepository;

    // ===== НАСТРОЙКИ =====
    @GetMapping("/settings/{pageId}")
    public ResponseEntity<?> getSettings(@PathVariable Long pageId) {
        try {
            Page page = pageService.getPageById(pageId);
            Map<String, Object> settings = new HashMap<>();

            // Доступные модули из базы данных
            List<Map<String, Object>> availableModules = availableModuleService.getAvailableModules()
                    .stream()
                    .map(module -> {
                        Map<String, Object> map = new HashMap<>();
                        map.put("type", module.getType());
                        map.put("name", module.getName());
                        map.put("description", module.getDescription());
                        map.put("icon", module.getIcon());
                        map.put("enabled", module.getIsEnabled());
                        map.put("configurable", module.getIsConfigurable());
                        map.put("jsFile", module.getJsFile());
                        map.put("cssClass", module.getCssClass());
                        map.put("defaultRowSpan", module.getDefaultRowSpan() != null ? module.getDefaultRowSpan() : 1);
                        map.put("defaultColSpan", module.getDefaultColSpan() != null ? module.getDefaultColSpan() : 1);
                        return map;
                    })
                    .collect(Collectors.toList());
            settings.put("availableModules", availableModules);

            // Ссылки
            settings.put("links", linksService.getLinksByPageId(pageId));

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

    // ===== СТРАНИЦЫ =====

    @GetMapping("/pages")
    public ResponseEntity<?> getPages() {
        try {
            List<Page> pages = pageService.getAllPages();
            LocalDate today = LocalDate.now();

            List<Map<String, Object>> result = pages.stream().map(page -> {
                Map<String, Object> map = new HashMap<>();
                map.put("id", page.getId());
                map.put("name", page.getName());
                // Просто проверяем, есть ли пароль (не показываем сам пароль)
                map.put("hasPassword", page.getPassword() != null && !page.getPassword().isEmpty());
                map.put("hasNoteToday", hasNoteTodayOnPage(page.getId(), today));
                return map;
            }).collect(Collectors.toList());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }

    @PostMapping("/pages")
    public ResponseEntity<?> createPage(@RequestBody Map<String, String> request) {
        try {
            String name = request.get("name");
            if (name == null || name.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("Name is required");
            }

            String password = request.get("password");
            if (password != null && password.trim().isEmpty()) {
                password = null;
            }

            // Пароль будет зашифрован в PageService
            Page page = pageService.createPage(name.trim(), password);

            Map<String, Object> response = new HashMap<>();
            response.put("id", page.getId());
            response.put("name", page.getName());
            response.put("hasPassword", page.getPassword() != null);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }

    @PostMapping("/page/{pageId}/verify-password")
    public ResponseEntity<?> verifyPassword(@PathVariable Long pageId,
                                            @RequestBody Map<String, String> request) {
        try {
            String password = request.get("password");

            if (password == null || password.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "error", "Password is required"
                ));
            }

            // Используем PageService для проверки пароля
            boolean valid = pageService.verifyPassword(pageId, password);

            Page page = pageService.getPageById(pageId);
            boolean hasPassword = page.getPassword() != null && !page.getPassword().isEmpty();

            return ResponseEntity.ok(Map.of(
                    "valid", valid,
                    "hasPassword", hasPassword
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
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

    @PostMapping("/pages/{pageId}/modules")
    public ResponseEntity<?> addModuleLegacy(@PathVariable Long pageId, @RequestBody Map<String, String> request) {
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

            var module = modulesService.addModule(
                    pageId,
                    type.trim(),
                    title.trim(),
                    settings != null ? settings : "{}",
                    true
            );
            return ResponseEntity.ok(module);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }

    // ===== LAYOUT ENDPOINTS =====
    @GetMapping("/pages/{pageId}/layout")
    public ResponseEntity<?> getLayout(@PathVariable Long pageId) {
        try {
            PageLayout layout = layoutService.getLayout(pageId);
            Map<String, Object> response = new HashMap<>();
            response.put("gridRows", layout.getGridRows());
            response.put("gridCols", layout.getGridCols());
            response.put("isEditing", layout.getIsEditing());
            response.put("widgets", layoutService.getWidgets(pageId));
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }

    @PostMapping("/pages/{pageId}/layout/widget")
    public ResponseEntity<?> addWidget(@PathVariable Long pageId,
                                       @RequestBody Map<String, Object> request) {
        try {
            String type = (String) request.get("type");
            String title = (String) request.get("title");
            Integer rowSpan = request.get("rowSpan") != null ?
                    Integer.parseInt(request.get("rowSpan").toString()) : null;
            Integer colSpan = request.get("colSpan") != null ?
                    Integer.parseInt(request.get("colSpan").toString()) : null;

            WidgetDTO widget = layoutService.addWidget(pageId, type, title, rowSpan, colSpan);
            return ResponseEntity.ok(widget);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }

    @DeleteMapping("/pages/{pageId}/layout/widget/{widgetId}")
    public ResponseEntity<?> removeWidget(@PathVariable Long pageId,
                                          @PathVariable String widgetId) {
        try {
            layoutService.removeWidget(pageId, widgetId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }

    @PutMapping("/pages/{pageId}/layout/widget/position")
    public ResponseEntity<?> updateWidgetPosition(@PathVariable Long pageId,
                                                  @RequestBody Map<String, Object> request) {
        try {
            String widgetId = (String) request.get("widgetId");
            Integer row = Integer.parseInt(request.get("row").toString());
            Integer col = Integer.parseInt(request.get("col").toString());

            layoutService.updateWidgetPosition(pageId, widgetId, row, col);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }

    @PutMapping("/pages/{pageId}/layout/widget/resize")
    public ResponseEntity<?> resizeWidget(@PathVariable Long pageId,
                                          @RequestBody Map<String, Object> request) {
        try {
            String widgetId = (String) request.get("widgetId");
            Integer rowSpan = Integer.parseInt(request.get("rowSpan").toString());
            Integer colSpan = Integer.parseInt(request.get("colSpan").toString());

            List<WidgetDTO> widgets = layoutService.getWidgets(pageId);
            for (WidgetDTO widget : widgets) {
                if (widget.getId().equals(widgetId)) {
                    widget.setRowSpan(rowSpan);
                    widget.setColSpan(colSpan);
                    break;
                }
            }
            layoutService.saveWidgets(pageId, widgets);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }

    @PostMapping("/pages/{pageId}/layout/swap")
    public ResponseEntity<?> swapWidgets(@PathVariable Long pageId,
                                         @RequestBody Map<String, String> request) {
        try {
            String widgetId1 = request.get("widgetId1");
            String widgetId2 = request.get("widgetId2");

            List<WidgetDTO> widgets = layoutService.getWidgets(pageId);
            WidgetDTO w1 = null, w2 = null;

            for (WidgetDTO w : widgets) {
                if (w.getId().equals(widgetId1)) w1 = w;
                if (w.getId().equals(widgetId2)) w2 = w;
            }

            if (w1 != null && w2 != null) {
                int tempRow = w1.getRow();
                int tempCol = w1.getCol();
                w1.setRow(w2.getRow());
                w1.setCol(w2.getCol());
                w2.setRow(tempRow);
                w2.setCol(tempCol);
                layoutService.saveWidgets(pageId, widgets);
            }

            return ResponseEntity.ok().build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }

    @PostMapping("/pages/{pageId}/layout/toggle-edit")
    public ResponseEntity<?> toggleEditMode(@PathVariable Long pageId) {
        try {
            layoutService.toggleEditMode(pageId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }

    // ===== ПОЛУЧЕНИЕ ССЫЛОК ДЛЯ ВИДЖЕТА =====
    @GetMapping("/pages/{pageId}/links")
    public ResponseEntity<?> getPageLinks(@PathVariable Long pageId) {
        try {
            List<LinkDTO> links = linksService.getLinksByPageId(pageId);
            return ResponseEntity.ok(links);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }

    @PutMapping("/pages/{pageId}")
    public ResponseEntity<?> updatePage(@PathVariable Long pageId,
                                        @RequestBody Map<String, Object> request) {
        try {
            String name = (String) request.get("name");
            String password = (String) request.get("password");
            Boolean removePassword = (Boolean) request.get("removePassword");

            Page updated = pageService.updatePage(
                    pageId,
                    name,
                    password,
                    removePassword != null && removePassword
            );

            Map<String, Object> response = new HashMap<>();
            response.put("id", updated.getId());
            response.put("name", updated.getName());
            response.put("hasPassword", updated.getPassword() != null);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("Error: " + e.getMessage());
        }
    }

    @PostMapping("/pages/{pageId}/move")
    public ResponseEntity<?> movePage(@PathVariable Long pageId,
                                      @RequestBody Map<String, String> request) {
        try {
            String direction = request.get("direction");
            if (!"left".equals(direction) && !"right".equals(direction)) {
                return ResponseEntity.badRequest().body("Direction must be 'left' or 'right'");
            }
            pageService.movePage(pageId, direction);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }

    private boolean hasNoteTodayOnPage(Long pageId, LocalDate today) {
        try {
            // Все CALENDAR-модули на странице
            List<ModuleEntity> modules = moduleRepository.findByPageIdOrderByPositionAsc(pageId);
            for (ModuleEntity module : modules) {
                if (!"CALENDAR".equals(module.getType())) continue;

                // Проверяем, есть ли linkedToNotes: true
                String settings = module.getSettings();
                if (settings == null || settings.isEmpty()) continue;
                // Парсим JSON, ищем linkedToNotes === true
                // ... (см. ниже парсер)
                boolean linked = parseLinkedToNotes(settings);
                if (!linked) continue;

                // Проверяем, есть ли заметка на сегодня
                boolean hasNote = calendarNoteRepository.existsNoteOnDate(module.getId(), today);
                if (hasNote) return true;
            }
        } catch (Exception e) {
            // Игнорируем
        }
        return false;
    }

    private boolean parseLinkedToNotes(String settingsJson) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            Map<String, Object> map = mapper.readValue(settingsJson,
                    new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {});
            Object v = map.get("linkedToNotes");
            if (v instanceof Boolean) return (Boolean) v;
            if (v instanceof String) return "true".equalsIgnoreCase((String) v);
        } catch (Exception e) {
            // Игнорируем
        }
        return false;
    }
}