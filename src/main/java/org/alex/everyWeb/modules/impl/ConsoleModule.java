package org.alex.everyWeb.modules.impl;

import org.alex.everyWeb.modules.api.ModuleConfig;
import org.alex.everyWeb.modules.api.ModuleData;
import org.alex.everyWeb.modules.api.ModuleInfo;
import org.alex.everyWeb.modules.core.Module;
import org.springframework.stereotype.Component;

import java.util.HashMap;

@Component
public class ConsoleModule extends Module {

    @Override
    public ModuleInfo getInfo() {
        ModuleInfo info = new ModuleInfo();
        info.setType("CONSOLE");
        info.setName("Консоль");
        info.setDescription("Интерактивная bash-консоль");
        info.setIcon("⌨️");
        info.setVersion("1.0.0");
        info.setAuthor("System");
        info.setEnabled(false); // включаем вручную
        info.setConfigurable(false);
        info.setCssClass("console-module");
        return info;
    }

    @Override
    public ModuleData createData(ModuleConfig config) {
        ModuleData data = new ModuleData("CONSOLE", "Консоль");
        data.setContent(new HashMap<String, Object>());
        data.setConfig(config);
        return data;
    }

    @Override
    public ModuleData updateData(ModuleData data, ModuleConfig config) {
        data.setConfig(config);
        return data;
    }
}