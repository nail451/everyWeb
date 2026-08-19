package org.alex.everyWeb.settings.repository.DTO;

public class ModuleType {
    private String type;
    private String name;
    private String description;
    private String icon;
    private boolean isEnabled;

    public ModuleType() {
    }

    public ModuleType(String type, String name, String description, String icon, boolean isEnabled) {
        this.type = type;
        this.name = name;
        this.description = description;
        this.icon = icon;
        this.isEnabled = isEnabled;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getIcon() {
        return icon;
    }

    public void setIcon(String icon) {
        this.icon = icon;
    }

    public boolean isEnabled() {
        return isEnabled;
    }

    public void setEnabled(boolean enabled) {
        isEnabled = enabled;
    }
}
