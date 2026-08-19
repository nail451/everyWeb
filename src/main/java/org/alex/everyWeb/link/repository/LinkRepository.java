package org.alex.everyWeb.link.repository;

import jakarta.transaction.Transactional;
import org.alex.everyWeb.link.model.Link;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LinkRepository extends JpaRepository<Link, Long> {

    List<Link> findByPageIdOrderByPositionAsc(Long pageId);

    Optional<Link> findByIdAndPageId(Long id, Long pageId);

    @Modifying
    @Transactional
    @Query("DELETE FROM Link l WHERE l.page.id = :pageId")
    void deleteByPageId(@Param("pageId") Long pageId);

    @Query("SELECT MAX(l.position) FROM Link l WHERE l.page.id = :pageId")
    Integer findMaxPositionByPageId(@Param("pageId") Long pageId);
}