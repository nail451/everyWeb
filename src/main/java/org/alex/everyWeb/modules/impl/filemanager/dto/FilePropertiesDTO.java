package org.alex.everyWeb.modules.impl.filemanager.dto;

public class FilePropertiesDTO {
    private String name;
    private String path;
    private boolean directory;
    private boolean symlink;
    private String symlinkTarget;
    private long size;
    private String sizeFormatted;
    private String created;
    private String lastModified;
    private String lastAccessed;
    private String owner;
    private String group;
    private String permissions;
    private String permissionsOctal;
    private int childCount;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getPath() { return path; }
    public void setPath(String path) { this.path = path; }
    public boolean isDirectory() { return directory; }
    public void setDirectory(boolean directory) { this.directory = directory; }
    public boolean isSymlink() { return symlink; }
    public void setSymlink(boolean symlink) { this.symlink = symlink; }
    public String getSymlinkTarget() { return symlinkTarget; }
    public void setSymlinkTarget(String symlinkTarget) { this.symlinkTarget = symlinkTarget; }
    public long getSize() { return size; }
    public void setSize(long size) { this.size = size; }
    public String getSizeFormatted() { return sizeFormatted; }
    public void setSizeFormatted(String sizeFormatted) { this.sizeFormatted = sizeFormatted; }
    public String getCreated() { return created; }
    public void setCreated(String created) { this.created = created; }
    public String getLastModified() { return lastModified; }
    public void setLastModified(String lastModified) { this.lastModified = lastModified; }
    public String getLastAccessed() { return lastAccessed; }
    public void setLastAccessed(String lastAccessed) { this.lastAccessed = lastAccessed; }
    public String getOwner() { return owner; }
    public void setOwner(String owner) { this.owner = owner; }
    public String getGroup() { return group; }
    public void setGroup(String group) { this.group = group; }
    public String getPermissions() { return permissions; }
    public void setPermissions(String permissions) { this.permissions = permissions; }
    public String getPermissionsOctal() { return permissionsOctal; }
    public void setPermissionsOctal(String permissionsOctal) { this.permissionsOctal = permissionsOctal; }
    public int getChildCount() { return childCount; }
    public void setChildCount(int childCount) { this.childCount = childCount; }
}