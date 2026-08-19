package org.alex.everyWeb.link.model;

import jakarta.persistence.*;
import org.alex.everyWeb.page.model.Page;

@Entity
@Table(name = "links")
public class Link {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String url;

    private String icon;

    @Column(name = "icon_type")
    private String iconType = "emoji"; // emoji, favicon, custom

    @Column(name = "custom_image", columnDefinition = "TEXT")
    private String customImage; // base64 или путь к изображению

    @Column(name = "position")
    private Integer position = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "page_id", nullable = false)
    private Page page;

    // Геттеры и сеттеры
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }

    public String getIcon() { return icon; }
    public void setIcon(String icon) { this.icon = icon; }

    public String getIconType() { return iconType; }
    public void setIconType(String iconType) { this.iconType = iconType; }

    public String getCustomImage() { return customImage; }
    public void setCustomImage(String customImage) { this.customImage = customImage; }

    public Integer getPosition() { return position; }
    public void setPosition(Integer position) { this.position = position; }

    public Page getPage() { return page; }
    public void setPage(Page page) { this.page = page; }
}