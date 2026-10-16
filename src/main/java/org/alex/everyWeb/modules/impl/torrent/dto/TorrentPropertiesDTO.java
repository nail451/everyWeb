package org.alex.everyWeb.modules.impl.torrent.dto;

public class TorrentPropertiesDTO {

    private String savePath;
    private long creationDate;
    private long pieceSize;
    private long totalSize;
    private long totalDownloaded;
    private long totalUploaded;
    private long dlSpeed;
    private long upSpeed;
    private int seeds;
    private int peers;
    private int piecesHave;
    private int piecesTotal;
    private String comment;
    private long additionDate;
    private long completionDate;
    private String createdBy;
    private long timeElapsed;          // seconds
    private long seedingTime;          // seconds
    private long eta;

    public TorrentPropertiesDTO() {
    }

    public String getSavePath() {
        return savePath;
    }

    public void setSavePath(String savePath) {
        this.savePath = savePath;
    }

    public long getCreationDate() {
        return creationDate;
    }

    public void setCreationDate(long creationDate) {
        this.creationDate = creationDate;
    }

    public long getPieceSize() {
        return pieceSize;
    }

    public void setPieceSize(long pieceSize) {
        this.pieceSize = pieceSize;
    }

    public long getTotalSize() {
        return totalSize;
    }

    public void setTotalSize(long totalSize) {
        this.totalSize = totalSize;
    }

    public long getTotalDownloaded() {
        return totalDownloaded;
    }

    public void setTotalDownloaded(long totalDownloaded) {
        this.totalDownloaded = totalDownloaded;
    }

    public long getTotalUploaded() {
        return totalUploaded;
    }

    public void setTotalUploaded(long totalUploaded) {
        this.totalUploaded = totalUploaded;
    }

    public long getDlSpeed() {
        return dlSpeed;
    }

    public void setDlSpeed(long dlSpeed) {
        this.dlSpeed = dlSpeed;
    }

    public long getUpSpeed() {
        return upSpeed;
    }

    public void setUpSpeed(long upSpeed) {
        this.upSpeed = upSpeed;
    }

    public int getSeeds() {
        return seeds;
    }

    public void setSeeds(int seeds) {
        this.seeds = seeds;
    }

    public int getPeers() {
        return peers;
    }

    public void setPeers(int peers) {
        this.peers = peers;
    }

    public int getPiecesHave() {
        return piecesHave;
    }

    public void setPiecesHave(int piecesHave) {
        this.piecesHave = piecesHave;
    }

    public int getPiecesTotal() {
        return piecesTotal;
    }

    public void setPiecesTotal(int piecesTotal) {
        this.piecesTotal = piecesTotal;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }

    public long getAdditionDate() {
        return additionDate;
    }

    public void setAdditionDate(long additionDate) {
        this.additionDate = additionDate;
    }

    public long getCompletionDate() {
        return completionDate;
    }

    public void setCompletionDate(long completionDate) {
        this.completionDate = completionDate;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }

    public long getTimeElapsed() {
        return timeElapsed;
    }

    public void setTimeElapsed(long timeElapsed) {
        this.timeElapsed = timeElapsed;
    }

    public long getSeedingTime() {
        return seedingTime;
    }

    public void setSeedingTime(long seedingTime) {
        this.seedingTime = seedingTime;
    }

    public long getEta() {
        return eta;
    }

    public void setEta(long eta) {
        this.eta = eta;
    }
}