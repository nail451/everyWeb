package org.alex.everyWeb.page.repository;

import org.alex.everyWeb.page.entity.PageLayout;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PageLayoutRepository extends JpaRepository<PageLayout, Long> {
    Optional<PageLayout> findByPageId(Long pageId);
}