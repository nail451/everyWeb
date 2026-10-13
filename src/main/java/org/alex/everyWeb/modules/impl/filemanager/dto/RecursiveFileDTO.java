package org.alex.everyWeb.modules.impl.filemanager.dto;

public class RecursiveFileDTO {
    private String relativePath;   // "everyWeb/src/main/App.java"
    private String fullPath;       // "/home/alsa/everyWeb/src/main/App.java" (для скачивания)
    private long size;

    public String getRelativePath() { return relativePath; }
    public void setRelativePath(String relativePath) { this.relativePath = relativePath; }
    public String getFullPath() { return fullPath; }
    public void setFullPath(String fullPath) { this.fullPath = fullPath; }
    public long getSize() { return size; }
    public void setSize(long size) { this.size = size; }
}