package org.alex.everyWeb.page.dto;

public class WidgetDTO {
    private String id;
    private String type;
    private String title;
    private Integer row;
    private Integer col;
    private Integer rowSpan;
    private Integer colSpan;
    private String data;
    private String settings;
    private Boolean isEditing;
    private Boolean isLinkWidget;

    // Геттеры и сеттеры
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public Integer getRow() { return row; }
    public void setRow(Integer row) { this.row = row; }

    public Integer getCol() { return col; }
    public void setCol(Integer col) { this.col = col; }

    public Integer getRowSpan() { return rowSpan; }
    public void setRowSpan(Integer rowSpan) { this.rowSpan = rowSpan; }

    public Integer getColSpan() { return colSpan; }
    public void setColSpan(Integer colSpan) { this.colSpan = colSpan; }

    public String getData() { return data; }
    public void setData(String data) { this.data = data; }

    public String getSettings() { return settings; }
    public void setSettings(String settings) { this.settings = settings; }

    public Boolean getIsEditing() { return isEditing; }
    public void setIsEditing(Boolean isEditing) { this.isEditing = isEditing; }

    public Boolean getIsLinkWidget() { return isLinkWidget; }
    public void setIsLinkWidget(Boolean isLinkWidget) { this.isLinkWidget = isLinkWidget; }
}