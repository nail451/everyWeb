package org.alex.everyWeb.modules.impl.filemanager.dto;

import java.util.List;

public class FileListDTO {
    private String path;
    private String parentPath;
    private List<FileEntryDTO> entries;

    public String getPath() { return path; }
    public void setPath(String path) { this.path = path; }
    public String getParentPath() { return parentPath; }
    public void setParentPath(String parentPath) { this.parentPath = parentPath; }
    public List<FileEntryDTO> getEntries() { return entries; }
    public void setEntries(List<FileEntryDTO> entries) { this.entries = entries; }
}