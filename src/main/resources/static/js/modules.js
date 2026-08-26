/**
 * MODULES.JS - Управление модулями (общая логика)
 */

function initModules() {
    console.log('Modules initialized');
    renderModules();
}

// ===== РЕНДЕРИНГ МОДУЛЕЙ =====
function renderModules() {
    const leftColumn = document.getElementById('modulesLeft');
    const rightColumn = document.getElementById('modulesRight');
    const modulesContainer = document.getElementById('modulesContainer');

    if (!leftColumn || !rightColumn) {
        console.error('Module columns not found');
        return;
    }

    // Очищаем колонки, но сохраняем лейблы
    leftColumn.innerHTML = '';
    rightColumn.innerHTML = '';
    leftColumn.innerHTML = `<div class="section-label">Модули</div>`;
    rightColumn.innerHTML = `<div class="section-label">Модули</div>`;

    if (!modulesContainer) {
        leftColumn.innerHTML += `
            <button class="add-module-btn" onclick="addModule()">
                ➕ Добавить модуль
            </button>
        `;
        return;
    }

    let modulesData = modulesContainer.getAttribute('data-modules');
    console.log('Modules data:', modulesData);

    if (!modulesData || modulesData === 'null' || modulesData === 'undefined' || modulesData === '[]') {
        leftColumn.innerHTML += `
            <button class="add-module-btn" onclick="addModule()">
                ➕ Добавить модуль
            </button>
        `;
        return;
    }

    try {
        const modules = JSON.parse(modulesData);
        console.log('Parsed modules:', modules);

        if (!Array.isArray(modules) || modules.length === 0) {
            leftColumn.innerHTML += `
                <button class="add-module-btn" onclick="addModule()">
                    ➕ Добавить модуль
                </button>
            `;
            return;
        }

        modules.forEach((module, index) => {
            const moduleDiv = createModuleElement(module);
            if (index % 2 === 0) {
                leftColumn.appendChild(moduleDiv);
            } else {
                rightColumn.appendChild(moduleDiv);
            }
        });

        const addButton = document.createElement('button');
        addButton.className = 'add-module-btn';
        addButton.textContent = '➕ Добавить модуль';
        addButton.onclick = addModule;
        leftColumn.appendChild(addButton);

        // Инициализируем модули после рендеринга
        setTimeout(() => {
            initializeModules();
        }, 100);

    } catch (error) {
        console.error('Error rendering modules:', error);
        leftColumn.innerHTML += `
            <button class="add-module-btn" onclick="addModule()">
                ➕ Добавить модуль
            </button>
        `;
    }
}

// ===== СОЗДАНИЕ ЭЛЕМЕНТА МОДУЛЯ =====
function createModuleElement(module) {
    const moduleDiv = document.createElement('div');
    moduleDiv.className = `module ${(module.type || '').toLowerCase()}-module`;
    moduleDiv.dataset.moduleId = module.id;
    moduleDiv.dataset.moduleType = module.type || '';

    const content = getModuleContent(module);

    moduleDiv.innerHTML = `
        <div class="module-title">
            <span>${escapeHtml(module.title || 'Модуль')}</span>
            <div style="display:flex; gap:6px;">
                <button class="module-settings-toggle" onclick="toggleModuleSettings(${module.id})" 
                        style="background:rgba(33,150,243,0.2); border:none; color:rgba(255,255,255,0.4); 
                               border-radius:4px; padding:2px 8px; cursor:pointer; font-size:11px;">
                    ⚙️
                </button>
                <button class="delete-btn" onclick="deleteModule(${module.id})">×</button>
            </div>
        </div>
        <div class="module-content" data-type="${module.type || ''}" data-settings='${module.settings || '{}'}'>
            ${content}
        </div>
        <div class="module-settings" style="display:none; margin-top:10px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.05);">
            <!-- Специфичные настройки модуля загружаются отдельно -->
        </div>
    `;

    return moduleDiv;
}

