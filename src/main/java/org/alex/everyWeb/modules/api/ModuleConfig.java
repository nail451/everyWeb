package org.alex.everyWeb.modules.api;

import java.util.HashMap;
import java.util.Map;

public class ModuleConfig {
    private Map<String, Object> settings = new HashMap<>();

    public ModuleConfig() {}

    public ModuleConfig(Map<String, Object> settings) {
        this.settings = settings;
    }

    public Map<String, Object> getSettings() { return settings; }
    public void setSettings(Map<String, Object> settings) { this.settings = settings; }

    public void put(String key, Object value) {
        settings.put(key, value);
    }

    public Object get(String key) {
        return settings.get(key);
    }

    public String getString(String key) {
        Object value = settings.get(key);
        return value != null ? value.toString() : null;
    }

    public Integer getInt(String key) {
        Object value = settings.get(key);
        if (value instanceof Number) {
            return ((Number) value).intValue();
        }
        return null;
    }

    public Boolean getBoolean(String key) {
        Object value = settings.get(key);
        if (value instanceof Boolean) {
            return (Boolean) value;
        }
        return null;
    }
}