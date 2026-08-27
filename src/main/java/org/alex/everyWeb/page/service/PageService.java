package org.alex.everyWeb.page.service;

import org.alex.everyWeb.link.model.Link;
import org.alex.everyWeb.link.repository.LinkRepository;
import org.alex.everyWeb.modules.entity.ModuleEntity;
import org.alex.everyWeb.modules.repository.ModuleRepository;
import org.alex.everyWeb.page.entity.Page;
import org.alex.everyWeb.page.repository.PageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class PageService {

    @Autowired
    private PageRepository pageRepository;

    @Autowired
    private LinkRepository linksRepository;

    @Autowired
    private ModuleRepository modulesRepository;

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
        // Удаляем связанные ссылки
        linksRepository.deleteByPageId(pageId);
        // Удаляем связанные модули
        modulesRepository.deleteByPageId(pageId);
        // Удаляем страницу
        pageRepository.deleteById(pageId);
    }

    // ===== ССЫЛКИ (для обратной совместимости, делегируем LinksService) =====
    public Link addLink(Long pageId, String title, String url, String icon) {
        Page page = getPageById(pageId);
        Link link = new Link();
        link.setTitle(title);
        link.setUrl(url);
        link.setIcon(icon != null ? icon : "🔗");
        link.setIconType("emoji");
        link.setCustomImage(null);
        link.setPage(page);

        Integer maxPosition = linksRepository.findMaxPositionByPageId(pageId);
        link.setPosition(maxPosition != null ? maxPosition + 1 : 0);

        return linksRepository.save(link);
    }

    // ===== МОДУЛИ =====
    public ModuleEntity addModule(Long pageId, String type, String title, String settings) {
        Page page = getPageById(pageId);

        ModuleEntity module = new ModuleEntity();
        module.setType(type);
        module.setTitle(title);
        module.setSettings(settings != null ? settings : "{}");
        module.setIsActive(true);
        module.setPage(page);

        Integer maxPosition = modulesRepository.findMaxPositionByPageId(pageId);
        module.setPosition(maxPosition != null ? maxPosition + 1 : 0);

        return modulesRepository.save(module);
    }

    public ModuleEntity updateModule(Long moduleId, String title, String settings) {
        ModuleEntity module = modulesRepository.findById(moduleId)
                .orElseThrow(() -> new RuntimeException("Module not found: " + moduleId));

        if (title != null && !title.trim().isEmpty()) {
            module.setTitle(title.trim());
        }
        if (settings != null) {
            module.setSettings(settings);
        }

        return modulesRepository.save(module);
    }

    public void deleteModule(Long moduleId) {
        modulesRepository.deleteById(moduleId);
    }

    public List<ModuleEntity> getModulesByPageId(Long pageId) {
        return modulesRepository.findByPageIdOrderByPositionAsc(pageId);
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

    // ===== НАСТРОЙКИ ССЫЛОК =====
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

        return pageRepository.save(page);
    }

    public Page updateShowAddLinkButton(Long pageId, Boolean show) {
        Page page = getPageById(pageId);
        page.setShowAddLinkButton(show != null ? show : true);
        return pageRepository.save(page);
    }
}