package org.alex.everyWeb.modules.entity;


import jakarta.persistence.*;

@Entity
@Table(name = "available_modules")
public class AvailableModule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String type;  // WEATHER, NOTES, CLOCK, CALENDAR, TODO, etc.

    @Column(nullable = false)
    private String name;  // Отображаемое имя

    @Column(columnDefinition = "TEXT")
    private String description;  // Описание модуля

    @Column(nullable = false)
    private String icon;  // Иконка (эмодзи)

    @Column(name = "css_class")
    private String cssClass;  // CSS класс для стилизации

    @Column(name = "is_enabled")
    private Boolean isEnabled = true;

    @Column(name = "is_configurable")
    private Boolean isConfigurable = false;

    @Column(name = "js_file")
    private String jsFile;  // Имя JS файла для модуля (например, "clock-module.js")

    @Column(name = "version")
    private String version = "1.0.0";

    @Column(name = "author")
    private String author = "System";

    @Column(name = "display_order")
    private Integer displayOrder = 0;

    // Геттеры и сеттеры
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getIcon() { return icon; }
    public void setIcon(String icon) { this.icon = icon; }

    public String getCssClass() { return cssClass; }
    public void setCssClass(String cssClass) { this.cssClass = cssClass; }

    public Boolean getIsEnabled() { return isEnabled; }
    public void setIsEnabled(Boolean isEnabled) { this.isEnabled = isEnabled; }

    public Boolean getIsConfigurable() { return isConfigurable; }
    public void setIsConfigurable(Boolean isConfigurable) { this.isConfigurable = isConfigurable; }

    public String getJsFile() { return jsFile; }
    public void setJsFile(String jsFile) { this.jsFile = jsFile; }

    public String getVersion() { return version; }
    public void setVersion(String version) { this.version = version; }

    public String getAuthor() { return author; }
    public void setAuthor(String author) { this.author = author; }

    public Integer getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(Integer displayOrder) { this.displayOrder = displayOrder; }
}