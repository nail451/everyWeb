# 📊 EveryWeb

> Персонализированная стартовая страница с модульной системой виджетов

[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.x-6DB33F?style=flat&logo=spring-boot)](https://spring.io/projects/spring-boot)
[![Thymeleaf](https://img.shields.io/badge/Thymeleaf-3.x-005F0F?style=flat&logo=thymeleaf)](https://www.thymeleaf.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=flat&logo=postgresql)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 🎯 О проекте

**EveryWeb** — это ваша персональная стартовая страница, которую можно полностью настроить под себя. Создавайте неограниченное количество страниц, добавляйте виджеты, устанавливайте обои и защищайте страницы паролем.

### ✨ Основные возможности

| Возможность | Описание |
|-------------|----------|
| 📄 **Страницы** | Создание неограниченного количества страниц с парольной защитой |
| 🧩 **Виджеты** | 6 встроенных виджетов: часы, погода, ссылки, заметки, TODO, Nextcloud |
| 🎨 **Настройка** | Drag & Drop, изменение размера, скрытие фона, выравнивание контента |
| 🖼️ **Обои** | Загрузка своих обоев, автоматическая смена, несколько режимов |
| 🔐 **Безопасность** | Шифрование паролей BCrypt, сессионная авторизация |

---

## 🚀 Быстрый старт

### Системные требования

- Java 17+
- PostgreSQL 15+ (или H2 для разработки)
- Maven 3.6+

### Установка

```bash
# Клонируем репозиторий
git clone https://github.com/yourusername/everyweb.git
cd everyweb

# Настраиваем базу данных
createdb everyweb

# Собираем и запускаем
mvn clean install
mvn spring-boot:run

Откройте браузер: http://localhost:8080

Конфигурация
yaml
# application.yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/everyweb
    username: your_user
    password: your_password
  jpa:
    hibernate:
      ddl-auto: update
🧩 Виджеты
Доступные виджеты
Виджет	Описание	Размер по умолчанию
🕐 Часы	Многофункциональные часы с поддержкой нескольких часовых поясов	1×1
🌤️ Погода	Текущая погода в выбранном городе	1×1
🔗 Ссылки	Коллекция ссылок с кастомными иконками	2×2
📝 Заметки	Быстрые заметки с автосохранением	1×1
✅ TODO	Список задач с сохранением состояния	1×1
☁️ Nextcloud	Интеграция с Nextcloud (файлы + статистика)	2×2
Глобальные настройки виджетов
Каждый виджет поддерживает:

Скрытие фона — убирает фон и заголовок, оставляя только содержимое

Выравнивание контента — 9 вариантов позиционирования (3×3 сетка)

📁 Структура проекта
text
everyweb/
├── src/
│   ├── main/
│   │   ├── java/org/alex/everyWeb/
│   │   │   ├── config/          # Конфигурация и безопасность
│   │   │   ├── page/            # Управление страницами
│   │   │   ├── link/            # Управление ссылками
│   │   │   ├── modules/         # Система виджетов
│   │   │   │   ├── core/        # Ядро виджетов
│   │   │   │   └── impl/        # Реализации виджетов
│   │   │   └── wallpaper/       # Управление обоями
│   │   └── resources/
│   │       ├── static/
│   │       │   ├── css/         # Стили
│   │       │   └── js/          # JavaScript модули
│   │       └── templates/       # Thymeleaf шаблоны
│   └── test/                    # Тесты
├── pom.xml
└── README.md
🔐 Безопасность
Хранение паролей
Пароли страниц шифруются с помощью BCrypt

В базе данных хранятся только хэши, начинающиеся с $2a$

Обратное преобразование невозможно

Сессионная авторизация
После ввода правильного пароля страница разблокируется для текущей сессии

Перезагрузка браузера сохраняет статус разблокировки

Закрытие браузера очищает сессию

Навигация
Стрелки автоматически пропускают защищенные страницы

При клике на защищенную страницу открывается модальное окно с запросом пароля

🛠 Технологический стек
Категория	Технология
Backend	Spring Boot 3.x
Шаблонизация	Thymeleaf
База данных	PostgreSQL / H2
ORM	Spring Data JPA
Безопасность	Spring Security + BCrypt
HTTP клиент	WebClient
Фронтенд	Vanilla JS + CSS
Сборка	Maven
📦 API Endpoints
Управление страницами
http
GET    /api/pages                        # Список всех страниц
POST   /api/pages                        # Создать страницу
DELETE /api/pages/{id}                   # Удалить страницу
POST   /api/page/{id}/verify-password    # Проверить пароль
Управление виджетами
http
GET    /api/modules/{id}/settings        # Получить настройки
POST   /api/modules/{id}/action          # Выполнить действие
GET    /api/modules/{id}/data            # Получить данные
Управление раскладкой
http
GET    /api/pages/{id}/layout            # Получить раскладку
POST   /api/pages/{id}/layout/widget     # Добавить виджет
DELETE /api/pages/{id}/layout/widget/{w} # Удалить виджет
PUT    /api/pages/{id}/layout/widget/position # Переместить
PUT    /api/pages/{id}/layout/widget/resize   # Изменить размер
🔧 Добавление нового виджета
1. Backend
java
// Создаем класс виджета
@Component
public class MyModule extends Module {
    
    @Override
    public ModuleInfo getInfo() {
        return new ModuleInfo("MY_MODULE", "Мой модуль", "Описание");
    }
    
    @Override
    public ModuleData createData(ModuleContext context) {
        // Логика получения данных
    }
}
2. Frontend
javascript
// Создаем my-module.js
function initMyModule(element, id) {
    loadMyData(element, id);
}

function renderMyDisplay(element, data) {
    // Рендеринг содержимого виджета
}

function renderMySettings(data) {
    // Рендеринг настроек
}
3. Регистрация
java
// DataInitializer.java
AvailableModule myModule = new AvailableModule();
myModule.setType("MY_MODULE");
myModule.setName("Мой модуль");
myModule.setJsFile("my-module.js");
availableModuleRepository.save(myModule);
🤝 Участие в разработке
Fork репозитория

Создайте ветку (git checkout -b feature/amazing-feature)

Закоммитьте изменения (git commit -m 'Add amazing feature')

Отправьте в ветку (git push origin feature/amazing-feature)

Откройте Pull Request

📄 Лицензия
MIT License — подробности в файле LICENSE

🙏 Благодарности
Open-Meteo — бесплатное API погоды

Nextcloud — облачная платформа

Font Awesome — иконки

<p align="center"> Сделано с ❤️ для тех, кто любит порядок на своей стартовой странице </p> ```
