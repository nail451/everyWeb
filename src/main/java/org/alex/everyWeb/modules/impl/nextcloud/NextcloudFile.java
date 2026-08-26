package org.alex.everyWeb.modules.impl.nextcloud;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public class NextcloudFile {

    private Long id;
    private String name;
    private String path;
    private String type;
    private Long size;
    private Long mtime;
    private String mimeType;
    private String etag;
    private Boolean isDirectory;

    @JsonProperty("id")
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    @JsonProperty("name")
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    @JsonProperty("path")
    public String getPath() { return path; }
    public void setPath(String path) { this.path = path; }

    @JsonProperty("type")
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    @JsonProperty("size")
    public Long getSize() { return size; }
    public void setSize(Long size) { this.size = size; }

    @JsonProperty("mtime")
    public Long getMtime() { return mtime; }
    public void setMtime(Long mtime) { this.mtime = mtime; }

    @JsonProperty("mimetype")
    public String getMimeType() { return mimeType; }
    public void setMimeType(String mimeType) { this.mimeType = mimeType; }

    @JsonProperty("etag")
    public String getEtag() { return etag; }
    public void setEtag(String etag) { this.etag = etag; }

    @JsonProperty("isdir")
    public Boolean getIsDirectory() { return isDirectory; }
    public void setIsDirectory(Boolean isDirectory) { this.isDirectory = isDirectory; }

    public String getFileSize() {
        if (size == null) return "—";
        String[] units = {"B", "KB", "MB", "GB", "TB"};
        int unitIndex = 0;
        double fileSize = size;
        while (fileSize > 1024 && unitIndex < units.length - 1) {
            fileSize /= 1024;
            unitIndex++;
        }
        return String.format("%.1f %s", fileSize, units[unitIndex]);
    }
}