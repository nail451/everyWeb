package org.alex.everyWeb.page.repository;

import org.alex.everyWeb.page.entity.Page;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PageRepository extends JpaRepository<Page, Long> {
    Optional<Page> findByName(String name);

    List<Page> findAllByOrderByPositionAscIdAsc();
}
