package org.alex.everyWeb.modules.impl;

import org.alex.everyWeb.modules.api.ModuleConfig;
import org.alex.everyWeb.modules.api.ModuleData;
import org.alex.everyWeb.modules.api.ModuleInfo;
import org.alex.everyWeb.modules.core.Module;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class TodoModule extends Module {

    @Override
    public ModuleInfo getInfo() {
        ModuleInfo info = new ModuleInfo();
        info.setType("TODO");
        info.setName("Список дел");
        info.setDescription("To-Do список");
        info.setIcon("✅");
        info.setVersion("1.0.0");
        info.setAuthor("System");
        info.setEnabled(true);
        info.setConfigurable(false);
        info.setCssClass("todo-module");
        return info;
    }

    @Override
    public ModuleData createData(ModuleConfig config) {
        ModuleData data = new ModuleData("TODO", "Список дел");

        List<Map<String, Object>> todos = new ArrayList<>();

        Map<String, Object> content = new HashMap<>();
        content.put("todos", todos);
        content.put("placeholder", "Добавить задачу...");

        data.setContent(content);
        data.setConfig(config);
        return data;
    }

    @Override
    public Object handleAction(String action, Map<String, Object> params, ModuleConfig config) {
        if ("add".equals(action)) {
            String text = (String) params.get("text");
            if (text != null && !text.trim().isEmpty()) {
                Map<String, Object> todo = new HashMap<>();
                todo.put("id", UUID.randomUUID().toString());
                todo.put("text", text.trim());
                todo.put("done", false);
                return todo;
            }
        }
        if ("toggle".equals(action)) {
            String id = (String) params.get("id");
            // Обработка переключения статуса
            return true;
        }
        if ("delete".equals(action)) {
            String id = (String) params.get("id");
            // Обработка удаления
            return true;
        }
        return null;
    }
}