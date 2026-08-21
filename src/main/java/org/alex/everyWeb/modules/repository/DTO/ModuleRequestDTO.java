package org.alex.everyWeb.modules.repository.DTO;

public class ModuleRequestDTO {
    private Long pageId;
    private String type;
    private String title;
    private String settings;
    private Boolean isActive;

    public Long getPageId() { return pageId; }
    public void setPageId(Long pageId) { this.pageId = pageId; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getSettings() { return settings; }
    public void setSettings(String settings) { this.settings = settings; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }
}