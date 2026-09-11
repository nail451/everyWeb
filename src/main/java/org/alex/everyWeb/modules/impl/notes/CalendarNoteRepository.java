package org.alex.everyWeb.modules.impl.notes;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface CalendarNoteRepository extends JpaRepository<CalendarNote, Long> {

    Optional<CalendarNote> findByCalendarModuleIdAndDate(Long calendarModuleId, LocalDate date);

    @Query("SELECT cn.date FROM CalendarNote cn " +
            "WHERE cn.calendarModule.id = :calendarModuleId " +
            "AND cn.date BETWEEN :from AND :to " +
            "AND cn.text IS NOT NULL AND cn.text <> ''")
    List<LocalDate> findDatesWithNotesBetween(
            @Param("calendarModuleId") Long calendarModuleId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to
    );

    @Query("SELECT COUNT(cn) > 0 FROM CalendarNote cn " +
            "WHERE cn.calendarModule.id = :calendarModuleId " +
            "AND cn.date = :date " +
            "AND cn.text IS NOT NULL AND cn.text <> ''")
    boolean existsNoteOnDate(
            @Param("calendarModuleId") Long calendarModuleId,
            @Param("date") LocalDate date
    );

    @Query("SELECT DISTINCT m.page.id FROM ModuleEntity m, CalendarNote cn " +
            "WHERE cn.calendarModule = m AND cn.date = :date " +
            "AND cn.text IS NOT NULL AND cn.text <> ''")
    List<Long> findPageIdsWithNoteOnDate(@Param("date") LocalDate date);
}