package org.alex.everyWeb.modules.impl.system;

import org.alex.everyWeb.modules.api.ModuleConfig;
import org.alex.everyWeb.modules.api.ModuleData;
import org.alex.everyWeb.modules.api.ModuleInfo;
import org.springframework.stereotype.Component;
import oshi.hardware.PowerSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class BatteryModule extends SystemModule {

    private static final Logger log = LoggerFactory.getLogger(BatteryModule.class);

    public BatteryModule() {
        this.updateIntervalMs = 10000;
    }

    @Override
    public ModuleInfo getInfo() {
        ModuleInfo info = new ModuleInfo();
        info.setType("BATTERY");
        info.setName("Батарея");
        info.setDescription("Состояние батареи и заряд");
        info.setIcon("🔋");
        info.setVersion("2.0.0");
        info.setAuthor("System");
        info.setEnabled(true);
        info.setConfigurable(true);
        info.setCssClass("battery-module");
        return info;
    }

    @Override
    public ModuleData createData(ModuleConfig config) {
        ModuleData data = new ModuleData("BATTERY", "Батарея");
        data.setContent(getBatteryData());
        data.setConfig(config);
        return data;
    }

    @Override
    public ModuleData updateData(ModuleData data, ModuleConfig config) {
        if (shouldUpdate()) {
            data.setContent(getBatteryData());
        }
        data.setConfig(config);
        return data;
    }

    private Map<String, Object> getBatteryData() {
        Map<String, Object> result = new HashMap<>();

        try {
            List<PowerSource> powerSources = HARDWARE.getPowerSources();

            if (powerSources == null || powerSources.isEmpty()) {
                result.put("available", false);
                result.put("message", "Батарея не обнаружена");
                return result;
            }

            // Берём первую батарею (на ThinkPad — BAT0)
            PowerSource battery = powerSources.get(0);

            // === ПРОЦЕНТ ЗАРЯДА (напрямую, без рефлексии) ===
            double capacity = battery.getRemainingCapacityPercent(); // 0.0 .. 1.0
            if (capacity < 0 || capacity > 1.0) {
                // Если OSHI не смог — оставляем 0, но помечаем
                capacity = 0;
            }
            double percent = capacity * 100.0;

            // === СОСТОЯНИЕ ===
            boolean powerOnLine = battery.isPowerOnLine();
            boolean charging = battery.isCharging();
            boolean discharging = battery.isDischarging();

            // === ВРЕМЯ ДО ПОЛНОГО/РАЗРЯДА ===
            double timeRemainingRaw = battery.getTimeRemainingEstimated(); // секунды, может быть отрицательным

            result.put("available", true);
            result.put("name", battery.getName() != null ? battery.getName() : "Батарея");
            result.put("remainingCapacity", Math.round(percent * 10) / 10.0);
            result.put("isCharging", charging);
            result.put("isDischarging", discharging);
            result.put("isPowerOnLine", powerOnLine);

            // === СТАТУС ===
            String status;
            if (powerOnLine && charging) {
                status = "Заряжается";
            } else if (powerOnLine && percent >= 99) {
                status = "Питание от сети, заряжено";
            } else if (powerOnLine) {
                status = "Питание от сети";
            } else if (discharging) {
                status = "Разряжается";
            } else if (percent > 75) {
                status = "Отлично";
            } else if (percent > 50) {
                status = "Нормально";
            } else if (percent > 25) {
                status = "Низкий заряд";
            } else {
                status = "Критический заряд";
            }
            result.put("status", status);

            // === ВРЕМЯ ===
            // getTimeRemainingEstimated() возвращает:
            //   > 0 — секунды (для discharging — до разряда, для charging — до полного)
            //   -1 — вычисляется / неизвестно
            //   -2 — бесконечно (на питании, заряжено)
            if (timeRemainingRaw > 0 && timeRemainingRaw < Integer.MAX_VALUE) {
                long timeRemaining = (long) timeRemainingRaw;
                long hours = timeRemaining / 3600;
                long minutes = (timeRemaining % 3600) / 60;
                result.put("timeRemainingFormatted", String.format("%02d:%02d", hours, minutes));
                result.put("timeRemaining", timeRemaining);
            } else if (timeRemainingRaw == -2) {
                result.put("timeRemainingFormatted", "—");
                result.put("timeRemaining", -2);
            } else {
                result.put("timeRemainingFormatted", "—");
                result.put("timeRemaining", -1);
            }

            // === ИКОНКА ===
            String icon;
            if (charging) {
                icon = "⚡";
            } else if (powerOnLine) {
                icon = "🔌";
            } else if (percent > 75) {
                icon = "🔋";
            } else if (percent > 50) {
                icon = "🔋";
            } else if (percent > 25) {
                icon = "🔋";
            } else if (percent > 10) {
                icon = "🪫";
            } else {
                icon = "⚠️";
            }
            result.put("icon", icon);

        } catch (Exception e) {
            log.error("Error getting battery data: {}", e.getMessage(), e);
            result.put("available", false);
            result.put("message", "Ошибка получения данных о батарее: " + e.getMessage());
        }

        return result;
    }
}