// ===== ГЕНЕРАЦИЯ КОНТЕНТА МОДУЛЯ =====
function getModuleContent(module) {
    const type = module.type || '';
    const settings = module.settings || '{}';

    switch(type) {
        case 'WEATHER':
            return `
                <div class="weather-display" data-module-id="${module.id}">
                    <div style="display:flex; align-items:center; gap:16px;">
                        <div class="weather-icon" style="font-size:48px;">🌤️</div>
                        <div>
                            <div class="weather-temp" style="font-size:32px; font-weight:300;">--°C</div>
                            <div class="weather-desc" style="opacity:0.6;">Загрузка...</div>
                        </div>
                    </div>
                    <div class="weather-details" style="margin-top:8px; font-size:13px; opacity:0.5;">
                        <span class="weather-wind">Ветер: --</span>
                        <span class="weather-humidity">Влажность: --</span>
                    </div>
                </div>
            `;
        case 'NOTES':
            return `
                <textarea placeholder="Ваши заметки..." 
                         data-module-id="${module.id}"
                         onchange="saveNotes(this)">${getSavedNotes(module.id)}</textarea>
            `;
        case 'CLOCK':
            return `
                <div class="clock-display" data-module-id="${module.id}">
                    <div style="text-align:center; opacity:0.5; padding:10px;">Загрузка...</div>
                </div>
            `;
        case 'NEXTCLOUD':
            return `
                <div class="nextcloud-display" data-module-id="${module.id}">
                    <div style="text-align:center; opacity:0.5; padding:10px;">
                        ⏳ Загрузка Nextcloud...
                    </div>
                </div>
            `;
        // ... остальные кейсы
        default:
            return `<div style="opacity:0.5;text-align:center;padding:20px;">Модуль: ${type}</div>`;
    }
}

// ===== ИНИЦИАЛИЗАЦИЯ МОДУЛЕЙ =====
function initializeModules() {
    console.log('Initializing modules...');

    // Проходим по всем модулям и инициализируем их специфичную логику
    document.querySelectorAll('.module').forEach(moduleElement => {
        const moduleId = moduleElement.dataset.moduleId;
        const moduleType = moduleElement.dataset.moduleType;

        console.log(`Initializing module: ${moduleType} (ID: ${moduleId})`);

        // Инициализация по типам (вызывается из файлов модулей)
        if (moduleType === 'CLOCK' && typeof initClockModule === 'function') {
            console.log(`Calling initClockModule for ID: ${moduleId}`);
            initClockModule(moduleElement, moduleId);
        }

        if (moduleType === 'WEATHER' && typeof initWeatherModule === 'function') {
            console.log(`Calling initWeatherModule for ID: ${moduleId}`);
            initWeatherModule(moduleElement, moduleId);
        }

        if (moduleType === 'NEXTCLOUD' && typeof initNextcloudModule === 'function') {
            console.log(`Calling initNextcloudModule for ID: ${moduleId}`);
            initNextcloudModule(moduleElement, moduleId);
        }
    });

    // Общие инициализации для встроенных модулей
    document.querySelectorAll('.notes-module textarea').forEach(textarea => {
        const moduleId = textarea.dataset.moduleId;
        const saved = localStorage.getItem('notes_' + moduleId);
        if (saved) textarea.value = saved;
    });

    document.querySelectorAll('.todo-module').forEach(todo => {
        const list = todo.querySelector('.todo-list');
        if (list) {
            const moduleId = parseInt(list.dataset.moduleId);
            loadTodos(moduleId);
        }
    });
}

// ===== ПЕРЕКЛЮЧЕНИЕ НАСТРОЕК МОДУЛЯ =====
function toggleModuleSettings(moduleId) {
    const moduleElement = document.querySelector(`.module[data-module-id="${moduleId}"]`);
    if (!moduleElement) return;

    const settingsDiv = moduleElement.querySelector('.module-settings');
    if (!settingsDiv) return;

    if (settingsDiv.style.display === 'none') {
        settingsDiv.style.display = 'block';
        // Загружаем настройки для конкретного модуля
        loadModuleSettings(moduleElement);
    } else {
        settingsDiv.style.display = 'none';
    }
}

