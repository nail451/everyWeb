package org.alex.everyWeb.modules.api;

public class ModuleData {
    private String id;
    private String type;
    private String title;
    private Object content;
    private ModuleConfig config;
    private boolean active;

    public ModuleData() {}

    public ModuleData(String type, String title) {
        this.type = type;
        this.title = title;
        this.active = true;
        this.config = new ModuleConfig();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public Object getContent() { return content; }
    public void setContent(Object content) { this.content = content; }

    public ModuleConfig getConfig() { return config; }
    public void setConfig(ModuleConfig config) { this.config = config; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}