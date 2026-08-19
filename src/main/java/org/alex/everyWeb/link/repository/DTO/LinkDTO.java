package org.alex.everyWeb.link.repository.DTO;

public class LinkDTO {
    private Long id;
    private String title;
    private String url;
    private String icon;
    private String iconType;      // ← ДОБАВИТЬ
    private String customImage;   // ← ДОБАВИТЬ
    private Integer position;

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
}