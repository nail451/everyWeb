package org.alex.everyWeb.page.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.alex.everyWeb.page.model.Page;
import org.alex.everyWeb.page.service.PageService;
import org.alex.everyWeb.wallpaper.service.WallpaperService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.*;
import java.util.stream.Collectors;

@Controller
public class PageController {

    @Autowired
    private PageService pageService;

    @Autowired
    private WallpaperService wallpaperService;

    @GetMapping("/")
    public String home(Model model) {
        try {
            Page page = pageService.getPageByName("main");
            return preparePageModel(page, model);
        } catch (Exception e) {
            Page newPage = pageService.createPage("main");
            addDefaultContent(newPage);
            return preparePageModel(newPage, model);
        }
    }

    @GetMapping("/page/{name}")
    public String getPage(@PathVariable String name, Model model) {
        try {
            Page page = pageService.getPageByName(name);
            return preparePageModel(page, model);
        } catch (Exception e) {
            Page newPage = pageService.createPage(name);
            addDefaultContent(newPage);
            return preparePageModel(newPage, model);
        }
    }

    private String preparePageModel(Page page, Model model) {
        model.addAttribute("page", page);
        model.addAttribute("pages", pageService.getAllPages());

        // Передаем настройки ссылок
        model.addAttribute("linkIconSize", page.getLinkIconSize() != null ? page.getLinkIconSize() : 28);
        model.addAttribute("linkFontSize", page.getLinkFontSize() != null ? page.getLinkFontSize() : 12);
        model.addAttribute("linkBgOpacity", page.getLinkBgOpacity() != null ? page.getLinkBgOpacity() : 15);
        model.addAttribute("linkBgDarkness", page.getLinkBgDarkness() != null ? page.getLinkBgDarkness() : 0);
        model.addAttribute("showAddLinkButton", page.getShowAddLinkButton() != null ? page.getShowAddLinkButton() : true);

        // Получаем текущие обои
        String currentWallpaper = null;
        try {
            var wallpaperInfo = wallpaperService.getWallpaperInfo(page.getId());
            currentWallpaper = wallpaperInfo.getCurrentWallpaper();
        } catch (Exception e) {
            // Игнорируем
        }
        model.addAttribute("currentWallpaper", currentWallpaper);

        // Преобразуем ссылки в JSON для JavaScript
        ObjectMapper mapper = new ObjectMapper();
        try {
            List<Map<String, Object>> linksData = page.getLinks().stream()
                    .map(link -> {
                        Map<String, Object> map = new HashMap<>();
                        map.put("id", link.getId());
                        map.put("title", link.getTitle());
                        map.put("url", link.getUrl());
                        map.put("icon", link.getIcon());
                        map.put("iconType", link.getIconType());
                        map.put("customImage", link.getCustomImage());
                        return map;
                    })
                    .collect(Collectors.toList());
            model.addAttribute("linksJson", mapper.writeValueAsString(linksData));

            // Модули
            List<Map<String, Object>> modulesData = page.getModules().stream()
                    .map(module -> {
                        Map<String, Object> map = new HashMap<>();
                        map.put("id", module.getId());
                        map.put("type", module.getType());
                        map.put("title", module.getTitle());
                        map.put("settings", module.getSettings() != null ? module.getSettings() : "{}");
                        return map;
                    })
                    .collect(Collectors.toList());
            model.addAttribute("modulesJson", mapper.writeValueAsString(modulesData));

        } catch (Exception e) {
            e.printStackTrace();
            model.addAttribute("linksJson", "[]");
            model.addAttribute("modulesJson", "[]");
        }

        return "page";
    }

    private void addDefaultContent(Page page) {
        try {
            pageService.addLink(page.getId(), "Google", "https://google.com", "🔍");
            pageService.addLink(page.getId(), "GitHub", "https://github.com", "🐙");
            pageService.addLink(page.getId(), "YouTube", "https://youtube.com", "▶️");
            pageService.addModule(page.getId(), "CLOCK", "Часы", "{}");
            pageService.addModule(page.getId(), "WEATHER", "Погода", "{\"city\":\"Moscow\"}");
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}