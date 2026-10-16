package org.alex.everyWeb.modules.impl.torrent.dto;

public class TorrentAddRequestDTO {

    private String url;          // magnet-ссылка или http(s) URL к .torrent
    private String savePath;     // опционально, иначе default
    private String category;     // опционально
    private Boolean sequentialDownload;
    private Boolean firstLastPiecePrio;

    public TorrentAddRequestDTO() {
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
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

    public Boolean getSequentialDownload() {
        return sequentialDownload;
    }

    public void setSequentialDownload(Boolean sequentialDownload) {
        this.sequentialDownload = sequentialDownload;
    }

    public Boolean getFirstLastPiecePrio() {
        return firstLastPiecePrio;
    }

    public void setFirstLastPiecePrio(Boolean firstLastPiecePrio) {
        this.firstLastPiecePrio = firstLastPiecePrio;
    }
}