package org.alex.everyWeb.modules.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.alex.everyWeb.modules.repository.DTO.ModuleDTO;
import org.alex.everyWeb.modules.repository.DTO.ModuleResponseDTO;
import org.alex.everyWeb.modules.entity.ModuleEntity;
import org.alex.everyWeb.modules.repository.ModuleRepository;
import org.alex.everyWeb.page.model.Page;
import org.alex.everyWeb.page.repository.PageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class ModulesService {

    @Autowired
    private ModuleRepository modulesRepository;

    @Autowired
    private PageRepository pageRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public ModuleResponseDTO addModule(Long pageId, String type, String title, String settings, Boolean isActive) {
        Page page = pageRepository.findById(pageId)
                .orElseThrow(() -> new RuntimeException("Page not found: " + pageId));

        ModuleEntity module = new ModuleEntity();
        module.setType(type);
        module.setTitle(title);
        module.setSettings(settings != null ? settings : "{}");
        module.setIsActive(isActive != null ? isActive : true);
        module.setPage(page);

        Integer maxPosition = modulesRepository.findMaxPositionByPageId(pageId);
        module.setPosition(maxPosition != null ? maxPosition + 1 : 0);

        ModuleEntity savedModule = modulesRepository.save(module);
        return convertToResponseDTO(savedModule);
    }

    public ModuleResponseDTO updateModule(Long moduleId, String title, String settings, Boolean isActive) {
        ModuleEntity module = modulesRepository.findById(moduleId)
                .orElseThrow(() -> new RuntimeException("Module not found: " + moduleId));

        if (title != null && !title.trim().isEmpty()) {
            module.setTitle(title.trim());
        }
        if (settings != null) {
            module.setSettings(settings);
        }
        if (isActive != null) {
            module.setIsActive(isActive);
        }

        ModuleEntity updatedModule = modulesRepository.save(module);
        return convertToResponseDTO(updatedModule);
    }

    public void deleteModule(Long moduleId) {
        modulesRepository.deleteById(moduleId);
    }

    public ModuleEntity getModuleById(Long moduleId) {
        return modulesRepository.findById(moduleId)
                .orElse(null);
    }

    public List<ModuleDTO> getModulesByPageId(Long pageId) {
        return modulesRepository.findByPageIdOrderByPositionAsc(pageId)
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public List<ModuleDTO> getActiveModulesByPageId(Long pageId) {
        return modulesRepository.findByPageIdAndIsActiveTrueOrderByPositionAsc(pageId)
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public void reorderModules(Long pageId, List<Long> moduleIds) {
        List<ModuleEntity> modules = modulesRepository.findByPageIdOrderByPositionAsc(pageId);
        for (int i = 0; i < moduleIds.size(); i++) {
            final int position = i;
            ModuleEntity module = modules.stream()
                    .filter(m -> m.getId().equals(moduleIds.get(position)))
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException("Module not found"));
            module.setPosition(position);
            modulesRepository.save(module);
        }
    }

    private ModuleDTO convertToDTO(ModuleEntity module) {
        ModuleDTO dto = new ModuleDTO();
        dto.setId(module.getId());
        dto.setType(module.getType());
        dto.setTitle(module.getTitle());
        dto.setSettings(module.getSettings());
        dto.setPosition(module.getPosition());
        dto.setIsActive(module.getIsActive());
        return dto;
    }

    private ModuleResponseDTO convertToResponseDTO(ModuleEntity module) {
        ModuleResponseDTO dto = new ModuleResponseDTO();
        dto.setId(module.getId());
        dto.setType(module.getType());
        dto.setTitle(module.getTitle());
        dto.setSettings(module.getSettings());
        dto.setPosition(module.getPosition());
        dto.setIsActive(module.getIsActive());
        dto.setPageId(module.getPage().getId());
        return dto;
    }
}