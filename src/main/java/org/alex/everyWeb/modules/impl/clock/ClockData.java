package org.alex.everyWeb.modules.impl.clock;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

public class ClockData {
    private String format;
    private boolean showSeconds;
    private String timezone;
    private List<ClockFace> faces;

    public ClockData() {
        this.format = "24h";
        this.showSeconds = false;
        this.timezone = ZoneId.systemDefault().getId();
        this.faces = new ArrayList<>();
        // НЕ добавляем циферблат здесь - он будет добавлен в модуле при необходимости
    }

    @JsonCreator
    public ClockData(
            @JsonProperty("format") String format,
            @JsonProperty("showSeconds") boolean showSeconds,
            @JsonProperty("timezone") String timezone,
            @JsonProperty("faces") List<ClockFace> faces
    ) {
        this.format = format != null ? format : "24h";
        this.showSeconds = showSeconds;
        this.timezone = timezone != null ? timezone : ZoneId.systemDefault().getId();
        this.faces = faces != null ? faces : new ArrayList<>();
    }

    public String getFormat() { return format; }
    public void setFormat(String format) { this.format = format; }

    public boolean isShowSeconds() { return showSeconds; }
    public void setShowSeconds(boolean showSeconds) { this.showSeconds = showSeconds; }

    public String getTimezone() { return timezone; }
    public void setTimezone(String timezone) { this.timezone = timezone; }

    public List<ClockFace> getFaces() { return faces; }
    public void setFaces(List<ClockFace> faces) { this.faces = faces; }

    @JsonIgnore
    public void addFace(String name, String timezone) {
        if (faces == null) {
            faces = new ArrayList<>();
        }
        faces.add(new ClockFace(name, timezone));
    }

    @JsonIgnore
    public void removeFace(int index) {
        if (faces != null && index >= 0 && index < faces.size()) {
            faces.remove(index);
        }
    }

    public static class ClockFace {
        private String name;
        private String timezone;

        public ClockFace() {
            this.name = "";
            this.timezone = "UTC";
        }

        @JsonCreator
        public ClockFace(
                @JsonProperty("name") String name,
                @JsonProperty("timezone") String timezone
        ) {
            this.name = name != null ? name : "";
            this.timezone = timezone != null ? timezone : "UTC";
        }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getTimezone() { return timezone; }
        public void setTimezone(String timezone) { this.timezone = timezone; }
    }
}