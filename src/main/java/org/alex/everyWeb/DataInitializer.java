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
        // Проверяем, есть ли уже модули
        if (availableModuleRepository.count() > 0) {
            return;
        }

        // ===== СПИСОК МОДУЛЕЙ =====
        AvailableModule[] modules = {
                createModule("LINK", "Ссылки", "Отображение ссылок", "🔗", true, true, "link-widget", "link-module.js"),
                createModule("CLOCK", "Часы", "Многофункциональные часы", "🕐", true, true, "clock-module", "clock-module.js"),
                createModule("WEATHER", "Погода", "Погода в выбранном городе", "🌤️", true, true, "weather-module", "weather-module.js"),
                createModule("NEXTCLOUD", "Nextcloud", "Интеграция с Nextcloud", "☁️", true, true, "nextcloud-module", "nextcloud-module.js"),
                createModule("NOTES", "Заметки", "Быстрые заметки", "📝", true, false, "notes-module", "notes-module.js"),
                createModule("TODO", "Список дел", "To-Do список", "✅", true, false, "todo-module", "todo-module.js"),
                createModule("CPU", "Процессор", "Загрузка процессора и информация о ядрах", "📊",true, true, "cpu-module", "system-modules.js"),
                createModule("MEMORY", "Память", "Использование оперативной памяти", "🧠", true, true, "memory-module","system-modules.js"),
                createModule("DISK", "Диски","Информация о дисках и свободном месте","💾",  true, true, "disk-module","system-modules.js"),
                createModule("NETWORK", "Сеть","Скорость сети и информация об интерфейсах","🌐",  true, true, "network-module","system-modules.js"),
                createModule("BATTERY", "Батарея","Состояние батареи и заряд","🔋",  true, true, "battery-module","system-modules.js")


        };

        for (AvailableModule module : modules) {
            availableModuleRepository.save(module);
            System.out.println("✅ Module registered: " + module.getType());
        }
    }

    private AvailableModule createModule(String type, String name, String description,
                                         String icon, boolean enabled, boolean configurable,
                                         String cssClass, String jsFile) {
        AvailableModule module = new AvailableModule();
        module.setType(type);
        module.setName(name);
        module.setDescription(description);
        module.setIcon(icon);
        module.setIsEnabled(enabled);
        module.setIsConfigurable(configurable);
        module.setCssClass(cssClass);
        module.setJsFile(jsFile);
        module.setVersion("1.0.0");
        module.setAuthor("System");
        module.setDisplayOrder(0);
        return module;
    }
}