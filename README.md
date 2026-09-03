📊 EveryWeb - Персонализированная стартовая страница
https://img.shields.io/badge/Spring%2520Boot-3.x-6DB33F?style=flat&logo=spring-boot
https://img.shields.io/badge/Thymeleaf-3.x-005F0F?style=flat&logo=thymeleaf
https://img.shields.io/badge/PostgreSQL-15-4169E1?style=flat&logo=postgresql
https://img.shields.io/badge/License-MIT-blue.svg

EveryWeb — это персонализированная стартовая страница (dashboard) с модульной системой виджетов. Вы можете создавать неограниченное количество страниц, настраивать их под свои нужды и защищать паролем.

✨ Возможности
📄 Управление страницами
Создание неограниченного количества страниц

Защита страниц паролем (шифрование BCrypt)

Навигация между страницами с помощью стрелок

Автоматическое пропускание защищенных страниц при навигации

🧩 Виджеты
🕐 Часы — многофункциональные часы с поддержкой нескольких часовых поясов

🌤️ Погода — информация о погоде в выбранном городе

🔗 Ссылки — коллекция ссылок с кастомными иконками и favicon

📝 Заметки — быстрые заметки с автосохранением

✅ Список дел — TODO-лист с сохранением состояния

☁️ Nextcloud — интеграция с Nextcloud (просмотр файлов и статистика хранилища)

🎨 Настройка
Drag & Drop — перемещение виджетов в режиме редактирования

Resize — изменение размера виджетов

Скрытие фона — минималистичный режим для каждого виджета

Выравнивание контента — 9 позиций для точного позиционирования

Обои — установка, загрузка и автоматическая смена обоев

🚀 Быстрый старт
Требования
Java 17+

PostgreSQL 15+

Maven 3.6+

Установка
Клонируйте репозиторий

bash
git clone https://github.com/yourusername/everyweb.git
cd everyweb
Настройте базу данных

sql
CREATE DATABASE everyweb;
CREATE USER everyweb_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE everyweb TO everyweb_user;
Настройте application.yaml

yaml
spring:
datasource:
url: jdbc:postgresql://localhost:5432/everyweb
username: everyweb_user
password: your_password
driver-class-name: org.postgresql.Driver
jpa:
hibernate:
ddl-auto: update
Соберите и запустите

bash
mvn clean install
mvn spring-boot:run
Откройте в браузере

text
http://localhost:8080
📁 Структура проекта
text
src/main/java/org/alex/everyWeb/
├── EveryWebApplication.java          # Главный класс
├── DataInitializer.java              # Инициализация данных
├── config/
│   ├── PasswordService.java          # Шифрование паролей
│   ├── SecurityConfig.java           # Настройки безопасности
│   └── WebConfig.java                # Конфигурация веб-слоя
├── page/                             # Модуль страниц
│   ├── controller/                   # Контроллеры
│   ├── service/                      # Сервисы
│   ├── repository/                   # Репозитории
│   ├── entity/                       # Сущности
│   └── dto/                          # DTO
├── link/                             # Модуль ссылок
├── modules/                          # Модуль виджетов
│   ├── api/                          # API и настройки
│   ├── core/                         # Ядро системы виджетов
│   └── impl/                         # Реализации виджетов
└── wallpaper/                        # Модуль обоев

src/main/resources/
├── static/
│   ├── css/                          # Стили
│   └── js/                           # JavaScript
├── templates/                        # Thymeleaf шаблоны
└── application.yaml                  # Конфигурация
🔐 Безопасность
Пароли шифруются с помощью BCrypt

Сессионное хранение — после ввода пароля страница разблокируется для текущей сессии

Защита навигации — при переключении стрелками защищенные страницы автоматически пропускаются

🧩 Добавление нового виджета
Backend
Создайте класс в modules/impl/, наследуйте Module

Реализуйте методы getInfo() и createData()

Добавьте в AvailableModule через DataInitializer

Создайте DTO для специфичных настроек

Frontend
Создайте {name}-module.js в static/js/

Добавьте функции:

init{Name}Module()

load{Name}Data()

render{Name}Display()

render{Name}Settings()

init{Name}SettingsEvents()

Добавьте иконку в getWidgetIcon()

🛠 Технологии
Компонент	Технология
Backend	Spring Boot 3.x
Шаблонизация	Thymeleaf
База данных	PostgreSQL / H2
ORM	Spring Data JPA
Безопасность	Spring Security + BCrypt
HTTP клиент	WebClient
JSON	Jackson
Фронтенд	Vanilla JS + CSS
📦 API Endpoints
Страницы
Метод	URL	Описание
GET	/api/pages	Получить список страниц
POST	/api/pages	Создать страницу
DELETE	/api/pages/{id}	Удалить страницу
POST	/api/page/{id}/verify-password	Проверить пароль
Виджеты
Метод	URL	Описание
GET	/api/modules/{id}/settings	Получить настройки
POST	/api/modules/{id}/action	Выполнить действие
GET	/api/modules/{id}/data	Получить данные
Раскладка
Метод	URL	Описание
GET	/api/pages/{id}/layout	Получить раскладку
POST	/api/pages/{id}/layout/widget	Добавить виджет
DELETE	/api/pages/{id}/layout/widget/{wid}	Удалить виджет
PUT	/api/pages/{id}/layout/widget/position	Переместить виджет
PUT	/api/pages/{id}/layout/widget/resize	Изменить размер
🤝 Вклад в проект
Форкните репозиторий

Создайте ветку для фичи (git checkout -b feature/amazing-feature)

Закоммитьте изменения (git commit -m 'Add amazing feature')

Запушьте в ветку (git push origin feature/amazing-feature)

Откройте Pull Request

📝 Лицензия
Распространяется под лицензией MIT. См. LICENSE для получения дополнительной информации.

🙏 Благодарности
Spring Boot

Thymeleaf

Open-Meteo — бесплатное API погоды

Nextcloud — для интеграции

⭐️ Если вам понравился проект, поставьте звезду на GitHub!