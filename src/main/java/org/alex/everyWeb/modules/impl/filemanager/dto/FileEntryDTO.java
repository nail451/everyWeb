package org.alex.everyWeb.modules.impl.filemanager.dto;

public class FileEntryDTO {
    private String name;
    private String path;
    private boolean directory;
    private boolean symlink;
    private boolean hidden;
    private long size;
    private String sizeFormatted;
    private String lastModified;
    private String icon;
    private String extension;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getPath() { return path; }
    public void setPath(String path) { this.path = path; }
    public boolean isDirectory() { return directory; }
    public void setDirectory(boolean directory) { this.directory = directory; }
    public boolean isSymlink() { return symlink; }
    public void setSymlink(boolean symlink) { this.symlink = symlink; }
    public boolean isHidden() { return hidden; }
    public void setHidden(boolean hidden) { this.hidden = hidden; }
    public long getSize() { return size; }
    public void setSize(long size) { this.size = size; }
    public String getSizeFormatted() { return sizeFormatted; }
    public void setSizeFormatted(String sizeFormatted) { this.sizeFormatted = sizeFormatted; }
    public String getLastModified() { return lastModified; }
    public void setLastModified(String lastModified) { this.lastModified = lastModified; }
    public String getIcon() { return icon; }
    public void setIcon(String icon) { this.icon = icon; }
    public String getExtension() { return extension; }
    public void setExtension(String extension) { this.extension = extension; }
}