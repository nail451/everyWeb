package org.alex.everyWeb.modules.impl.filemanager.dto;

public class TreeEntryDTO {
    private String name;
    private String path;
    private boolean hasChildren;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getPath() { return path; }
    public void setPath(String path) { this.path = path; }
    public boolean isHasChildren() { return hasChildren; }
    public void setHasChildren(boolean hasChildren) { this.hasChildren = hasChildren; }
}