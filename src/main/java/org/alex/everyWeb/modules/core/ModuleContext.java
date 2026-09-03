package org.alex.everyWeb.modules.core;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.alex.everyWeb.modules.api.ModuleConfig;
import org.alex.everyWeb.modules.api.ModuleData;
import org.alex.everyWeb.modules.entity.ModuleEntity;
import org.alex.everyWeb.modules.repository.ModuleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Component
public class ModuleContext {

    @Autowired
    private ModuleRegistry moduleRegistry;

    @Autowired
    private ModuleRepository modulesRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public ModuleData getModuleData(Long moduleId) {
        ModuleEntity moduleEntity = modulesRepository.findById(moduleId)
                .orElseThrow(() -> new RuntimeException("Module not found: " + moduleId));

        Module module = moduleRegistry.getModule(moduleEntity.getType());
        if (module == null) {
            throw new RuntimeException("Module implementation not found: " + moduleEntity.getType());
        }

        ModuleConfig config = getModuleConfig(moduleEntity);

        // Получаем данные модуля
        ModuleData data = module.createData(config);

        // ===== ДОБАВЛЯЕМ ОБЩИЕ НАСТРОЙКИ В CONTENT =====
        // Читаем общие настройки из корня settings
        Map<String, Object> content = (Map<String, Object>) data.getContent();
        if (content == null) {
            content = new HashMap<>();
            data.setContent(content);
        }

        // Получаем общие настройки
        Map<String, Object> widgetSettings = getWidgetSettingsMap(moduleEntity);
        if (widgetSettings != null && !widgetSettings.isEmpty()) {
            // Добавляем общие настройки в content как отдельный объект
            content.put("settings", widgetSettings);
            System.out.println("✅ Added widget settings to content: " + widgetSettings);
        }

        // Добавляем также в config для обратной совместимости
        for (Map.Entry<String, Object> entry : widgetSettings.entrySet()) {
            config.put(entry.getKey(), entry.getValue());
        }

        return data;
    }

    private Map<String, Object> getWidgetSettingsMap(ModuleEntity moduleEntity) {
        try {
            if (moduleEntity.getSettings() != null && !moduleEntity.getSettings().isEmpty()) {
                Map<String, Object> allSettings = objectMapper.readValue(
                        moduleEntity.getSettings(),
                        new TypeReference<Map<String, Object>>() {}
                );
                Map<String, Object> widgetSettings = new HashMap<>();
                if (allSettings.containsKey("hideBackground")) {
                    widgetSettings.put("hideBackground", allSettings.get("hideBackground"));
                }
                if (allSettings.containsKey("alignment")) {
                    widgetSettings.put("alignment", allSettings.get("alignment"));
                }
                return widgetSettings;
            }
        } catch (Exception e) {
            System.err.println("Error reading widget settings: " + e.getMessage());
        }
        return new HashMap<>();
    }

    public ModuleData updateModuleData(Long moduleId) {
        ModuleEntity moduleEntity = modulesRepository.findById(moduleId)
                .orElseThrow(() -> new RuntimeException("Module not found: " + moduleId));

        Module module = moduleRegistry.getModule(moduleEntity.getType());
        if (module == null) {
            throw new RuntimeException("Module implementation not found: " + moduleEntity.getType());
        }

        ModuleConfig config = getModuleConfig(moduleEntity);

        ModuleData data = module.createData(config);
        return module.updateData(data, config);
    }

    public Object executeAction(Long moduleId, String action, Map<String, Object> params) {
        ModuleEntity moduleEntity = modulesRepository.findById(moduleId)
                .orElseThrow(() -> new RuntimeException("Module not found: " + moduleId));

        Module module = moduleRegistry.getModule(moduleEntity.getType());
        if (module == null) {
            throw new RuntimeException("Module implementation not found: " + moduleEntity.getType());
        }

        ModuleConfig config = getModuleConfig(moduleEntity);

        // ===== ОБРАБАТЫВАЕМ ОБЩИЕ НАСТРОЙКИ =====
        boolean widgetSettingsChanged = false;
        Map<String, Object> allSettings = getSettingsMap(moduleEntity);

        if (params.containsKey("hideBackground")) {
            Object value = params.get("hideBackground");
            if (value instanceof Boolean) {
                allSettings.put("hideBackground", (Boolean) value);
                widgetSettingsChanged = true;
                System.out.println("✅ Saved hideBackground: " + value);
            }
        }

        if (params.containsKey("alignment")) {
            Object value = params.get("alignment");
            if (value instanceof String) {
                allSettings.put("alignment", (String) value);
                widgetSettingsChanged = true;
                System.out.println("✅ Saved alignment: " + value);
            }
        }

        // Если общие настройки изменились — сохраняем их в корень settings
        if (widgetSettingsChanged) {
            try {
                // Сохраняем linkData если он есть
                if (allSettings.containsKey("linkData")) {
                    // linkData уже есть в allSettings
                }
                String updatedSettings = objectMapper.writeValueAsString(allSettings);
                moduleEntity.setSettings(updatedSettings);
                modulesRepository.save(moduleEntity);
                System.out.println("✅ Widget settings saved: " + updatedSettings);
            } catch (Exception e) {
                System.err.println("❌ Error saving widget settings: " + e.getMessage());
                e.printStackTrace();
            }
        }

        // Передаём управление модулю (без общих настроек)
        Map<String, Object> moduleParams = new HashMap<>(params);
        moduleParams.remove("hideBackground");
        moduleParams.remove("alignment");

        Object result = module.handleAction(action, moduleParams, config);

        if (result instanceof ModuleData) {
            return result;
        }

        ModuleData data = module.createData(config);
        return module.updateData(data, config);
    }

    private ModuleConfig getModuleConfig(ModuleEntity moduleEntity) {
        ModuleConfig config = new ModuleConfig();
        try {
            if (moduleEntity.getSettings() != null && !moduleEntity.getSettings().isEmpty()) {
                Map<String, Object> settings = objectMapper.readValue(
                        moduleEntity.getSettings(),
                        new TypeReference<Map<String, Object>>() {}
                );
                config.setSettings(settings);
            }
        } catch (Exception e) {
            // Используем пустой конфиг
        }
        return config;
    }

    private Map<String, Object> getSettingsMap(ModuleEntity moduleEntity) {
        try {
            if (moduleEntity.getSettings() != null && !moduleEntity.getSettings().isEmpty()) {
                return objectMapper.readValue(
                        moduleEntity.getSettings(),
                        new TypeReference<Map<String, Object>>() {}
                );
            }
        } catch (Exception e) {
            // Игнорируем
        }
        return new HashMap<>();
    }
}