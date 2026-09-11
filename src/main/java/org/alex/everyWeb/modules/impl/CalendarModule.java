package org.alex.everyWeb.modules.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.alex.everyWeb.modules.api.ModuleConfig;
import org.alex.everyWeb.modules.api.ModuleData;
import org.alex.everyWeb.modules.api.ModuleInfo;
import org.alex.everyWeb.modules.core.Module;
import org.alex.everyWeb.modules.impl.calendar.CalendarData;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Component
public class CalendarModule extends Module {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public ModuleInfo getInfo() {
        ModuleInfo info = new ModuleInfo();
        info.setType("CALENDAR");
        info.setName("Календарь");
        info.setDescription("Месяц с навигацией и заметками по дням");
        info.setIcon("📅");
        info.setVersion("1.0.0");
        info.setAuthor("System");
        info.setEnabled(true);
        info.setConfigurable(true);
        info.setCssClass("calendar-module");
        return info;
    }

    @Override
    public ModuleData createData(ModuleConfig config) {
        ModuleData data = new ModuleData("CALENDAR", "Календарь");

        Map<String, Object> content = new HashMap<>();
        content.put("calendarData", buildCalendarData(config));

        data.setContent(content);
        data.setConfig(config);
        return data;
    }

    @Override
    public Object handleAction(String action, Map<String, Object> params, ModuleConfig config) {
        if ("updateSettings".equals(action)) {
            return handleUpdateSettings(params, config);
        }
        return null;
    }

    private Object handleUpdateSettings(Map<String, Object> params, ModuleConfig config) {
        // linkedToNotes — boolean
        Object prodRaw = params.get("showProductionCalendar");
        if (prodRaw instanceof Boolean) {
            config.put("showProductionCalendar", prodRaw);
        }

        return buildModuleData(config);
    }

    private ModuleData buildModuleData(ModuleConfig config) {
        ModuleData data = new ModuleData("CALENDAR", "Календарь");
        Map<String, Object> content = new HashMap<>();
        content.put("calendarData", buildCalendarData(config));
        data.setContent(content);
        data.setConfig(config);
        return data;
    }

    private CalendarData buildCalendarData(ModuleConfig config) {
        CalendarData calendarData = new CalendarData();
        calendarData.setFirstDayOfWeek("MONDAY");

        Object linked = config.get("linkedToNotes");
        boolean linkedToNotes = false;
        if (linked instanceof Boolean) linkedToNotes = (Boolean) linked;
        else if (linked instanceof String) linkedToNotes = "true".equalsIgnoreCase((String) linked);
        calendarData.setLinkedToNotes(linkedToNotes);

        Object prod = config.get("showProductionCalendar");
        boolean showProd = false;
        if (prod instanceof Boolean) showProd = (Boolean) prod;
        else if (prod instanceof String) showProd = "true".equalsIgnoreCase((String) prod);
        calendarData.setShowProductionCalendar(showProd);

        return calendarData;
    }
}