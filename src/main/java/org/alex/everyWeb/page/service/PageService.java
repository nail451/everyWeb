package org.alex.everyWeb.page.service;

import jakarta.transaction.Transactional;
import org.alex.everyWeb.module.model.Module;
import org.alex.everyWeb.module.repository.ModuleRepository;
import org.alex.everyWeb.page.model.Page;
import org.alex.everyWeb.page.repository.PageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;


@Service
@Transactional
public class PageService {

    @Autowired
    private PageRepository pageRepository;

    @Autowired
    private ModuleRepository moduleRepository;

    // ===== СТРАНИЦЫ =====
    public Page getPageByName(String name) {
        return pageRepository.findByName(name)
                .orElseThrow(() -> new RuntimeException("Page not found: " + name));
    }

    public Page getPageById(Long id) {
        return pageRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Page not found: " + id));
    }

    public List<Page> getAllPages() {
        return pageRepository.findAll();
    }

    public Page createPage(String name) {
        if (pageRepository.findByName(name).isPresent()) {
            throw new RuntimeException("Page with name '" + name + "' already exists");
        }
        Page page = new Page();
        page.setName(name);
        return pageRepository.save(page);
    }

    public void deletePage(Long pageId) {
        pageRepository.deleteById(pageId);
    }

    // ===== МОДУЛИ =====
    public Module addModule(Long pageId, String type, String title, String settings) {
        Page page = getPageById(pageId);

        Module module = new Module();
        module.setType(type);
        module.setTitle(title);
        module.setSettings(settings != null ? settings : "{}");
        module.setPage(page);
        module.setPosition(moduleRepository.findByPageIdOrderByPosition(pageId).size());

        return moduleRepository.save(module);
    }

    public Module updateModule(Long moduleId, String title, String settings) {
        Module module = moduleRepository.findById(moduleId)
                .orElseThrow(() -> new RuntimeException("Module not found: " + moduleId));

        if (title != null && !title.trim().isEmpty()) {
            module.setTitle(title.trim());
        }
        if (settings != null) {
            module.setSettings(settings);
        }

        return moduleRepository.save(module);
    }

    public void deleteModule(Long moduleId) {
        moduleRepository.deleteById(moduleId);
    }

    public List<Module> getModulesByPageId(Long pageId) {
        return moduleRepository.findByPageIdOrderByPosition(pageId);
    }

    public void reorderModules(Long pageId, List<Long> moduleIds) {
        List<Module> modules = moduleRepository.findByPageIdOrderByPosition(pageId);
        Map<Long, Module> moduleMap = new HashMap<>();
        for (Module m : modules) {
            moduleMap.put(m.getId(), m);
        }

        for (int i = 0; i < moduleIds.size(); i++) {
            Module module = moduleMap.get(moduleIds.get(i));
            if (module != null) {
                module.setPosition(i);
                moduleRepository.save(module);
            }
        }
    }

    public Page updateLinkSettings(Long pageId, Integer iconSize, Integer fontSize,
                                   Integer bgOpacity, Integer bgDarkness) {
        Page page = getPageById(pageId);

        if (iconSize != null && iconSize >= 16 && iconSize <= 100) {
            page.setLinkIconSize(iconSize);
        }
        if (fontSize != null && fontSize >= 8 && fontSize <= 24) {
            page.setLinkFontSize(fontSize);
        }
        if (bgOpacity != null && bgOpacity >= 0 && bgOpacity <= 100) {
            page.setLinkBgOpacity(bgOpacity);
        }
        if (bgDarkness != null && bgDarkness >= -50 && bgDarkness <= 50) {
            page.setLinkBgDarkness(bgDarkness);
        }

        // ВАЖНО: Сохраняем и возвращаем страницу
        Page savedPage = pageRepository.save(page);
        System.out.println("Saved link settings: iconSize=" + savedPage.getLinkIconSize() +
                ", showAddLinkButton=" + savedPage.getShowAddLinkButton());
        return savedPage;
    }

    public Page updateShowAddLinkButton(Long pageId, Boolean show) {
        Page page = getPageById(pageId);
        page.setShowAddLinkButton(show != null ? show : true);
        return pageRepository.save(page);
    }
}