package org.alex.everyWeb.modules.repository;

import org.alex.everyWeb.modules.entity.AvailableModule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AvailableModuleRepository extends JpaRepository<AvailableModule, Long> {

    Optional<AvailableModule> findByType(String type);

    List<AvailableModule> findByIsEnabledTrueOrderByDisplayOrderAsc();

    List<AvailableModule> findAllByOrderByDisplayOrderAsc();
}