package org.alex.everyWeb.modules.impl.clock;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.DayOfWeek;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class ClockData {
    private String format;
    private boolean showSeconds;
    private String timezone;
    private List<ClockFace> faces;
    private List<Alarm> alarms;

    public ClockData() {
        this.format = "24h";
        this.showSeconds = false;
        this.timezone = java.time.ZoneId.systemDefault().getId();
        this.faces = new ArrayList<>();
        this.alarms = new ArrayList<>();
    }

    @JsonCreator
    public ClockData(
            @JsonProperty("format") String format,
            @JsonProperty("showSeconds") boolean showSeconds,
            @JsonProperty("timezone") String timezone,
            @JsonProperty("faces") List<ClockFace> faces,
            @JsonProperty("alarms") List<Alarm> alarms
    ) {
        this.format = format != null ? format : "24h";
        this.showSeconds = showSeconds;
        this.timezone = timezone != null ? timezone : java.time.ZoneId.systemDefault().getId();
        this.faces = faces != null ? faces : new ArrayList<>();
        this.alarms = alarms != null ? alarms : new ArrayList<>();
    }

    public String getFormat() { return format; }
    public void setFormat(String format) { this.format = format; }

    public boolean isShowSeconds() { return showSeconds; }
    public void setShowSeconds(boolean showSeconds) { this.showSeconds = showSeconds; }

    public String getTimezone() { return timezone; }
    public void setTimezone(String timezone) { this.timezone = timezone; }

    public List<ClockFace> getFaces() { return faces; }
    public void setFaces(List<ClockFace> faces) { this.faces = faces; }

    public List<Alarm> getAlarms() { return alarms; }
    public void setAlarms(List<Alarm> alarms) { this.alarms = alarms; }

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

    @JsonIgnore
    public void addAlarm(Alarm alarm) {
        if (alarms == null) {
            alarms = new ArrayList<>();
        }
        alarms.add(alarm);
    }

    @JsonIgnore
    public void removeAlarm(int index) {
        if (alarms != null && index >= 0 && index < alarms.size()) {
            alarms.remove(index);
        }
    }

    @JsonIgnore
    public void toggleAlarm(int index) {
        if (alarms != null && index >= 0 && index < alarms.size()) {
            Alarm alarm = alarms.get(index);
            alarm.setEnabled(!alarm.isEnabled());
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

    public static class Alarm {
        private String id;
        private String name;
        private String time;
        private boolean enabled;
        private List<DayOfWeek> repeatDays;
        private Integer repeatIntervalHours;
        private Integer repeatIntervalMinutes;
        private String sound;
        private boolean vibrate;

        public Alarm() {
            this.id = UUID.randomUUID().toString();
            this.name = "Будильник";
            this.time = "08:00";
            this.enabled = true;
            this.repeatDays = new ArrayList<>();
            this.vibrate = true;
        }

        @JsonCreator
        public Alarm(
                @JsonProperty("id") String id,
                @JsonProperty("name") String name,
                @JsonProperty("time") String time,
                @JsonProperty("enabled") boolean enabled,
                @JsonProperty("repeatDays") List<DayOfWeek> repeatDays,
                @JsonProperty("repeatIntervalHours") Integer repeatIntervalHours,
                @JsonProperty("repeatIntervalMinutes") Integer repeatIntervalMinutes,
                @JsonProperty("sound") String sound,
                @JsonProperty("vibrate") boolean vibrate
        ) {
            this.id = id != null ? id : UUID.randomUUID().toString();
            this.name = name != null ? name : "Будильник";
            this.time = time != null ? time : "08:00";
            this.enabled = enabled;
            this.repeatDays = repeatDays != null ? repeatDays : new ArrayList<>();
            this.repeatIntervalHours = repeatIntervalHours;
            this.repeatIntervalMinutes = repeatIntervalMinutes;
            this.sound = sound;
            this.vibrate = vibrate;
        }

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getTime() { return time; }
        public void setTime(String time) { this.time = time; }

        public boolean isEnabled() { return enabled; }
        public void setEnabled(boolean enabled) { this.enabled = enabled; }

        public List<DayOfWeek> getRepeatDays() { return repeatDays; }
        public void setRepeatDays(List<DayOfWeek> repeatDays) { this.repeatDays = repeatDays; }

        public Integer getRepeatIntervalHours() { return repeatIntervalHours; }
        public void setRepeatIntervalHours(Integer repeatIntervalHours) { this.repeatIntervalHours = repeatIntervalHours; }

        public Integer getRepeatIntervalMinutes() { return repeatIntervalMinutes; }
        public void setRepeatIntervalMinutes(Integer repeatIntervalMinutes) { this.repeatIntervalMinutes = repeatIntervalMinutes; }

        public String getSound() { return sound; }
        public void setSound(String sound) { this.sound = sound; }

        public boolean isVibrate() { return vibrate; }
        public void setVibrate(boolean vibrate) { this.vibrate = vibrate; }

        @JsonIgnore
        public boolean isIntervalRepeat() {
            return (repeatIntervalHours != null && repeatIntervalHours > 0) ||
                    (repeatIntervalMinutes != null && repeatIntervalMinutes > 0);
        }

        @JsonIgnore
        public String getRepeatDaysDisplay() {
            if (repeatDays == null || repeatDays.isEmpty()) {
                return "Каждый день";
            }
            String[] dayNames = {"ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"};
            StringBuilder sb = new StringBuilder();
            for (DayOfWeek day : repeatDays) {
                sb.append(dayNames[day.getValue() - 1]).append(" ");
            }
            return sb.toString().trim();
        }

        @JsonIgnore
        public String getIntervalDisplay() {
            if (!isIntervalRepeat()) return "";
            StringBuilder sb = new StringBuilder();
            if (repeatIntervalHours != null && repeatIntervalHours > 0) {
                sb.append(repeatIntervalHours).append("ч");
            }
            if (repeatIntervalMinutes != null && repeatIntervalMinutes > 0) {
                if (sb.length() > 0) sb.append(" ");
                sb.append(repeatIntervalMinutes).append("м");
            }
            return "Повторять каждые " + sb.toString();
        }
    }
}