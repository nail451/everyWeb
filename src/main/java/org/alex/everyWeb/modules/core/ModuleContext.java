package org.alex.everyWeb.modules.core;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.alex.everyWeb.modules.api.ModuleConfig;
import org.alex.everyWeb.modules.api.ModuleData;
import org.alex.everyWeb.modules.entity.ModuleEntity;
import org.alex.everyWeb.modules.repository.ModuleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

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

        return module.createData(config);
    }

    public ModuleData updateModuleData(Long moduleId) {
        ModuleEntity moduleEntity = modulesRepository.findById(moduleId)
                .orElseThrow(() -> new RuntimeException("Module not found: " + moduleId));

        Module module = moduleRegistry.getModule(moduleEntity.getType());
        if (module == null) {
            throw new RuntimeException("Module implementation not found: " + moduleEntity.getType());
        }

        ModuleConfig config = getModuleConfig(moduleEntity);

        // Создаем данные и обновляем их
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

        Object result = module.handleAction(action, params, config);

        // Сохраняем обновленный конфиг
        try {
            moduleEntity.setSettings(objectMapper.writeValueAsString(config.getSettings()));
            modulesRepository.save(moduleEntity);
        } catch (Exception e) {
            e.printStackTrace();
        }

        // Если результат - ModuleData, возвращаем его
        if (result instanceof ModuleData) {
            return result;
        }

        // Иначе возвращаем данные модуля
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
}