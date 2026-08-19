package org.alex.everyWeb.link.repository.DTO;

public class LinkRequestDTO {
    private Long pageId;
    private String title;
    private String url;
    private String icon;
    private String iconType = "emoji"; // emoji, favicon, custom
    private String customImage; // base64 или путь к загруженному изображению

    // Геттеры и сеттеры
    public Long getPageId() { return pageId; }
    public void setPageId(Long pageId) { this.pageId = pageId; }

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
}