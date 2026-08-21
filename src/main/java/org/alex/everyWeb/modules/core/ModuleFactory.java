package org.alex.everyWeb.modules.core;

import org.alex.everyWeb.modules.api.ModuleConfig;
import org.alex.everyWeb.modules.api.ModuleData;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class ModuleFactory {

    @Autowired
    private ModuleRegistry moduleRegistry;

    public ModuleData createModuleData(String type, String title, ModuleConfig config) {
        Module module = moduleRegistry.getModule(type);
        if (module == null) {
            throw new RuntimeException("Module not found: " + type);
        }

        ModuleData data = module.createData(config);
        if (title != null && !title.trim().isEmpty()) {
            data.setTitle(title);
        }
        return data;
    }

    public Module getModule(String type) {
        return moduleRegistry.getModule(type);
    }
}