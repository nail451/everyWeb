package org.alex.everyWeb.settings.repository.DTO;

public class LinkDTO {
    private Long id;
    private String title;
    private String url;
    private String icon;
    private Integer position;

    public LinkDTO() {
    }

    public LinkDTO(Long id, String title, String url, String icon, Integer position) {
        this.id = id;
        this.title = title;
        this.url = url;
        this.icon = icon;
        this.position = position;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public String getIcon() {
        return icon;
    }

    public void setIcon(String icon) {
        this.icon = icon;
    }

    public Integer getPosition() {
        return position;
    }

    public void setPosition(Integer position) {
        this.position = position;
    }
}
