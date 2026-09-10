package org.alex.everyWeb.page.service;

import org.alex.everyWeb.config.PasswordService;
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
import java.util.Objects;

@Service
@Transactional
public class PageService {

    @Autowired
    private PageRepository pageRepository;

    @Autowired
    private LinkRepository linksRepository;

    @Autowired
    private ModuleRepository modulesRepository;

    @Autowired
    private PasswordService passwordService;

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
        return pageRepository.findAllByOrderByPositionAscIdAsc();
    }

    /**
     * Создает страницу с зашифрованным паролем
     */
    public Page createPage(String name, String rawPassword) {
        if (pageRepository.findByName(name).isPresent()) {
            throw new RuntimeException("Page with name '" + name + "' already exists");
        }

        Page page = new Page();
        page.setName(name);

        List<Page> all = pageRepository.findAllByOrderByPositionAscIdAsc();
        int maxPos = all.stream()
                .map(Page::getPosition)
                .filter(Objects::nonNull)
                .max(Integer::compareTo)
                .orElse(-1);
        page.setPosition(maxPos + 1);

        if (rawPassword != null && !rawPassword.trim().isEmpty()) {
            page.setPassword(passwordService.encodePassword(rawPassword.trim()));
        } else {
            page.setPassword(null);
        }

        return pageRepository.save(page);
    }

    public void movePage(Long pageId, String direction) {
        List<Page> pages = pageRepository.findAllByOrderByPositionAscIdAsc();

        int currentIndex = -1;
        for (int i = 0; i < pages.size(); i++) {
            if (pages.get(i).getId().equals(pageId)) {
                currentIndex = i;
                break;
            }
        }

        if (currentIndex == -1) {
            throw new RuntimeException("Page not found: " + pageId);
        }

        int newIndex = "left".equals(direction) ? currentIndex - 1 : currentIndex + 1;

        if (newIndex < 0 || newIndex >= pages.size()) {
            return; // Уже на краю — ничего не делаем
        }

        // Меняем местами
        Page current = pages.get(currentIndex);
        Page other = pages.get(newIndex);

        Integer tempPos = current.getPosition();
        current.setPosition(other.getPosition());
        other.setPosition(tempPos);

        // Если позиции одинаковые (например, обе null) — присваиваем индексы
        if (Objects.equals(current.getPosition(), other.getPosition())) {
            for (int i = 0; i < pages.size(); i++) {
                pages.get(i).setPosition(i);
            }
        }

        pageRepository.saveAll(pages);
    }

    /**
     * Создает страницу без пароля (для обратной совместимости)
     */
    public Page createPage(String name) {
        return createPage(name, null);
    }

    /**
     * Проверяет пароль страницы
     */
    public boolean verifyPassword(Long pageId, String rawPassword) {
        Page page = getPageById(pageId);
        String storedPassword = page.getPassword();

        // Если пароль не установлен - всегда true
        if (storedPassword == null || storedPassword.isEmpty()) {
            return true;
        }

        // Проверяем пароль через PasswordService
        return passwordService.matches(rawPassword, storedPassword);
    }

    /**
     * Обновляет пароль страницы
     */
    public void updatePassword(Long pageId, String newRawPassword) {
        Page page = getPageById(pageId);

        if (newRawPassword == null || newRawPassword.trim().isEmpty()) {
            page.setPassword(null);
        } else {
            String encryptedPassword = passwordService.encodePassword(newRawPassword.trim());
            page.setPassword(encryptedPassword);
        }

        pageRepository.save(page);
    }

    public void deletePage(Long pageId) {
        linksRepository.deleteByPageId(pageId);
        modulesRepository.deleteByPageId(pageId);
        pageRepository.deleteById(pageId);
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

    public Page updatePage(Long pageId, String newName, String newPassword, boolean removePassword) {
        Page page = getPageById(pageId);

        // Обновление имени
        if (newName != null && !newName.trim().isEmpty() && !newName.equals(page.getName())) {
            if (pageRepository.findByName(newName).isPresent()) {
                throw new RuntimeException("Page with name '" + newName + "' already exists");
            }
            page.setName(newName.trim());
        }

        // Обновление пароля
        if (removePassword) {
            page.setPassword(null);
        } else if (newPassword != null && !newPassword.trim().isEmpty()) {
            page.setPassword(passwordService.encodePassword(newPassword.trim()));
        }

        return pageRepository.save(page);
    }
}