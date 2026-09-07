package org.alex.everyWeb.modules.impl.system;

import org.alex.everyWeb.modules.api.ModuleConfig;
import org.alex.everyWeb.modules.api.ModuleData;
import org.alex.everyWeb.modules.api.ModuleInfo;
import org.springframework.stereotype.Component;
import oshi.hardware.PowerSource;

import java.lang.reflect.Method;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class BatteryModule extends SystemModule {

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
        info.setVersion("1.0.0");
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

            PowerSource battery = powerSources.get(0);

            // Получаем процент заряда через рефлексию
            double percent = getBatteryPercent(battery);

            result.put("available", true);
            result.put("name", battery.getName() != null ? battery.getName() : "Батарея");
            result.put("remainingCapacity", Math.round(percent * 10) / 10.0);
            result.put("isCharging", battery.isCharging());
            result.put("isDischarging", battery.isDischarging());

            // Получаем время работы
            long timeRemaining = getBatteryTimeRemaining(battery);
            if (timeRemaining > 0 && timeRemaining < Integer.MAX_VALUE) {
                long hours = timeRemaining / 3600;
                long minutes = (timeRemaining % 3600) / 60;
                result.put("timeRemainingFormatted", String.format("%02d:%02d", hours, minutes));
            } else {
                result.put("timeRemainingFormatted", "N/A");
            }
            result.put("timeRemaining", timeRemaining);

            // Иконка
            String icon;
            if (battery.isCharging()) {
                icon = "⚡";
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
            result.put("available", false);
            result.put("message", "Ошибка получения данных о батарее: " + e.getMessage());
        }

        return result;
    }

    private double getBatteryPercent(PowerSource battery) {
        try {
            // Пробуем getRemainingCapacity()
            Method method = battery.getClass().getMethod("getRemainingCapacity");
            Double value = (Double) method.invoke(battery);
            if (value != null && value >= 0 && value <= 1) {
                return value * 100;
            }
        } catch (Exception e1) {
            try {
                // Пробуем getRemainingCapacityPercent()
                Method method = battery.getClass().getMethod("getRemainingCapacityPercent");
                Double value = (Double) method.invoke(battery);
                if (value != null && value >= 0 && value <= 100) {
                    return value;
                }
            } catch (Exception e2) {
                try {
                    // Пробуем через current/max capacity
                    Method getCurrent = battery.getClass().getMethod("getCurrentCapacity");
                    Method getMax = battery.getClass().getMethod("getMaxCapacity");
                    Double current = (Double) getCurrent.invoke(battery);
                    Double max = (Double) getMax.invoke(battery);
                    if (current != null && max != null && max > 0) {
                        return (current / max) * 100;
                    }
                } catch (Exception e3) {
                    // Все методы не сработали
                }
            }
        }
        return 0;
    }

    private long getBatteryTimeRemaining(PowerSource battery) {
        try {
            // Пробуем getTimeRemainingEstimated()
            Method method = battery.getClass().getMethod("getTimeRemainingEstimated");
            Long value = (Long) method.invoke(battery);
            if (value != null && value > 0) {
                return value;
            }
        } catch (Exception e1) {
            try {
                // Пробуем getTimeRemaining()
                Method method = battery.getClass().getMethod("getTimeRemaining");
                Long value = (Long) method.invoke(battery);
                if (value != null && value > 0) {
                    return value;
                }
            } catch (Exception e2) {
                // Ни один метод не сработал
            }
        }
        return 0;
    }
}