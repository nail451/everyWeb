package org.alex.everyWeb.modules.impl;

import org.alex.everyWeb.modules.api.ModuleConfig;
import org.alex.everyWeb.modules.api.ModuleData;
import org.alex.everyWeb.modules.api.ModuleInfo;
import org.alex.everyWeb.modules.core.Module;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Component
public class FileManagerModule extends Module {

    @Override
    public ModuleInfo getInfo() {
        ModuleInfo info = new ModuleInfo();
        info.setType("FILES");
        info.setName("Файлы");
        info.setDescription("Файловый менеджер");
        info.setIcon("📁");
        info.setVersion("1.0.0");
        info.setAuthor("System");
        info.setEnabled(true);
        info.setConfigurable(false);
        info.setCssClass("file-manager-module");
        return info;
    }

    @Override
    public ModuleData createData(ModuleConfig config) {
        ModuleData data = new ModuleData("FILES", "Файлы");
        Map<String, Object> content = new HashMap<>();
        String lastPath = config.getString("lastPath");
        content.put("lastPath", lastPath != null ? lastPath : "/home/alsa");
        data.setContent(content);
        data.setConfig(config);
        return data;
    }

    @Override
    public ModuleData updateData(ModuleData data, ModuleConfig config) {
        data.setConfig(config);
        return data;
    }

    @Override
    public Object handleAction(String action, Map<String, Object> params, ModuleConfig config) {
        if ("updateSettings".equals(action) && params.containsKey("lastPath")) {
            config.put("lastPath", params.get("lastPath"));
        }
        return null;
    }
}