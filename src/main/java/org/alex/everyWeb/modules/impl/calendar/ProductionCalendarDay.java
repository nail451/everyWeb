package org.alex.everyWeb.modules.impl.calendar;

import jakarta.persistence.*;

import java.time.LocalDate;

@Entity
@Table(name = "production_calendar_days",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_production_date",
                columnNames = {"day_date"}
        ))
public class ProductionCalendarDay {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "day_date", nullable = false, unique = true)
    private LocalDate date;

    /**
     * Тип дня:
     * WORKING — рабочий
     * HOLIDAY — выходной/праздник
     * SHORTENED — сокращённый рабочий день
     */
    @Column(name = "day_type", nullable = false, length = 16)
    private String type;

    @Column(name = "country", length = 8)
    private String country = "ru";

    public ProductionCalendarDay() {}

    public ProductionCalendarDay(LocalDate date, String type) {
        this.date = date;
        this.type = type;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }
}