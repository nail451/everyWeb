package org.alex.everyWeb;


import org.alex.everyWeb.link.service.LinksService;
import org.alex.everyWeb.modules.entity.AvailableModule;
import org.alex.everyWeb.modules.service.AvailableModuleService;
import org.alex.everyWeb.page.entity.Page;
import org.alex.everyWeb.page.service.PageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private PageService pageService;

    @Autowired
    private LinksService linksService;

    @Autowired
    private AvailableModuleService availableModuleService;

    @Override
    public void run(String... args) throws Exception {
        // Проверяем, есть ли уже страницы
        try {
            Page existingPage = pageService.getPageByName("main");
            System.out.println("✅ Данные уже инициализированы, пропускаем...");
            return;
        } catch (Exception e) {
            System.out.println("🔄 Инициализация данных...");
        }

        try {
            // Создаем главную страницу
            Page mainPage = pageService.createPage("main");
            System.out.println("✅ Создана страница: main");

            // Добавляем ссылки на главную страницу
            linksService.addLink(mainPage.getId(), "Google", "https://google.com", "🔍");
            linksService.addLink(mainPage.getId(), "GitHub", "https://github.com", "🐙");
            linksService.addLink(mainPage.getId(), "YouTube", "https://youtube.com", "▶️");
            linksService.addLink(mainPage.getId(), "Habr", "https://habr.com", "📰");
            System.out.println("✅ Добавлены ссылки на главную страницу");

            // Добавляем модули на главную страницу
            initAvailableModules();
            System.out.println("✅ Добавлены модули на главную страницу");

            // Создаем вторую страницу
            Page workPage = pageService.createPage("work");
            System.out.println("✅ Создана страница: work");

            // Добавляем ссылки на страницу work
            linksService.addLink(workPage.getId(), "Jira", "https://jira.company.com", "📋");
            linksService.addLink(workPage.getId(), "Confluence", "https://confluence.company.com", "📚");
            linksService.addLink(workPage.getId(), "Figma", "https://figma.com", "🎨");
            System.out.println("✅ Добавлены ссылки на страницу work");

            // Добавляем модули на страницу work
            pageService.addModule(workPage.getId(), "CALENDAR", "Календарь", "{}");
            pageService.addModule(workPage.getId(), "TODO", "Задачи", "{}");
            System.out.println("✅ Добавлены модули на страницу work");

            System.out.println("✅ Инициализация данных завершена успешно!");

        } catch (Exception e) {
            System.err.println("❌ Ошибка при инициализации данных: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private void initAvailableModules() {
        // Проверяем, есть ли уже модули
        if (!availableModuleService.getAllModules().isEmpty()) {
            System.out.println("✅ Модули уже инициализированы, пропускаем...");
            return;
        }

        System.out.println("🔄 Инициализация модулей...");

        List<AvailableModule> modules = Arrays.asList(
                createModule("NEXTCLOUD", "Nextcloud", "Интеграция с Nextcloud - просмотр файлов и хранилища", "☁️",
                        "nextcloud-module", true, true, "nextcloud-module.js"),
                createModule("WEATHER", "Погода", "Показывает погоду в выбранном городе", "🌤️",
                        "weather-module", true, true, "weather-module.js"),
                createModule("NOTES", "Заметки", "Быстрые заметки", "📝",
                        "notes-module", true, false, "notes-module.js"),
                createModule("CLOCK", "Часы", "Многофункциональные часы с поддержкой нескольких часовых поясов", "🕐",
                        "clock-module", true, true, "clock-module.js"),
                createModule("CALENDAR", "Календарь", "Календарь с событиями", "📅",
                        "calendar-module", true, true, "calendar-module.js"),
                createModule("TODO", "Список дел", "To-Do список", "✅",
                        "todo-module", true, false, "todo-module.js"),
                createModule("RSS", "RSS лента", "Новости из RSS", "📰",
                        "rss-module", false, true, "rss-module.js"),
                createModule("QUOTE", "Цитата дня", "Вдохновляющие цитаты", "💭",
                        "quote-module", true, false, "quote-module.js"),
                createModule("COUNTER", "Счетчик", "Простой счетчик", "🔢",
                        "counter-module", true, false, "counter-module.js")
        );

        for (AvailableModule module : modules) {
            availableModuleService.addAvailableModule(module);
        }

        System.out.println("✅ Инициализация модулей завершена");
    }

    private AvailableModule createModule(String type, String name, String description, String icon,
                                         String cssClass, boolean enabled, boolean configurable, String jsFile) {
        AvailableModule module = new AvailableModule();
        module.setType(type);
        module.setName(name);
        module.setDescription(description);
        module.setIcon(icon);
        module.setCssClass(cssClass);
        module.setIsEnabled(enabled);
        module.setIsConfigurable(configurable);
        module.setJsFile(jsFile);
        return module;
    }
}
