package org.alex.everyWeb.modules.impl;

import org.alex.everyWeb.modules.api.ModuleConfig;
import org.alex.everyWeb.modules.api.ModuleData;
import org.alex.everyWeb.modules.api.ModuleInfo;
import org.alex.everyWeb.modules.core.Module;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Component
public class NotesModule extends Module {

    @Override
    public ModuleInfo getInfo() {
        ModuleInfo info = new ModuleInfo();
        info.setType("NOTES");
        info.setName("Заметки");
        info.setDescription("Быстрые заметки");
        info.setIcon("📝");
        info.setVersion("1.0.0");
        info.setAuthor("System");
        info.setEnabled(true);
        info.setConfigurable(false);
        info.setCssClass("notes-module");
        return info;
    }

    @Override
    public ModuleData createData(ModuleConfig config) {
        ModuleData data = new ModuleData("NOTES", "Заметки");

        Map<String, Object> content = new HashMap<>();
        content.put("text", "");
        content.put("placeholder", "Введите заметку...");

        data.setContent(content);
        data.setConfig(config);
        return data;
    }
}