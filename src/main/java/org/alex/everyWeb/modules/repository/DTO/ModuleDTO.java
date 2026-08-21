package org.alex.everyWeb.modules.repository.DTO;

public class ModuleDTO {
    private Long id;
    private String type;
    private String title;
    private String settings;
    private Integer position;
    private Boolean isActive;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getSettings() { return settings; }
    public void setSettings(String settings) { this.settings = settings; }

    public Integer getPosition() { return position; }
    public void setPosition(Integer position) { this.position = position; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }
}