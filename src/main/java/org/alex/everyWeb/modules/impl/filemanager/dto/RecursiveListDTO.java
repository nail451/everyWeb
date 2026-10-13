package org.alex.everyWeb.modules.impl.filemanager.dto;

import java.util.List;

public class RecursiveListDTO {
    private List<RecursiveFileDTO> files;
    private List<String> directories;   // все папки (включая пустые)
    private String archiveName;         // имя для отображения / fallback

    public List<RecursiveFileDTO> getFiles() { return files; }
    public void setFiles(List<RecursiveFileDTO> files) { this.files = files; }
    public List<String> getDirectories() { return directories; }
    public void setDirectories(List<String> directories) { this.directories = directories; }
    public String getArchiveName() { return archiveName; }
    public void setArchiveName(String archiveName) { this.archiveName = archiveName; }
}