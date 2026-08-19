package org.alex.everyWeb.settings.repository.DTO;

import java.util.List;

public class SettingsDTO {
    private List<ModuleType> availableModules;
    private List<LinkDTO> links;
    private List<ModuleDTO> modules;
    private String currentWallpaper;
    private List<String> availableWallpapers;

    public SettingsDTO() {
    }

    public SettingsDTO(List<ModuleType> availableModules, List<LinkDTO> links, List<ModuleDTO> modules, String currentWallpaper, List<String> availableWallpapers) {
        this.availableModules = availableModules;
        this.links = links;
        this.modules = modules;
        this.currentWallpaper = currentWallpaper;
        this.availableWallpapers = availableWallpapers;
    }

    public List<ModuleType> getAvailableModules() {
        return availableModules;
    }

    public void setAvailableModules(List<ModuleType> availableModules) {
        this.availableModules = availableModules;
    }

    public List<LinkDTO> getLinks() {
        return links;
    }

    public void setLinks(List<LinkDTO> links) {
        this.links = links;
    }

    public List<ModuleDTO> getModules() {
        return modules;
    }

    public void setModules(List<ModuleDTO> modules) {
        this.modules = modules;
    }

    public String getCurrentWallpaper() {
        return currentWallpaper;
    }

    public void setCurrentWallpaper(String currentWallpaper) {
        this.currentWallpaper = currentWallpaper;
    }

    public List<String> getAvailableWallpapers() {
        return availableWallpapers;
    }

    public void setAvailableWallpapers(List<String> availableWallpapers) {
        this.availableWallpapers = availableWallpapers;
    }
}
