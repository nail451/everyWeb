package org.alex.everyWeb.module.model;

import jakarta.persistence.*;
import org.alex.everyWeb.page.model.Page;

@Entity
@Table(name = "modules")
public class Module {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String type;

    private String title;

    @Column(columnDefinition = "TEXT")
    private String settings;

    private Integer position;

    @ManyToOne
    @JoinColumn(name = "page_id", nullable = false)
    private Page page;

    public Module() {
    }

    public Module(String type, String title, String settings, Integer position, Page page) {
        this.type = type;
        this.title = title;
        this.settings = settings;
        this.position = position;
        this.page = page;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getSettings() {
        return settings;
    }

    public void setSettings(String settings) {
        this.settings = settings;
    }

    public Integer getPosition() {
        return position;
    }

    public void setPosition(Integer position) {
        this.position = position;
    }

    public Page getPage() {
        return page;
    }

    public void setPage(Page page) {
        this.page = page;
    }
}
