package org.alex.everyWeb.page.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "page_layouts")
public class PageLayout {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "page_id", nullable = false, unique = true)
    private Page page;

    @Column(name = "grid_rows")
    private Integer gridRows = 4;

    @Column(name = "grid_cols")
    private Integer gridCols = 4;

    @Column(name = "widgets_layout", columnDefinition = "TEXT")
    private String widgetsLayout = "[]"; // JSON с позициями виджетов

    @Column(name = "is_editing")
    private Boolean isEditing = false;

    // Геттеры и сеттеры
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Page getPage() { return page; }
    public void setPage(Page page) { this.page = page; }

    public Integer getGridRows() { return gridRows; }
    public void setGridRows(Integer gridRows) { this.gridRows = gridRows; }

    public Integer getGridCols() { return gridCols; }
    public void setGridCols(Integer gridCols) { this.gridCols = gridCols; }

    public String getWidgetsLayout() { return widgetsLayout; }
    public void setWidgetsLayout(String widgetsLayout) { this.widgetsLayout = widgetsLayout; }

    public Boolean getIsEditing() { return isEditing; }
    public void setIsEditing(Boolean isEditing) { this.isEditing = isEditing; }
}