package org.alex.everyWeb.wallpaper.repository;

import jakarta.transaction.Transactional;
import org.alex.everyWeb.wallpaper.model.WallpaperSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface WallpaperSettingsRepository extends JpaRepository<WallpaperSettings, Long> {

    Optional<WallpaperSettings> findByPageId(Long pageId);

    @Modifying
    @Transactional
    @Query("DELETE FROM WallpaperSettings ws WHERE ws.page.id = :pageId")
    void deleteByPageId(@Param("pageId") Long pageId);

    boolean existsByPageId(Long pageId);
}
