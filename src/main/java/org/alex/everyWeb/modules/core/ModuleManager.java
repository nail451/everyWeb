package org.alex.everyWeb.modules.core;

import org.alex.everyWeb.modules.api.ModuleConfig;
import org.alex.everyWeb.modules.api.ModuleData;
import org.alex.everyWeb.modules.api.ModuleInfo;
import org.alex.everyWeb.modules.entity.AvailableModule;
import org.alex.everyWeb.modules.entity.ModuleEntity;
import org.alex.everyWeb.modules.repository.AvailableModuleRepository;
import org.alex.everyWeb.modules.repository.ModuleRepository;
import org.alex.everyWeb.modules.service.ModulesService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class ModuleManager {

    @Autowired
    private ModuleRegistry moduleRegistry;

    @Autowired
    private ModuleRepository modulesRepository;

    @Autowired
    private AvailableModuleRepository availableModuleRepository;

    @Autowired
    private ModulesService modulesService;

    public List<ModuleInfo> getAvailableModules() {
        List<ModuleInfo> available = new ArrayList<>();

        List<AvailableModule> dbModules = availableModuleRepository.findByIsEnabledTrueOrderByDisplayOrderAsc();
        for (AvailableModule dbModule : dbModules) {
            Module module = moduleRegistry.getModule(dbModule.getType());
            if (module != null) {
                available.add(module.getInfo());
            }
        }

        return available;
    }

    public ModuleData createModuleData(Long moduleId) {
        ModuleEntity moduleEntity = modulesRepository.findById(moduleId)
                .orElseThrow(() -> new RuntimeException("Module not found: " + moduleId));

        Module module = moduleRegistry.getModule(moduleEntity.getType());
        if (module == null) {
            throw new RuntimeException("Module implementation not found: " + moduleEntity.getType());
        }

        ModuleConfig config = new ModuleConfig();
        try {
            if (moduleEntity.getSettings() != null && !moduleEntity.getSettings().isEmpty()) {
                config.put("rawSettings", moduleEntity.getSettings());
            }
        } catch (Exception e) {
            // Используем пустой конфиг
        }

        return module.createData(config);
    }

    public ModuleData updateModuleData(Long moduleId) {
        ModuleEntity moduleEntity = modulesRepository.findById(moduleId)
                .orElseThrow(() -> new RuntimeException("Module not found: " + moduleId));

        Module module = moduleRegistry.getModule(moduleEntity.getType());
        if (module == null) {
            throw new RuntimeException("Module implementation not found: " + moduleEntity.getType());
        }

        ModuleConfig config = new ModuleConfig();
        try {
            if (moduleEntity.getSettings() != null && !moduleEntity.getSettings().isEmpty()) {
                config.put("rawSettings", moduleEntity.getSettings());
            }
        } catch (Exception e) {
            // Используем пустой конфиг
        }

        ModuleData data = module.createData(config);
        return module.updateData(data, config);
    }

    public Object executeAction(Long moduleId, String action, java.util.Map<String, Object> params) {
        ModuleEntity moduleEntity = modulesRepository.findById(moduleId)
                .orElseThrow(() -> new RuntimeException("Module not found: " + moduleId));

        Module module = moduleRegistry.getModule(moduleEntity.getType());
        if (module == null) {
            throw new RuntimeException("Module implementation not found: " + moduleEntity.getType());
        }

        ModuleConfig config = new ModuleConfig();
        try {
            if (moduleEntity.getSettings() != null && !moduleEntity.getSettings().isEmpty()) {
                config.put("rawSettings", moduleEntity.getSettings());
            }
        } catch (Exception e) {
            // Используем пустой конфиг
        }

        Object result = module.handleAction(action, params, config);

        // Сохраняем обновленный конфиг
        if (config.getSettings().containsKey("rawSettings")) {
            moduleEntity.setSettings((String) config.get("rawSettings"));
        }
        modulesRepository.save(moduleEntity);

        return result;
    }
}