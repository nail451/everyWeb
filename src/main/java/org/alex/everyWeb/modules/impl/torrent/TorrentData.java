package org.alex.everyWeb.modules.impl.torrent;

public class TorrentData {

    private String baseUrl = "http://127.0.0.1:8050";
    private String username = "admin";
    private String password = "";
    private String downloadPath = "/home/alsa/torrent";
    private int pollInterval = 3000;   // ms
    private String containerDownloadPath = "/downloads";   // путь внутри контейнера
    private String hostDownloadPath = "/home/alsa/torrent"; // путь на хосте

    public TorrentData() {
    }

    public String getBaseUrl() {
        return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getDownloadPath() {
        return downloadPath;
    }

    public void setDownloadPath(String downloadPath) {
        this.downloadPath = downloadPath;
    }

    public int getPollInterval() {
        return pollInterval;
    }

    public void setPollInterval(int pollInterval) {
        this.pollInterval = pollInterval;
    }

    public boolean isConfigured() {
        return baseUrl != null && !baseUrl.isBlank()
                && username != null && !username.isBlank()
                && password != null && !password.isBlank();
    }
}