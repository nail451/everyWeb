package org.alex.everyWeb.modules.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.alex.everyWeb.modules.entity.ModuleEntity;
import org.alex.everyWeb.modules.impl.clock.ClockData;
import org.alex.everyWeb.modules.repository.ModuleRepository;
import org.alex.everyWeb.push.PushNotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;

@Service
public class AlarmService {

    @Autowired
    private ModuleRepository moduleRepository;

    @Autowired
    private PushNotificationService pushNotificationService;  // ← ИСПРАВЛЕНО

    // ===== СОЗДАЕМ СВОЙ OBJECT MAPPER =====
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Scheduled(fixedDelay = 60000)
    public void checkAllAlarms() {
        try {
            List<ModuleEntity> clockModules = moduleRepository.findByType("CLOCK");

            for (ModuleEntity entity : clockModules) {
                try {
                    checkAlarmsForModule(entity);
                } catch (Exception e) {
                    System.err.println("Error checking alarms for module " + entity.getId() + ": " + e.getMessage());
                }
            }
        } catch (Exception e) {
            System.err.println("Error in alarm check: " + e.getMessage());
        }
    }

    private void checkAlarmsForModule(ModuleEntity entity) {
        if (entity.getSettings() == null || entity.getSettings().isEmpty()) {
            return;
        }

        try {
            Map<String, Object> settings = objectMapper.readValue(
                    entity.getSettings(),
                    new TypeReference<Map<String, Object>>() {}
            );

            String clockDataJson = null;
            Object clockDataObj = settings.get("clockData");

            if (clockDataObj instanceof String) {
                clockDataJson = (String) clockDataObj;
            } else if (clockDataObj instanceof Map) {
                clockDataJson = objectMapper.writeValueAsString(clockDataObj);
            }

            if (clockDataJson == null) {
                return;
            }

            ClockData clockData = objectMapper.readValue(clockDataJson, ClockData.class);

            if (clockData.getAlarms() == null || clockData.getAlarms().isEmpty()) {
                return;
            }

            ZoneId zoneId;
            try {
                zoneId = ZoneId.of(clockData.getTimezone());
            } catch (Exception e) {
                zoneId = ZoneId.systemDefault();
            }

            LocalDateTime now = LocalDateTime.now(zoneId);
            String currentTime = now.toLocalTime().toString().substring(0, 5);

            for (ClockData.Alarm alarm : clockData.getAlarms()) {
                if (!alarm.isEnabled()) continue;

                if (alarm.getRepeatDays() != null && !alarm.getRepeatDays().isEmpty()) {
                    DayOfWeek today = now.getDayOfWeek();
                    if (!alarm.getRepeatDays().contains(today)) {
                        continue;
                    }
                }

                if (alarm.getTime() != null && alarm.getTime().equals(currentTime)) {
                    triggerAlarm(entity.getId(), alarm);
                }
            }
        } catch (Exception e) {
            System.err.println("Error parsing clock data for module " + entity.getId() + ": " + e.getMessage());
        }
    }

    private void triggerAlarm(Long moduleId, ClockData.Alarm alarm) {
        System.out.println("🔔 ALARM TRIGGERED: " + alarm.getName() + " at " + alarm.getTime());
        System.out.println("   Module ID: " + moduleId);
        System.out.println("   Repeat days: " + alarm.getRepeatDaysDisplay());
        System.out.println("   Interval: " + alarm.getIntervalDisplay());

        // ===== ОТПРАВЛЯЕМ PUSH УВЕДОМЛЕНИЕ =====
        try {
            pushNotificationService.sendAlarmNotification(moduleId, alarm.getName(), alarm.getTime());
            System.out.println("✅ Push notification sent for alarm: " + alarm.getName());
        } catch (Exception e) {
            System.err.println("❌ Failed to send push notification: " + e.getMessage());
            e.printStackTrace();
        }
    }
}