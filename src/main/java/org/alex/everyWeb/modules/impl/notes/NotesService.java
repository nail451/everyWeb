package org.alex.everyWeb.modules.impl.notes;

import org.alex.everyWeb.modules.entity.ModuleEntity;
import org.alex.everyWeb.modules.repository.ModuleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;

@Service
@Transactional
public class NotesService {

    @Autowired
    private NoteRepository noteRepository;

    @Autowired
    private CalendarNoteRepository calendarNoteRepository;

    @Autowired
    private ModuleRepository moduleRepository;

    // ===== ПОСТОЯННЫЕ ЗАМЕТКИ =====

    public String getNoteText(Long moduleId) {
        return noteRepository.findByModuleId(moduleId)
                .map(Note::getText)
                .orElse("");
    }

    public String saveNoteText(Long moduleId, String text) {
        ModuleEntity module = moduleRepository.findById(moduleId)
                .orElseThrow(() -> new RuntimeException("Module not found: " + moduleId));

        if (!"NOTES".equals(module.getType())) {
            throw new RuntimeException("Module is not NOTES: " + module.getType());
        }

        Note note = noteRepository.findByModuleId(moduleId)
                .orElseGet(() -> new Note(module));

        note.setText(text != null ? text : "");
        noteRepository.save(note);
        return note.getText();
    }

    // ===== ЗАМЕТКИ НА ДАТУ =====

    public String getCalendarNoteText(Long calendarModuleId, LocalDate date) {
        return calendarNoteRepository
                .findByCalendarModuleIdAndDate(calendarModuleId, date)
                .map(CalendarNote::getText)
                .orElse("");
    }

    public String saveCalendarNoteText(Long calendarModuleId, LocalDate date, String text) {
        ModuleEntity module = moduleRepository.findById(calendarModuleId)
                .orElseThrow(() -> new RuntimeException("Module not found: " + calendarModuleId));

        if (text == null || text.trim().isEmpty()) {
            calendarNoteRepository
                    .findByCalendarModuleIdAndDate(calendarModuleId, date)
                    .ifPresent(calendarNoteRepository::delete);
            return "";
        }

        CalendarNote note = calendarNoteRepository
                .findByCalendarModuleIdAndDate(calendarModuleId, date)
                .orElseGet(() -> new CalendarNote(module, date));

        note.setText(text);
        calendarNoteRepository.save(note);
        return note.getText();
    }

    public List<LocalDate> getDatesWithNotes(Long calendarModuleId, LocalDate from, LocalDate to) {
        if (from == null || to == null || from.isAfter(to)) {
            return Collections.emptyList();
        }
        return calendarNoteRepository.findDatesWithNotesBetween(calendarModuleId, from, to);
    }

    public boolean hasNoteOnDate(Long calendarModuleId, LocalDate date) {
        return calendarNoteRepository.existsNoteOnDate(calendarModuleId, date);
    }
}