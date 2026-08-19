package org.alex.everyWeb.wallpaper.repository.DTO;

import java.time.LocalDateTime;
import java.util.List;

public class WallpaperInfoDTO {
    private String currentWallpaper;
    private List<String> wallpapers;
    private int count;
    private String mode;
    private boolean autoChange;
    private int changeInterval;
    private String changeMode;
    private int currentIndex;
    private LocalDateTime lastChangedAt;
    private LocalDateTime nextChangeAt;

    // Геттеры и сеттеры
    public String getCurrentWallpaper() { return currentWallpaper; }
    public void setCurrentWallpaper(String currentWallpaper) { this.currentWallpaper = currentWallpaper; }

    public List<String> getWallpapers() { return wallpapers; }
    public void setWallpapers(List<String> wallpapers) { this.wallpapers = wallpapers; }

    public int getCount() { return count; }
    public void setCount(int count) { this.count = count; }

    public String getMode() { return mode; }
    public void setMode(String mode) { this.mode = mode; }

    public boolean isAutoChange() { return autoChange; }
    public void setAutoChange(boolean autoChange) { this.autoChange = autoChange; }

    public int getChangeInterval() { return changeInterval; }
    public void setChangeInterval(int changeInterval) { this.changeInterval = changeInterval; }

    public String getChangeMode() { return changeMode; }
    public void setChangeMode(String changeMode) { this.changeMode = changeMode; }

    public int getCurrentIndex() { return currentIndex; }
    public void setCurrentIndex(int currentIndex) { this.currentIndex = currentIndex; }

    public LocalDateTime getLastChangedAt() { return lastChangedAt; }
    public void setLastChangedAt(LocalDateTime lastChangedAt) { this.lastChangedAt = lastChangedAt; }

    public LocalDateTime getNextChangeAt() { return nextChangeAt; }
    public void setNextChangeAt(LocalDateTime nextChangeAt) { this.nextChangeAt = nextChangeAt; }
}