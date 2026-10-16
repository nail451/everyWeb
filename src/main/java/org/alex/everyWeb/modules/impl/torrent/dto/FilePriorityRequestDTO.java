package org.alex.everyWeb.modules.impl.torrent.dto;

public class FilePriorityRequestDTO {

    private String hash;
    private int[] fileIds;
    private int priority;    // 0, 1, 6, 7

    public FilePriorityRequestDTO() {
    }

    public String getHash() {
        return hash;
    }

    public void setHash(String hash) {
        this.hash = hash;
    }

    public int[] getFileIds() {
        return fileIds;
    }

    public void setFileIds(int[] fileIds) {
        this.fileIds = fileIds;
    }

    public int getPriority() {
        return priority;
    }

    public void setPriority(int priority) {
        this.priority = priority;
    }
}