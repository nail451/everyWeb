package org.alex.everyWeb.modules.impl.torrent.dto;

public class TorrentDTO {

    private String hash;
    private String name;
    private String state;              // downloading, uploading, pausedDL, etc.
    private double progress;           // 0.0 - 1.0
    private long size;                 // bytes
    private long downloaded;
    private long uploaded;
    private long downloadSpeed;        // bytes/s
    private long uploadSpeed;
    private int eta;                   // seconds, 8640000 = infinity
    private int numSeeds;
    private int numLeechs;
    private String savePath;
    private String category;
    private boolean sequentialDownload;
    private boolean firstLastPiecePrio;
    private long addedOn;              // epoch seconds
    private long completionOn;         // epoch seconds, -1 если не завершён

    public TorrentDTO() {
    }

    public String getHash() {
        return hash;
    }

    public void setHash(String hash) {
        this.hash = hash;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getState() {
        return state;
    }

    public void setState(String state) {
        this.state = state;
    }

    public double getProgress() {
        return progress;
    }

    public void setProgress(double progress) {
        this.progress = progress;
    }

    public long getSize() {
        return size;
    }

    public void setSize(long size) {
        this.size = size;
    }

    public long getDownloaded() {
        return downloaded;
    }

    public void setDownloaded(long downloaded) {
        this.downloaded = downloaded;
    }

    public long getUploaded() {
        return uploaded;
    }

    public void setUploaded(long uploaded) {
        this.uploaded = uploaded;
    }

    public long getDownloadSpeed() {
        return downloadSpeed;
    }

    public void setDownloadSpeed(long downloadSpeed) {
        this.downloadSpeed = downloadSpeed;
    }

    public long getUploadSpeed() {
        return uploadSpeed;
    }

    public void setUploadSpeed(long uploadSpeed) {
        this.uploadSpeed = uploadSpeed;
    }

    public int getEta() {
        return eta;
    }

    public void setEta(int eta) {
        this.eta = eta;
    }

    public int getNumSeeds() {
        return numSeeds;
    }

    public void setNumSeeds(int numSeeds) {
        this.numSeeds = numSeeds;
    }

    public int getNumLeechs() {
        return numLeechs;
    }

    public void setNumLeechs(int numLeechs) {
        this.numLeechs = numLeechs;
    }

    public String getSavePath() {
        return savePath;
    }

    public void setSavePath(String savePath) {
        this.savePath = savePath;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public boolean isSequentialDownload() {
        return sequentialDownload;
    }

    public void setSequentialDownload(boolean sequentialDownload) {
        this.sequentialDownload = sequentialDownload;
    }

    public boolean isFirstLastPiecePrio() {
        return firstLastPiecePrio;
    }

    public void setFirstLastPiecePrio(boolean firstLastPiecePrio) {
        this.firstLastPiecePrio = firstLastPiecePrio;
    }

    public long getAddedOn() {
        return addedOn;
    }

    public void setAddedOn(long addedOn) {
        this.addedOn = addedOn;
    }

    public long getCompletionOn() {
        return completionOn;
    }

    public void setCompletionOn(long completionOn) {
        this.completionOn = completionOn;
    }
}