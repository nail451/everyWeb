package org.alex.everyWeb.modules.core;

import org.alex.everyWeb.modules.api.ModuleConfig;
import org.alex.everyWeb.modules.api.ModuleData;
import org.alex.everyWeb.modules.api.ModuleInfo;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public abstract class Module {

    public abstract ModuleInfo getInfo();

    public abstract ModuleData createData(ModuleConfig config);

    public ModuleData updateData(ModuleData data, ModuleConfig config) {
        return data;
    }

    public Object handleAction(String action, Map<String, Object> params, ModuleConfig config) {
        return null;
    }

    public boolean validateConfig(ModuleConfig config) {
        return true;
    }

    public String render(ModuleData data) {
        return null;
    }
}