package org.alex.everyWeb.modules.impl.notes;

import jakarta.persistence.*;
import org.alex.everyWeb.modules.entity.ModuleEntity;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "calendar_notes",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_calendar_module_date",
                columnNames = {"calendar_module_id", "note_date"}
        ))
public class CalendarNote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "calendar_module_id", nullable = false)
    private ModuleEntity calendarModule;

    @Column(name = "note_date", nullable = false)
    private LocalDate date;

    @Column(columnDefinition = "TEXT")
    private String text;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    public CalendarNote() {}

    public CalendarNote(ModuleEntity calendarModule, LocalDate date) {
        this.calendarModule = calendarModule;
        this.date = date;
        this.text = "";
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public ModuleEntity getCalendarModule() { return calendarModule; }
    public void setCalendarModule(ModuleEntity calendarModule) { this.calendarModule = calendarModule; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public String getText() { return text; }
    public void setText(String text) { this.text = text; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    @PreUpdate
    @PrePersist
    public void touch() {
        this.updatedAt = LocalDateTime.now();
    }
}