package org.alex.everyWeb.modules.impl.calendar;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface ProductionCalendarDayRepository extends JpaRepository<ProductionCalendarDay, Long> {

    List<ProductionCalendarDay> findByDateBetween(LocalDate from, LocalDate to);

    @Query("SELECT COUNT(p) FROM ProductionCalendarDay p WHERE YEAR(p.date) = :year")
    long countByYear(@Param("year") int year);

    @Query("SELECT p FROM ProductionCalendarDay p WHERE p.date BETWEEN :from AND :to")
    List<ProductionCalendarDay> findInRange(@Param("from") LocalDate from,
                                            @Param("to") LocalDate to);
}