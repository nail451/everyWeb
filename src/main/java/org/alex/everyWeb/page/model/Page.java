package org.alex.everyWeb.page.model;

import jakarta.persistence.*;
import org.alex.everyWeb.link.model.Link;
import org.alex.everyWeb.modules.entity.ModuleEntity;
import org.alex.everyWeb.wallpaper.model.WallpaperSettings;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "pages")
public class Page {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String name;

    // ===== НАСТРОЙКИ ССЫЛОК =====
    @Column(name = "link_icon_size")
    private Integer linkIconSize = 28;

    @Column(name = "link_font_size")
    private Integer linkFontSize = 12;

    @Column(name = "link_bg_opacity")
    private Integer linkBgOpacity = 15;

    @Column(name = "link_bg_darkness")
    private Integer linkBgDarkness = 0;

    @Column(name = "show_add_link_button")
    private Boolean showAddLinkButton = true;  // ← НОВОЕ ПОЛЕ

    @OneToMany(mappedBy = "page", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position ASC")
    private List<Link> links = new ArrayList<>();

    @OneToMany(mappedBy = "page", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position ASC")
    private List<ModuleEntity> modules = new ArrayList<>();

    @OneToOne(mappedBy = "page", cascade = CascadeType.ALL, orphanRemoval = true)
    private WallpaperSettings wallpaperSettings;

    // Геттеры и сеттеры
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Integer getLinkIconSize() { return linkIconSize; }
    public void setLinkIconSize(Integer linkIconSize) { this.linkIconSize = linkIconSize; }

    public Integer getLinkFontSize() { return linkFontSize; }
    public void setLinkFontSize(Integer linkFontSize) { this.linkFontSize = linkFontSize; }

    public Integer getLinkBgOpacity() { return linkBgOpacity; }
    public void setLinkBgOpacity(Integer linkBgOpacity) { this.linkBgOpacity = linkBgOpacity; }

    public Integer getLinkBgDarkness() { return linkBgDarkness; }
    public void setLinkBgDarkness(Integer linkBgDarkness) { this.linkBgDarkness = linkBgDarkness; }

    public Boolean getShowAddLinkButton() { return showAddLinkButton; }
    public void setShowAddLinkButton(Boolean showAddLinkButton) { this.showAddLinkButton = showAddLinkButton; }

    public List<Link> getLinks() { return links; }
    public void setLinks(List<Link> links) { this.links = links; }

    public List<ModuleEntity> getModules() { return modules; }
    public void setModules(List<ModuleEntity> modules) { this.modules = modules; }

    public WallpaperSettings getWallpaperSettings() { return wallpaperSettings; }
    public void setWallpaperSettings(WallpaperSettings wallpaperSettings) { this.wallpaperSettings = wallpaperSettings; }
}