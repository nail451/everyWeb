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
        info.setConfigurable(true);   // ← было false, теперь true
        info.setCssClass("notes-module");
        return info;
    }

    @Override
    public ModuleData createData(ModuleConfig config) {
        ModuleData data = new ModuleData("NOTES", "Заметки");

        Map<String, Object> content = new HashMap<>();
        content.put("noteData", buildNoteData(config));

        data.setContent(content);
        data.setConfig(config);
        return data;
    }

    @Override
    public Object handleAction(String action, Map<String, Object> params, ModuleConfig config) {
        if ("updateSettings".equals(action)) {
            return handleUpdateSettings(params, config);
        }
        return null;
    }

    private Object handleUpdateSettings(Map<String, Object> params, ModuleConfig config) {
        if (params.containsKey("linkedToCalendar")) {
            Object v = params.get("linkedToCalendar");
            if (v instanceof Boolean) {
                config.put("linkedToCalendar", v);
            }
        }
        if (params.containsKey("calendarModuleId")) {
            Object v = params.get("calendarModuleId");
            if (v != null) {
                config.put("calendarModuleId", v.toString());
            } else {
                config.put("calendarModuleId", null);
            }
        }
        return buildModuleData(config);
    }

    private ModuleData buildModuleData(ModuleConfig config) {
        ModuleData data = new ModuleData("NOTES", "Заметки");
        Map<String, Object> content = new HashMap<>();
        content.put("noteData", buildNoteData(config));
        data.setContent(content);
        data.setConfig(config);
        return data;
    }

    private Map<String, Object> buildNoteData(ModuleConfig config) {
        Map<String, Object> noteData = new HashMap<>();

        boolean linkedToCalendar = false;
        Object linked = config.get("linkedToCalendar");
        if (linked instanceof Boolean) {
            linkedToCalendar = (Boolean) linked;
        } else if (linked instanceof String) {
            linkedToCalendar = "true".equalsIgnoreCase((String) linked);
        }
        noteData.put("linkedToCalendar", linkedToCalendar);

        Object calId = config.get("calendarModuleId");
        noteData.put("calendarModuleId", calId != null ? calId.toString() : null);

        return noteData;
    }
}