// ===== ЗАГРУЗКА НАСТРОЕК МОДУЛЯ =====
async function loadModuleSettings(moduleElement) {
    const moduleId = moduleElement.dataset.moduleId;
    const moduleType = moduleElement.dataset.moduleType;
    const settingsDiv = moduleElement.querySelector('.module-settings');

    if (!settingsDiv) return;

    try {
        console.log(`Loading settings for module: ${moduleType} (ID: ${moduleId})`);

        const response = await fetch(`/api/modules/${moduleId}/settings`);
        if (response.ok) {
            const data = await response.json();
            console.log(`Settings data for module ${moduleId}:`, data);

            if (moduleType === 'CLOCK' && typeof renderClockSettings === 'function') {
                settingsDiv.innerHTML = renderClockSettings(data);
                if (typeof initClockSettingsEvents === 'function') {
                    initClockSettingsEvents(moduleId, settingsDiv);
                }
            } else if (moduleType === 'WEATHER' && typeof renderWeatherSettings === 'function') {
                settingsDiv.innerHTML = renderWeatherSettings(data);
                if (typeof initWeatherSettingsEvents === 'function') {
                    initWeatherSettingsEvents(moduleId, settingsDiv);
                }
            } else if (moduleType === 'NEXTCLOUD' && typeof renderNextcloudSettings === 'function') {
                // Передаем данные в функцию рендеринга
                settingsDiv.innerHTML = renderNextcloudSettings(data);
                if (typeof initNextcloudSettingsEvents === 'function') {
                    initNextcloudSettingsEvents(moduleId, settingsDiv);
                }
            } else {
                settingsDiv.innerHTML = `
                    <div style="text-align:center; opacity:0.5; padding:10px; font-size:13px;">
                        Настройки для модуля "${moduleType}" не найдены
                    </div>
                `;
            }
        } else {
            console.error(`Failed to load settings for module ${moduleId}:`, response.status);
            settingsDiv.innerHTML = `
                <div style="text-align:center; color:#ff6b6b; padding:10px; font-size:13px;">
                    ❌ Ошибка загрузки настроек (${response.status})
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading module settings:', error);
        settingsDiv.innerHTML = `
            <div style="text-align:center; color:#ff6b6b; padding:10px; font-size:13px;">
                ❌ Ошибка загрузки настроек: ${error.message}
            </div>
        `;
    }
}

// ===== ОБЩИЕ ФУНКЦИИ ДЛЯ МОДУЛЕЙ =====

// ЧАСЫ (базовая реализация)
function updateClock(element) {
    const now = new Date();
    const time = now.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    element.textContent = time;
}

// ЗАМЕТКИ
function getSavedNotes(moduleId) {
    return localStorage.getItem('notes_' + moduleId) || '';
}

function saveNotes(textarea) {
    const moduleId = textarea.dataset.moduleId;
    localStorage.setItem('notes_' + moduleId, textarea.value);
}

// TO-DO
function addTodo(input, moduleId) {
    const text = input.value.trim();
    if (!text) return;

    const todos = JSON.parse(localStorage.getItem('todos_' + moduleId) || '[]');
    todos.push({ id: Date.now(), text: text, done: false });
    localStorage.setItem('todos_' + moduleId, JSON.stringify(todos));

    input.value = '';
    loadTodos(moduleId);
}

function loadTodos(moduleId) {
    const list = document.querySelector(`.todo-list[data-module-id="${moduleId}"]`);
    if (!list) return;

    const todos = JSON.parse(localStorage.getItem('todos_' + moduleId) || '[]');
    list.innerHTML = '';

    todos.forEach(todo => {
        const li = document.createElement('li');
        li.innerHTML = `
            <input type="checkbox" ${todo.done ? 'checked' : ''} 
                   onchange="toggleTodo(${moduleId}, ${todo.id})">
            <span style="${todo.done ? 'text-decoration: line-through; opacity: 0.6;' : ''}">
                ${escapeHtml(todo.text)}
            </span>
            <button class="delete-todo-btn" onclick="deleteTodo(${moduleId}, ${todo.id})">×</button>
        `;
        list.appendChild(li);
    });
}

function toggleTodo(moduleId, todoId) {
    const todos = JSON.parse(localStorage.getItem('todos_' + moduleId) || '[]');
    const todo = todos.find(t => t.id === todoId);
    if (todo) {
        todo.done = !todo.done;
        localStorage.setItem('todos_' + moduleId, JSON.stringify(todos));
        loadTodos(moduleId);
    }
}

function deleteTodo(moduleId, todoId) {
    let todos = JSON.parse(localStorage.getItem('todos_' + moduleId) || '[]');
    todos = todos.filter(t => t.id !== todoId);
    localStorage.setItem('todos_' + moduleId, JSON.stringify(todos));
    loadTodos(moduleId);
}

// ===== ДОБАВЛЕНИЕ МОДУЛЯ =====
async function addModule() {
    try {
        // Получаем список доступных модулей из базы данных
        const response = await fetch('/api/modules/available');
        if (!response.ok) {
            throw new Error('Failed to load available modules');
        }

        const modules = await response.json();
        console.log('Available modules from DB:', modules);

        if (!modules || modules.length === 0) {
            showToast('❌ Нет доступных модулей');
            return;
        }

        // Строим сообщение для пользователя
        let message = 'Выберите тип модуля:\n';
        modules.forEach((module, index) => {
            message += `${index + 1}. ${module.icon} ${module.name} - ${module.description}\n`;
        });

        let typeIndex = prompt(message);
        if (typeIndex === null) return;

        typeIndex = parseInt(typeIndex) - 1;
        if (isNaN(typeIndex) || typeIndex < 0 || typeIndex >= modules.length) {
            showToast('❌ Неверный выбор');
            return;
        }

        const selectedModule = modules[typeIndex];
        const defaultTitle = selectedModule.name;

        const title = prompt('Введите заголовок модуля:', defaultTitle);
        if (title === null || !title.trim()) return;

        // Специфичные настройки для некоторых модулей
        let settings = {};
        if (selectedModule.type === 'WEATHER') {
            const city = prompt('Введите город:', 'Moscow');
            if (city !== null && city.trim()) {
                settings.city = city.trim();
            } else {
                showToast('❌ Город не указан');
                return;
            }
        }

        // Отправляем запрос на создание модуля
        const addResponse = await fetch(`/api/modules`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                pageId: currentPageId,
                type: selectedModule.type,
                title: title.trim(),
                settings: JSON.stringify(settings)
            })
        });

        if (addResponse.ok) {
            const newModule = await addResponse.json();
            console.log('Module added:', newModule);

            showToast(`✅ Модуль "${title.trim()}" добавлен`);

            // ===== ОБНОВЛЯЕМ СПИСОК МОДУЛЕЙ БЕЗ ПЕРЕЗАГРУЗКИ =====
            await refreshModules();
        } else {
            const error = await addResponse.text();
            showToast('❌ Ошибка добавления модуля: ' + error);
        }
    } catch (error) {
        console.error('Error adding module:', error);
        showToast('❌ Ошибка добавления модуля: ' + error.message);
    }
}

// ===== ОБНОВЛЕНИЕ МОДУЛЕЙ =====
async function refreshModules() {
    console.log('Refreshing modules...');

    try {
        // Сохраняем состояние открытых настроек
        const openSettings = {};
        document.querySelectorAll('.module-settings').forEach(div => {
            const moduleElement = div.closest('.module');
            if (moduleElement && div.style.display !== 'none') {
                openSettings[moduleElement.dataset.moduleId] = true;
            }
        });

        // Получаем обновленный список модулей
        const response = await fetch(`/api/modules/page/${currentPageId}`);
        if (!response.ok) {
            throw new Error('Failed to load modules');
        }

        const modules = await response.json();
        console.log('Updated modules:', modules);

        // Обновляем data-атрибут
        const modulesContainer = document.getElementById('modulesContainer');
        if (modulesContainer) {
            modulesContainer.setAttribute('data-modules', JSON.stringify(modules));
        }

        // Перерисовываем модули
        renderModules();

        // Восстанавливаем состояние настроек
        setTimeout(() => {
            document.querySelectorAll('.module').forEach(el => {
                const id = el.dataset.moduleId;
                if (openSettings[id]) {
                    const settingsDiv = el.querySelector('.module-settings');
                    if (settingsDiv) {
                        settingsDiv.style.display = 'block';
                        // Перезагружаем настройки
                        loadModuleSettings(el);
                    }
                }
            });
        }, 200);

    } catch (error) {
        console.error('Error refreshing modules:', error);
        showToast('❌ Ошибка обновления модулей');
    }
}

// ===== УДАЛЕНИЕ МОДУЛЯ =====
async function deleteModule(moduleId) {
    if (!confirm('Удалить модуль?')) return;

    try {
        const response = await fetch(`/api/modules/${moduleId}`, { method: 'DELETE' });
        if (response.ok) {
            showToast('✅ Модуль удален');

            // ===== ОБНОВЛЯЕМ СПИСОК МОДУЛЕЙ БЕЗ ПЕРЕЗАГРУЗКИ =====
            await refreshModules();
        } else {
            showToast('❌ Ошибка удаления модуля');
        }
    } catch (error) {
        console.error('Error deleting module:', error);
        showToast('❌ Ошибка удаления модуля');
    }
}