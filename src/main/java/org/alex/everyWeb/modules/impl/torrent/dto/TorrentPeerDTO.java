package org.alex.everyWeb.modules.impl.torrent.dto;

public class TorrentPeerDTO {

    private String ip;
    private int port;
    private String client;
    private String peerIdClient;      // "-qB513A-"
    private double progress;
    private long dlSpeed;
    private long upSpeed;
    private long downloaded;
    private long uploaded;
    private String flags;
    private String flagsDesc;         // расшифровка флагов
    private String connection;
    private String country;
    private String countryCode;
    private String hostName;
    private String files;             // какой файл качает
    private double relevance;
    private String i2pDest;

    public TorrentPeerDTO() {
    }

    public String getIp() { return ip; }
    public void setIp(String ip) { this.ip = ip; }

    public int getPort() { return port; }
    public void setPort(int port) { this.port = port; }

    public String getClient() { return client; }
    public void setClient(String client) { this.client = client; }

    public String getPeerIdClient() { return peerIdClient; }
    public void setPeerIdClient(String peerIdClient) { this.peerIdClient = peerIdClient; }

    public double getProgress() { return progress; }
    public void setProgress(double progress) { this.progress = progress; }

    public long getDlSpeed() { return dlSpeed; }
    public void setDlSpeed(long dlSpeed) { this.dlSpeed = dlSpeed; }

    public long getUpSpeed() { return upSpeed; }
    public void setUpSpeed(long upSpeed) { this.upSpeed = upSpeed; }

    public long getDownloaded() { return downloaded; }
    public void setDownloaded(long downloaded) { this.downloaded = downloaded; }

    public long getUploaded() { return uploaded; }
    public void setUploaded(long uploaded) { this.uploaded = uploaded; }

    public String getFlags() { return flags; }
    public void setFlags(String flags) { this.flags = flags; }

    public String getFlagsDesc() { return flagsDesc; }
    public void setFlagsDesc(String flagsDesc) { this.flagsDesc = flagsDesc; }

    public String getConnection() { return connection; }
    public void setConnection(String connection) { this.connection = connection; }

    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }

    public String getCountryCode() { return countryCode; }
    public void setCountryCode(String countryCode) { this.countryCode = countryCode; }

    public String getHostName() { return hostName; }
    public void setHostName(String hostName) { this.hostName = hostName; }

    public String getFiles() { return files; }
    public void setFiles(String files) { this.files = files; }

    public double getRelevance() { return relevance; }
    public void setRelevance(double relevance) { this.relevance = relevance; }

    public String getI2pDest() { return i2pDest; }
    public void setI2pDest(String i2pDest) { this.i2pDest = i2pDest; }
}