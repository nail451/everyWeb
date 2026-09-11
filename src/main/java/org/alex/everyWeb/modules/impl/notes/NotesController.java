package org.alex.everyWeb.modules.impl.notes;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class NotesController {

    @Autowired
    private NotesService notesService;

    // ===== ПОСТОЯННЫЕ ЗАМЕТКИ =====

    @GetMapping("/notes/{moduleId}")
    public ResponseEntity<?> getNote(@PathVariable Long moduleId) {
        try {
            String text = notesService.getNoteText(moduleId);
            return ResponseEntity.ok(Map.of("text", text));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/notes/{moduleId}")
    public ResponseEntity<?> saveNote(@PathVariable Long moduleId,
                                      @RequestBody Map<String, String> body) {
        try {
            String text = body.getOrDefault("text", "");
            String saved = notesService.saveNoteText(moduleId, text);
            return ResponseEntity.ok(Map.of("text", saved));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ===== ЗАМЕТКИ НА ДАТУ =====

    @GetMapping("/calendar-notes/{calendarModuleId}/{date}")
    public ResponseEntity<?> getCalendarNote(
            @PathVariable Long calendarModuleId,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        try {
            String text = notesService.getCalendarNoteText(calendarModuleId, date);
            return ResponseEntity.ok(Map.of(
                    "date", date.toString(),
                    "text", text
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/calendar-notes/{calendarModuleId}/{date}")
    public ResponseEntity<?> saveCalendarNote(
            @PathVariable Long calendarModuleId,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestBody Map<String, String> body) {
        try {
            String text = body.getOrDefault("text", "");
            String saved = notesService.saveCalendarNoteText(calendarModuleId, date, text);
            return ResponseEntity.ok(Map.of(
                    "date", date.toString(),
                    "text", saved
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ===== ДАТЫ С ЗАМЕТКАМИ (для подсветки в календаре) =====

    @GetMapping("/calendar-notes/{calendarModuleId}/dates")
    public ResponseEntity<?> getDatesWithNotes(
            @PathVariable Long calendarModuleId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        try {
            List<LocalDate> dates = notesService.getDatesWithNotes(calendarModuleId, from, to);
            Map<String, Object> response = new HashMap<>();
            response.put("dates", dates.stream().map(LocalDate::toString).toList());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}