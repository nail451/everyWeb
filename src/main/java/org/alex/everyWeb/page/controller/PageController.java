package org.alex.everyWeb.page.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.alex.everyWeb.link.model.Link;
import org.alex.everyWeb.module.model.Module;
import org.alex.everyWeb.page.model.Page;
import org.alex.everyWeb.page.service.PageService;
import org.alex.everyWeb.wallpaper.service.WallpaperService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.*;
import java.util.stream.Collectors;

@Controller
public class PageController {

    @Autowired
    private PageService pageService;

    @Autowired
    private WallpaperService wallpaperService; // Добавляем WallpaperService

    @GetMapping("/")
    public String home(Model model) {
        try {
            Page page = pageService.getPageByName("main");
            return preparePageModel(page, model);
        } catch (Exception e) {
            Page newPage = pageService.createPage("main");
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

        // ===== ВАЖНО: Проверяем значение showAddLinkButton =====
        Boolean showAdd = page.getShowAddLinkButton();
        model.addAttribute("showAddLinkButton", showAdd != null ? showAdd : true);
        System.out.println("=== PageController: showAddLinkButton = " + (showAdd != null ? showAdd : true));

        // Получаем текущие обои
        String currentWallpaper = null;
        try {
            var wallpaperInfo = wallpaperService.getWallpaperInfo(page.getId());
            currentWallpaper = wallpaperInfo.getCurrentWallpaper();
        } catch (Exception e) {
            // Игнорируем
        }
        model.addAttribute("currentWallpaper", currentWallpaper);

        // Преобразуем ссылки с полными данными
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
}

