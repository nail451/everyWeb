package org.alex.everyWeb;


import org.alex.everyWeb.link.service.LinksService;
import org.alex.everyWeb.page.model.Page;
import org.alex.everyWeb.page.service.PageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private PageService pageService;

    @Autowired
    private LinksService linksService;

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
            pageService.addModule(mainPage.getId(), "WEATHER", "Погода", "{\"city\":\"Moscow\"}");
            pageService.addModule(mainPage.getId(), "NOTES", "Заметки", "{}");
            pageService.addModule(mainPage.getId(), "CLOCK", "Часы", "{}");
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
}
