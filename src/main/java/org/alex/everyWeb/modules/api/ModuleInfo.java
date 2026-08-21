package org.alex.everyWeb.modules.api;

public class ModuleInfo {
    private String type;
    private String name;
    private String description;
    private String icon;
    private String version;
    private String author;
    private boolean enabled;
    private boolean configurable;
    private String cssClass;

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getIcon() { return icon; }
    public void setIcon(String icon) { this.icon = icon; }

    public String getVersion() { return version; }
    public void setVersion(String version) { this.version = version; }

    public String getAuthor() { return author; }
    public void setAuthor(String author) { this.author = author; }

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    public boolean isConfigurable() { return configurable; }
    public void setConfigurable(boolean configurable) { this.configurable = configurable; }

    public String getCssClass() { return cssClass; }
    public void setCssClass(String cssClass) { this.cssClass = cssClass; }
}