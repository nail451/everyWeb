package org.alex.everyWeb.wallpaper.model;

import jakarta.persistence.*;
import org.alex.everyWeb.page.entity.Page;

import java.time.LocalDateTime;

@Entity
@Table(name = "wallpaper_settings")
public class WallpaperSettings {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "page_id", nullable = false, unique = true)
    private Page page;

    @Column(nullable = false)
    private String mode = "STATIC"; // STATIC, RANDOM, SEQUENTIAL

    @Column(name = "current_wallpaper")
    private String currentWallpaper;

    @Column(name = "wallpapers_list", columnDefinition = "TEXT")
    private String wallpapersList = "[]";

    @Column(name = "current_index")
    private Integer currentIndex = 0;

    @Column(name = "auto_change")
    private boolean autoChange = false;

    @Column(name = "change_interval")
    private Integer changeInterval = 30;

    @Column(name = "change_mode")
    private String changeMode = "RANDOM";

    @Column(name = "last_changed_at")
    private LocalDateTime lastChangedAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Геттеры и сеттеры
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Page getPage() { return page; }
    public void setPage(Page page) { this.page = page; }

    public String getMode() { return mode; }
    public void setMode(String mode) { this.mode = mode; }

    public String getCurrentWallpaper() { return currentWallpaper; }
    public void setCurrentWallpaper(String currentWallpaper) { this.currentWallpaper = currentWallpaper; }

    public String getWallpapersList() { return wallpapersList; }
    public void setWallpapersList(String wallpapersList) { this.wallpapersList = wallpapersList; }

    public Integer getCurrentIndex() { return currentIndex; }
    public void setCurrentIndex(Integer currentIndex) { this.currentIndex = currentIndex; }

    public boolean isAutoChange() { return autoChange; }
    public void setAutoChange(boolean autoChange) { this.autoChange = autoChange; }

    public Integer getChangeInterval() { return changeInterval; }
    public void setChangeInterval(Integer changeInterval) { this.changeInterval = changeInterval; }

    public String getChangeMode() { return changeMode; }
    public void setChangeMode(String changeMode) { this.changeMode = changeMode; }

    public LocalDateTime getLastChangedAt() { return lastChangedAt; }
    public void setLastChangedAt(LocalDateTime lastChangedAt) { this.lastChangedAt = lastChangedAt; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
