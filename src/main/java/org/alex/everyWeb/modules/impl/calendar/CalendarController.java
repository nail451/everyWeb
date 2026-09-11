package org.alex.everyWeb.modules.impl.calendar;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/calendar")
public class CalendarController {

    @Autowired
    private ProductionCalendarService productionCalendarService;

    /**
     * Получить производственные дни в диапазоне.
     * GET /api/calendar/production?from=2026-09-01&to=2026-09-30
     */
    @GetMapping("/production")
    public ResponseEntity<?> getProductionDays(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        try {
            List<ProductionCalendarDay> days = productionCalendarService.getDaysInRange(from, to);

            // Формируем map: { "2026-09-01": "WORKING", ... }
            Map<String, String> result = new HashMap<>();
            for (ProductionCalendarDay day : days) {
                result.put(day.getDate().toString(), day.getType());
            }

            return ResponseEntity.ok(Map.of("days", result));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}