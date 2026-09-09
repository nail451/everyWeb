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
        Map<String, Object> content = (Map<String, Object>) data.getContent();
        if (content == null) {
            content = new HashMap<>();
            data.setContent(content);
        }

        // Получаем общие настройки
        Map<String, Object> widgetSettings = getWidgetSettingsMap(moduleEntity);
        if (widgetSettings != null && !widgetSettings.isEmpty()) {
            content.put("settings", widgetSettings);
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

        // ===== 1. ПОЛУЧАЕМ ТЕКУЩИЕ НАСТРОЙКИ =====
        Map<String, Object> allSettings = getSettingsMap(moduleEntity);
        System.out.println("🔵 Current allSettings: " + allSettings);

        // ===== 2. ОБРАБАТЫВАЕМ ОБЩИЕ НАСТРОЙКИ =====
        if (params.containsKey("hideBackground")) {
            Object value = params.get("hideBackground");
            if (value instanceof Boolean) {
                allSettings.put("hideBackground", (Boolean) value);
                System.out.println("✅ Saved hideBackground: " + value);
            }
        }

        if (params.containsKey("alignment")) {
            Object value = params.get("alignment");
            if (value instanceof String) {
                allSettings.put("alignment", (String) value);
                System.out.println("✅ Saved alignment: " + value);
            }
        }

        // ===== 3. СОХРАНЯЕМ ОБЩИЕ НАСТРОЙКИ В БД =====
        try {
            String updatedSettings = objectMapper.writeValueAsString(allSettings);
            moduleEntity.setSettings(updatedSettings);
            modulesRepository.save(moduleEntity);
            System.out.println("✅ Settings saved to DB: " + updatedSettings);
        } catch (Exception e) {
            System.err.println("❌ Error saving settings: " + e.getMessage());
            e.printStackTrace();
        }

        // ===== 4. ПЕРЕДАЁМ УПРАВЛЕНИЕ МОДУЛЮ =====
        Map<String, Object> moduleParams = new HashMap<>(params);
        moduleParams.remove("hideBackground");
        moduleParams.remove("alignment");

        // Обновляем config для модуля
        for (Map.Entry<String, Object> entry : allSettings.entrySet()) {
            config.put(entry.getKey(), entry.getValue());
        }

        Object result = module.handleAction(action, moduleParams, config);

        // ===== 5. СОХРАНЯЕМ НАСТРОЙКИ ПОСЛЕ ДЕЙСТВИЯ =====
        // Получаем все настройки из config
        Map<String, Object> finalSettings = new HashMap<>(allSettings);

        // Добавляем настройки из config (которые могли быть изменены модулем)
        for (Map.Entry<String, Object> entry : config.getSettings().entrySet()) {
            String key = entry.getKey();
            // Не перезаписываем общие настройки
            if (!"hideBackground".equals(key) && !"alignment".equals(key)) {
                finalSettings.put(key, entry.getValue());
            }
        }

        try {
            String finalSettingsJson = objectMapper.writeValueAsString(finalSettings);
            moduleEntity.setSettings(finalSettingsJson);
            modulesRepository.save(moduleEntity);
            System.out.println("✅ Final settings saved to DB: " + finalSettingsJson);
        } catch (Exception e) {
            System.err.println("❌ Error saving final settings: " + e.getMessage());
            e.printStackTrace();
        }

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