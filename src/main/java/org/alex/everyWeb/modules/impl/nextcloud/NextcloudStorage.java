package org.alex.everyWeb.modules.impl.nextcloud;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public class NextcloudStorage {

    @JsonProperty("free")
    private Long free;

    @JsonProperty("used")
    private Long used;

    @JsonProperty("total")
    private Long total;

    @JsonProperty("relative")
    private Double relative;

    @JsonProperty("quota")
    private Long quota;

    public Long getFree() { return free; }
    public void setFree(Long free) { this.free = free; }

    public Long getUsed() { return used; }
    public void setUsed(Long used) { this.used = used; }

    public Long getTotal() { return total; }
    public void setTotal(Long total) { this.total = total; }

    public Double getRelative() { return relative; }
    public void setRelative(Double relative) { this.relative = relative; }

    public Long getQuota() { return quota; }
    public void setQuota(Long quota) { this.quota = quota; }

    public String getUsedFormatted() {
        return formatSize(used);
    }

    public String getTotalFormatted() {
        return formatSize(total);
    }

    public String getFreeFormatted() {
        return formatSize(free);
    }

    public int getUsedPercent() {
        if (total == null || total == 0) return 0;
        return (int) Math.round((double) used / total * 100);
    }

    private String formatSize(Long size) {
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