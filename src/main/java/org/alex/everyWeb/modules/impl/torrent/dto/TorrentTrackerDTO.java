package org.alex.everyWeb.modules.impl.torrent.dto;

public class TorrentTrackerDTO {

    private String url;
    private int status;          // 0..4
    private int tier;            // -1 для DHT/PeX/LSD
    private int numPeers;
    private int numSeeds;
    private int numLeechs;
    private int numDownloaded;
    private String msg;

    public TorrentTrackerDTO() {
    }

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }

    public int getStatus() { return status; }
    public void setStatus(int status) { this.status = status; }

    public int getTier() { return tier; }
    public void setTier(int tier) { this.tier = tier; }

    public int getNumPeers() { return numPeers; }
    public void setNumPeers(int numPeers) { this.numPeers = numPeers; }

    public int getNumSeeds() { return numSeeds; }
    public void setNumSeeds(int numSeeds) { this.numSeeds = numSeeds; }

    public int getNumLeechs() { return numLeechs; }
    public void setNumLeechs(int numLeechs) { this.numLeechs = numLeechs; }

    public int getNumDownloaded() { return numDownloaded; }
    public void setNumDownloaded(int numDownloaded) { this.numDownloaded = numDownloaded; }

    public String getMsg() { return msg; }
    public void setMsg(String msg) { this.msg = msg; }

    /** Псевдо-трекер (DHT/PeX/LSD) */
    public boolean isPseudo() {
        return tier == -1 || (url != null && url.startsWith("**"));
    }
}