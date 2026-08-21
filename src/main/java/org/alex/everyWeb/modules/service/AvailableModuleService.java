package org.alex.everyWeb.modules.service;

import org.alex.everyWeb.modules.entity.AvailableModule;
import org.alex.everyWeb.modules.repository.AvailableModuleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class AvailableModuleService {

    @Autowired
    private AvailableModuleRepository availableModuleRepository;

    public List<AvailableModule> getAvailableModules() {
        return availableModuleRepository.findByIsEnabledTrueOrderByDisplayOrderAsc();
    }

    public List<AvailableModule> getAllModules() {
        return availableModuleRepository.findAllByOrderByDisplayOrderAsc();
    }

    public AvailableModule getModuleByType(String type) {
        return availableModuleRepository.findByType(type)
                .orElseThrow(() -> new RuntimeException("Module not found: " + type));
    }

    public AvailableModule addAvailableModule(AvailableModule module) {
        return availableModuleRepository.save(module);
    }

    public AvailableModule updateAvailableModule(Long id, AvailableModule module) {
        AvailableModule existing = availableModuleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Module not found: " + id));

        existing.setName(module.getName());
        existing.setDescription(module.getDescription());
        existing.setIcon(module.getIcon());
        existing.setCssClass(module.getCssClass());
        existing.setIsEnabled(module.getIsEnabled());
        existing.setIsConfigurable(module.getIsConfigurable());
        existing.setJsFile(module.getJsFile());
        existing.setVersion(module.getVersion());
        existing.setAuthor(module.getAuthor());
        existing.setDisplayOrder(module.getDisplayOrder());

        return availableModuleRepository.save(existing);
    }

    public void deleteAvailableModule(Long id) {
        availableModuleRepository.deleteById(id);
    }
}