package org.alex.everyWeb.modules.controller;

import org.alex.everyWeb.modules.api.ModuleData;
import org.alex.everyWeb.modules.api.ModuleInfo;
import org.alex.everyWeb.modules.core.ModuleContext;
import org.alex.everyWeb.modules.core.ModuleManager;
import org.alex.everyWeb.modules.core.ModuleRegistry;
import org.alex.everyWeb.modules.entity.ModuleEntity;
import org.alex.everyWeb.modules.repository.DTO.ModuleDTO;
import org.alex.everyWeb.modules.repository.DTO.ModuleRequestDTO;
import org.alex.everyWeb.modules.repository.DTO.ModuleResponseDTO;
import org.alex.everyWeb.modules.entity.AvailableModule;
import org.alex.everyWeb.modules.service.AvailableModuleService;
import org.alex.everyWeb.modules.service.ModulesService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/modules")
public class ModulesController {

    @Autowired
    private ModulesService modulesService;

    @Autowired
    private AvailableModuleService availableModuleService;

    @Autowired
    private ModuleRegistry moduleRegistry;

    @Autowired
    private ModuleContext moduleContext;

    @Autowired
    private ModuleManager moduleManager;

    // ===== ПОЛУЧЕНИЕ ДОСТУПНЫХ МОДУЛЕЙ =====
    @GetMapping("/available")
    public ResponseEntity<?> getAvailableModules() {
        try {
            List<AvailableModule> modules = availableModuleService.getAvailableModules();
            return ResponseEntity.ok(modules);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }

    // ===== ПОЛУЧЕНИЕ ВСЕХ МОДУЛЕЙ (включая отключенные) =====
    @GetMapping("/available/all")
    public ResponseEntity<?> getAllAvailableModules() {
        try {
            List<AvailableModule> modules = availableModuleService.getAllModules();
            return ResponseEntity.ok(modules);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }

    // ===== ПОЛУЧЕНИЕ МОДУЛЕЙ СТРАНИЦЫ =====
    @GetMapping("/page/{pageId}")
    public ResponseEntity<?> getModules(@PathVariable Long pageId) {
        try {
            List<ModuleDTO> modules = modulesService.getModulesByPageId(pageId);
            return ResponseEntity.ok(modules);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }

    // ===== ДОБАВЛЕНИЕ МОДУЛЯ =====
    @PostMapping
    public ResponseEntity<?> addModule(@RequestBody ModuleRequestDTO request) {
        try {
            if (request.getPageId() == null) {
                return ResponseEntity.badRequest().body("Page ID is required");
            }
            if (request.getType() == null || request.getType().trim().isEmpty()) {
                return ResponseEntity.badRequest().body("Type is required");
            }
            if (request.getTitle() == null || request.getTitle().trim().isEmpty()) {
                return ResponseEntity.badRequest().body("Title is required");
            }

            ModuleResponseDTO module = modulesService.addModule(
                    request.getPageId(),
                    request.getType().trim(),
                    request.getTitle().trim(),
                    request.getSettings(),
                    request.getIsActive()
            );
            return ResponseEntity.ok(module);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }

    // ===== ОБНОВЛЕНИЕ МОДУЛЯ =====
    @PutMapping("/{moduleId}")
    public ResponseEntity<?> updateModule(@PathVariable Long moduleId, @RequestBody ModuleRequestDTO request) {
        try {
            ModuleResponseDTO module = modulesService.updateModule(
                    moduleId,
                    request.getTitle(),
                    request.getSettings(),
                    request.getIsActive()
            );
            return ResponseEntity.ok(module);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }

    // ===== УДАЛЕНИЕ МОДУЛЯ =====
    @DeleteMapping("/{moduleId}")
    public ResponseEntity<?> deleteModule(@PathVariable Long moduleId) {
        try {
            modulesService.deleteModule(moduleId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }

    // ===== ПЕРЕУПОРЯДОЧИВАНИЕ =====
    @PostMapping("/reorder/{pageId}")
    public ResponseEntity<?> reorderModules(@PathVariable Long pageId, @RequestBody List<Long> moduleIds) {
        try {
            modulesService.reorderModules(pageId, moduleIds);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }

    // ===== ПОЛУЧЕНИЕ ДАННЫХ МОДУЛЯ =====
    @GetMapping("/{moduleId}/data")
    public ResponseEntity<?> getModuleData(@PathVariable Long moduleId) {
        try {
            ModuleData data = moduleContext.getModuleData(moduleId);
            return ResponseEntity.ok(data);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }

    // ===== ОБНОВЛЕНИЕ ДАННЫХ МОДУЛЯ =====
    @GetMapping("/{moduleId}/update")
    public ResponseEntity<?> updateModuleData(@PathVariable Long moduleId) {
        try {
            ModuleEntity moduleEntity = modulesService.getModuleById(moduleId);
            if (moduleEntity == null) {
                return ResponseEntity.notFound().build();
            }

            ModuleData data = moduleContext.updateModuleData(moduleId);

            Map<String, Object> response = new HashMap<>();
            response.put("content", data.getContent());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }

    // ===== ВЫПОЛНЕНИЕ ДЕЙСТВИЯ =====
    @PostMapping("/{moduleId}/action")
    public ResponseEntity<?> executeAction(@PathVariable Long moduleId,
                                           @RequestBody Map<String, Object> request) {
        try {
            String action = (String) request.get("action");
            Map<String, Object> params = (Map<String, Object>) request.get("params");

            Object result = moduleContext.executeAction(moduleId, action, params);

            if (result instanceof ModuleData) {
                ModuleData data = (ModuleData) result;
                Map<String, Object> response = new HashMap<>();
                response.put("content", data.getContent());
                return ResponseEntity.ok(response);
            }

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }

    // ===== ПОЛУЧЕНИЕ НАСТРОЕК МОДУЛЯ =====
    @GetMapping("/{moduleId}/settings")
    public ResponseEntity<?> getModuleSettings(@PathVariable Long moduleId) {
        try {
            // Проверяем, существует ли модуль
            ModuleEntity moduleEntity = modulesService.getModuleById(moduleId);
            if (moduleEntity == null) {
                return ResponseEntity.notFound().build();
            }

            ModuleData data = moduleContext.getModuleData(moduleId);
            return ResponseEntity.ok(data);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }
}