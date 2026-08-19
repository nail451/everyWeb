package org.alex.everyWeb.wallpaper.repository.DTO;

public class WallpaperSettingsDTO {
    private String mode;
    private Boolean autoChange;
    private Integer changeInterval;
    private String changeMode;

    // Геттеры и сеттеры
    public String getMode() { return mode; }
    public void setMode(String mode) { this.mode = mode; }

    public Boolean getAutoChange() { return autoChange; }
    public void setAutoChange(Boolean autoChange) { this.autoChange = autoChange; }

    public Integer getChangeInterval() { return changeInterval; }
    public void setChangeInterval(Integer changeInterval) { this.changeInterval = changeInterval; }

    public String getChangeMode() { return changeMode; }
    public void setChangeMode(String changeMode) { this.changeMode = changeMode; }
}
