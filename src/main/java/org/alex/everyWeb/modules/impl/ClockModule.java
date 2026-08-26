package org.alex.everyWeb.modules.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.alex.everyWeb.modules.api.ModuleConfig;
import org.alex.everyWeb.modules.api.ModuleData;
import org.alex.everyWeb.modules.api.ModuleInfo;
import org.alex.everyWeb.modules.core.Module;
import org.alex.everyWeb.modules.impl.clock.ClockData;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Component
public class ClockModule extends Module {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public ModuleInfo getInfo() {
        ModuleInfo info = new ModuleInfo();
        info.setType("CLOCK");
        info.setName("Часы");
        info.setDescription("Многофункциональные часы с поддержкой нескольких часовых поясов");
        info.setIcon("🕐");
        info.setVersion("1.0.0");
        info.setAuthor("System");
        info.setEnabled(true);
        info.setConfigurable(true);
        info.setCssClass("clock-module");
        return info;
    }

    @Override
    public ModuleData createData(ModuleConfig config) {
        ModuleData data = new ModuleData("CLOCK", "Часы");

        ClockData clockData = getClockData(config);

        Map<String, Object> content = new HashMap<>();
        content.put("clockData", clockData);
        content.put("currentTime", getCurrentTimes(clockData));
        content.put("timezoneList", getAllTimezones());

        data.setContent(content);
        data.setConfig(config);
        return data;
    }

    @Override
    public ModuleData updateData(ModuleData data, ModuleConfig config) {
        ClockData clockData = getClockData(config);

        Map<String, Object> content = new HashMap<>();
        content.put("clockData", clockData);
        content.put("currentTime", getCurrentTimes(clockData));
        content.put("timezoneList", getAllTimezones());

        data.setContent(content);
        data.setConfig(config);
        return data;
    }

    @Override
    public Object handleAction(String action, Map<String, Object> params, ModuleConfig config) {
        ClockData clockData = getClockData(config);

        switch (action) {
            case "addFace":
                String name = (String) params.get("name");
                String timezone = (String) params.get("timezone");
                if (name != null && !name.trim().isEmpty() && timezone != null) {
                    clockData.addFace(name.trim(), timezone);
                    saveClockData(config, clockData);
                    return buildModuleData(clockData, config);
                }
                break;

            case "removeFace":
                Integer index = (Integer) params.get("index");
                if (index != null) {
                    if (index >= 0 && index < clockData.getFaces().size()) {
                        clockData.removeFace(index);
                        saveClockData(config, clockData);
                        // Возвращаем полные данные с сохранением всех настроек
                        return buildModuleData(clockData, config);
                    } else {
                        Map<String, Object> error = new HashMap<>();
                        error.put("error", "Циферблат не найден");
                        return error;
                    }
                }
                break;

            case "updateSettings":
                String format = (String) params.get("format");
                Boolean showSeconds = (Boolean) params.get("showSeconds");
                String timezoneMain = (String) params.get("timezone");

                if (format != null) {
                    clockData.setFormat(format);
                }
                if (showSeconds != null) {
                    clockData.setShowSeconds(showSeconds);
                }
                if (timezoneMain != null) {
                    clockData.setTimezone(timezoneMain);
                }

                saveClockData(config, clockData);
                return buildModuleData(clockData, config);
        }
        return null;
    }

    private ModuleData buildModuleData(ClockData clockData, ModuleConfig config) {
        ModuleData data = new ModuleData("CLOCK", "Часы");
        Map<String, Object> content = new HashMap<>();
        content.put("clockData", clockData);
        content.put("currentTime", getCurrentTimes(clockData));
        content.put("timezoneList", getAllTimezones());
        data.setContent(content);
        data.setConfig(config);
        return data;
    }

    private ClockData getClockData(ModuleConfig config) {
        String settingsJson = config.getString("clockData");
        if (settingsJson != null && !settingsJson.isEmpty()) {
            try {
                ClockData data = objectMapper.readValue(settingsJson, ClockData.class);
                // Если есть данные, возвращаем их
                if (data != null && data.getFaces() != null && !data.getFaces().isEmpty()) {
                    return data;
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
        // Создаем новые данные с одним дефолтным циферблатом
        ClockData data = new ClockData();
        // Не добавляем дополнительный циферблат - основной уже есть в ClockData
        return data;
    }

    private void saveClockData(ModuleConfig config, ClockData clockData) {
        try {
            String json = objectMapper.writeValueAsString(clockData);
            config.put("clockData", json);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private List<Map<String, Object>> getCurrentTimes(ClockData clockData) {
        List<Map<String, Object>> times = new ArrayList<>();
        Instant now = Instant.now();

        // Основной циферблат (всегда есть)
        ZoneId mainZone = ZoneId.of(clockData.getTimezone());
        times.add(createTimeInfo("", mainZone, now, clockData));

        // Дополнительные циферблаты
        if (clockData.getFaces() != null) {
            for (ClockData.ClockFace face : clockData.getFaces()) {
                try {
                    ZoneId zone = ZoneId.of(face.getTimezone());
                    times.add(createTimeInfo(face.getName(), zone, now, clockData));
                } catch (Exception e) {
                    // Если часовой пояс невалидный, пропускаем
                    System.err.println("Invalid timezone: " + face.getTimezone());
                }
            }
        }

        return times;
    }

    private Map<String, Object> createTimeInfo(String name, ZoneId zone, Instant now, ClockData clockData) {
        ZonedDateTime zdt = now.atZone(zone);

        String formatPattern = clockData.getFormat().equals("12h") ? "hh:mm" : "HH:mm";
        if (clockData.isShowSeconds()) {
            formatPattern += ":ss";
        }
        if (clockData.getFormat().equals("12h")) {
            formatPattern += " a";
        }

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern(formatPattern);

        Map<String, Object> info = new HashMap<>();
        info.put("name", name);
        info.put("time", zdt.format(formatter));
        info.put("timezone", zone.getId());
        info.put("date", zdt.format(DateTimeFormatter.ofPattern("dd MMM yyyy")));
        info.put("offset", zdt.getOffset().getId());

        return info;
    }

    private List<Map<String, String>> getAllTimezones() {
        List<Map<String, String>> timezones = new ArrayList<>();

        Set<String> zoneIds = ZoneId.getAvailableZoneIds();
        for (String zoneId : zoneIds) {
            ZoneId zone = ZoneId.of(zoneId);
            String offset = zone.getRules().getOffset(Instant.now()).getId();
            String displayName = zoneId + " (UTC" + offset + ")";

            Map<String, String> item = new HashMap<>();
            item.put("value", zoneId);
            item.put("label", displayName);
            timezones.add(item);
        }

        timezones.sort(Comparator.comparing(m -> m.get("label")));
        return timezones;
    }
}