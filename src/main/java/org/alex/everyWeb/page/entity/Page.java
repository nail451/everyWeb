package org.alex.everyWeb.page.entity;

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

    // ===== СВЯЗЬ С РАСКЛАДКОЙ =====
    @OneToOne(mappedBy = "page", cascade = CascadeType.ALL, orphanRemoval = true)
    private PageLayout pageLayout;

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

    public PageLayout getPageLayout() { return pageLayout; }
    public void setPageLayout(PageLayout pageLayout) { this.pageLayout = pageLayout; }

    public List<Link> getLinks() { return links; }
    public void setLinks(List<Link> links) { this.links = links; }

    public List<ModuleEntity> getModules() { return modules; }
    public void setModules(List<ModuleEntity> modules) { this.modules = modules; }

    public WallpaperSettings getWallpaperSettings() { return wallpaperSettings; }
    public void setWallpaperSettings(WallpaperSettings wallpaperSettings) { this.wallpaperSettings = wallpaperSettings; }
}