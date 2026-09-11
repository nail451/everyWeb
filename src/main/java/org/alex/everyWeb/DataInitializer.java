package org.alex.everyWeb;

import org.alex.everyWeb.modules.entity.AvailableModule;
import org.alex.everyWeb.modules.repository.AvailableModuleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private AvailableModuleRepository availableModuleRepository;

    @Override
    public void run(String... args) throws Exception {
        initializeAvailableModules();
    }

    private void initializeAvailableModules() {
        // type, name, description, icon, enabled, configurable, cssClass, jsFile, rowSpan, colSpan
        Object[][] defs = {
                { "LINK",      "Ссылки",     "Отображение ссылок",                        "🔗", true, true,  "link-widget",      "link-module.js",      2, 2 },
                { "CLOCK",     "Часы",       "Многофункциональные часы",                  "🕐", true, true,  "clock-module",     "clock-module.js",     1, 1 },
                { "WEATHER",   "Погода",     "Погода в выбранном городе",                 "🌤️", true, true,  "weather-module",   "weather-module.js",   2, 1 },
                { "NEXTCLOUD", "Nextcloud",  "Интеграция с Nextcloud",                    "☁️", true, true,  "nextcloud-module", "nextcloud-module.js", 2, 1 },
                { "NOTES",     "Заметки",    "Быстрые заметки",                           "📝", true, false, "notes-module",     "notes-module.js",     1, 1 },
                { "TODO",      "Список дел", "To-Do список",                              "✅", true, false, "todo-module",      "todo-module.js",      1, 1 },
                { "CPU",       "Процессор",  "Загрузка процессора и информация о ядрах",  "📊", true, true,  "cpu-module",       "system-modules.js",   2, 1 },
                { "MEMORY",    "Память",     "Использование оперативной памяти",          "🧠", true, true,  "memory-module",    "system-modules.js",   1, 1 },
                { "DISK",      "Диски",      "Информация о дисках и свободном месте",     "💾", true, true,  "disk-module",      "system-modules.js",   2, 1 },
                { "NETWORK",   "Сеть",       "Скорость сети и информация об интерфейсах", "🌐", true, true,  "network-module",   "system-modules.js",   1, 1 },
                { "BATTERY",   "Батарея",    "Состояние батареи и заряд",                 "🔋", true, true,  "battery-module",   "system-modules.js",   1, 1 },
                { "CALENDAR",  "Календарь",  "Месяц с навигацией",                        "📅", true, true,  "calendar-module",  "calendar-module.js",  2, 1 }
        };

        for (Object[] d : defs) {
            String type = (String) d[0];
            AvailableModule module = availableModuleRepository.findByType(type)
                    .orElseGet(AvailableModule::new);

            module.setType(type);
            module.setName((String) d[1]);
            module.setDescription((String) d[2]);
            module.setIcon((String) d[3]);
            module.setIsEnabled((Boolean) d[4]);
            module.setIsConfigurable((Boolean) d[5]);
            module.setCssClass((String) d[6]);
            module.setJsFile((String) d[7]);
            module.setDefaultRowSpan((Integer) d[8]);
            module.setDefaultColSpan((Integer) d[9]);

            if (module.getVersion() == null)     module.setVersion("1.0.0");
            if (module.getAuthor() == null)      module.setAuthor("System");
            if (module.getDisplayOrder() == null) module.setDisplayOrder(0);

            availableModuleRepository.save(module);
            System.out.println("✅ Module registered/updated: " + type + " (" + d[8] + "×" + d[9] + ")");
        }
    }
}