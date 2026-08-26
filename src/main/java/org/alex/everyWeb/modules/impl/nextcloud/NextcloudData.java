package org.alex.everyWeb.modules.impl.nextcloud;

public class NextcloudData {
    private String serverUrl = "";
    private String username = "";
    private String password = "";
    private String path = "/";
    private int maxFiles = 10;
    private boolean showStorage = true;
    private boolean showRecentFiles = true;

    public String getServerUrl() { return serverUrl; }
    public void setServerUrl(String serverUrl) { this.serverUrl = serverUrl; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getPath() { return path; }
    public void setPath(String path) { this.path = path; }

    public int getMaxFiles() { return maxFiles; }
    public void setMaxFiles(int maxFiles) { this.maxFiles = maxFiles; }

    public boolean isShowStorage() { return showStorage; }
    public void setShowStorage(boolean showStorage) { this.showStorage = showStorage; }

    public boolean isShowRecentFiles() { return showRecentFiles; }
    public void setShowRecentFiles(boolean showRecentFiles) { this.showRecentFiles = showRecentFiles; }
}