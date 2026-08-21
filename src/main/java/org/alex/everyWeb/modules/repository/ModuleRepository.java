package org.alex.everyWeb.modules.repository;

import org.alex.everyWeb.modules.entity.ModuleEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface ModuleRepository extends JpaRepository<ModuleEntity, Long> {

    List<ModuleEntity> findByPageIdOrderByPositionAsc(Long pageId);

    List<ModuleEntity> findByPageIdAndIsActiveTrueOrderByPositionAsc(Long pageId);

    @Modifying
    @Transactional
    @Query("DELETE FROM ModuleEntity m WHERE m.page.id = :pageId")
    void deleteByPageId(@Param("pageId") Long pageId);

    @Query("SELECT MAX(m.position) FROM ModuleEntity m WHERE m.page.id = :pageId")
    Integer findMaxPositionByPageId(@Param("pageId") Long pageId);
}