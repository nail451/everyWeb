/**
 * MODULES.JS - Управление модулями (общая логика)
 */

function initModules() {
    console.log('Modules initialized');
    // Модули теперь рендерятся через grid.js
}

// ===== ДОБАВЛЕНИЕ МОДУЛЯ =====
async function addModule() {
    // Используем диалог добавления виджета из grid.js
    if (typeof addWidgetDialog === 'function') {
        addWidgetDialog();
    } else {
        showToast('❌ Система виджетов не загружена');
    }
}

// ===== УДАЛЕНИЕ МОДУЛЯ =====
function deleteModule(moduleId) {
    if (typeof removeWidget === 'function') {
        removeWidget(moduleId);
    } else {
        showToast('❌ Система виджетов не загружена');
    }
}

// ===== ПЕРЕКЛЮЧЕНИЕ НАСТРОЕК МОДУЛЯ =====
function toggleModuleSettings(moduleId) {
    console.log('toggleModuleSettings called for:', moduleId);

    const widget = document.querySelector(`.widget[data-widget-id="${moduleId}"]`);
    if (!widget) {
        console.error('Widget not found:', moduleId);
        showToast('❌ Виджет не найден');
        return;
    }

    // Проверяем, что мы в режиме редактирования
    if (!gridState || !gridState.isEditing) {
        showToast('✏️ Включите режим редактирования для доступа к настройкам');
        return;
    }

    const settingsDiv = widget.querySelector('.module-settings');
    if (!settingsDiv) {
        console.error('Settings div not found for widget:', moduleId);
        showToast('❌ Настройки не найдены');
        return;
    }

    if (settingsDiv.style.display === 'none' || settingsDiv.style.display === '') {
        settingsDiv.style.display = 'block';
        console.log('Loading settings for module:', moduleId);
        loadModuleSettings(widget);
    } else {
        settingsDiv.style.display = 'none';
        console.log('Settings closed for module:', moduleId);
    }
}

// ===== ЗАГРУЗКА НАСТРОЕК МОДУЛЯ =====
async function loadModuleSettings(moduleElement) {
    const moduleId = moduleElement.dataset.widgetId;
    const moduleType = moduleElement.dataset.widgetType;
    const settingsDiv = moduleElement.querySelector('.module-settings');

    if (!settingsDiv) return;

    try {
        // Преобразуем в число (теперь это числовой ID)
        const numericId = parseInt(moduleId);
        if (isNaN(numericId)) {
            settingsDiv.innerHTML = `
                <div style="text-align:center; color:#ff6b6b; padding:10px; font-size:13px;">
                    ❌ Неверный ID модуля
                </div>
            `;
            return;
        }

        const response = await fetch(`/api/modules/${numericId}/settings`);
        if (response.ok) {
            const data = await response.json();
            console.log('Settings data loaded:', data);

            if (moduleType === 'CLOCK' && typeof renderClockSettings === 'function') {
                settingsDiv.innerHTML = renderClockSettings(data);
                if (typeof initClockSettingsEvents === 'function') {
                    initClockSettingsEvents(numericId, settingsDiv);
                }
            } else if (moduleType === 'WEATHER' && typeof renderWeatherSettings === 'function') {
                settingsDiv.innerHTML = renderWeatherSettings(data);
                if (typeof initWeatherSettingsEvents === 'function') {
                    initWeatherSettingsEvents(numericId, settingsDiv);
                }
            } else if (moduleType === 'NEXTCLOUD' && typeof renderNextcloudSettings === 'function') {
                settingsDiv.innerHTML = renderNextcloudSettings(data);
                if (typeof initNextcloudSettingsEvents === 'function') {
                    initNextcloudSettingsEvents(numericId, settingsDiv);
                }
            } else {
                settingsDiv.innerHTML = `
                    <div style="text-align:center; opacity:0.5; padding:10px; font-size:13px;">
                        Настройки для модуля "${moduleType}" не найдены
                    </div>
                `;
            }
        } else if (response.status === 404) {
            settingsDiv.innerHTML = `
                <div style="text-align:center; opacity:0.5; padding:10px; font-size:13px;">
                    Настройки не найдены
                </div>
            `;
        } else {
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

// ===== ИНИЦИАЛИЗАЦИЯ МОДУЛЕЙ =====
function initializeModules() {
    console.log('Initializing modules...');

    document.querySelectorAll('.widget').forEach(widgetElement => {
        const moduleId = widgetElement.dataset.widgetId;
        const moduleType = widgetElement.dataset.widgetType;

        console.log(`Initializing module: ${moduleType} (ID: ${moduleId})`);

        if (moduleType === 'CLOCK' && typeof initClockModule === 'function') {
            initClockModule(widgetElement, moduleId);
        }

        if (moduleType === 'WEATHER' && typeof initWeatherModule === 'function') {
            initWeatherModule(widgetElement, moduleId);
        }

        if (moduleType === 'NEXTCLOUD' && typeof initNextcloudModule === 'function') {
            initNextcloudModule(widgetElement, moduleId);
        }
    });

    // Общие инициализации
    document.querySelectorAll('.clock-display').forEach(clock => {
        if (typeof updateClockDisplay !== 'function') {
            updateClock(clock);
        }
    });

    // Заметки
    document.querySelectorAll('.note-text').forEach(textarea => {
        const moduleId = textarea.dataset.widgetId;
        const saved = localStorage.getItem('notes_' + moduleId);
        if (saved) textarea.value = saved;
        textarea.addEventListener('input', function() {
            localStorage.setItem('notes_' + moduleId, this.value);
        });
    });

    // TODO
    document.querySelectorAll('.todo-widget').forEach(widget => {
        const list = widget.querySelector('.todo-list');
        if (list) {
            const moduleId = widget.dataset.widgetId;
            loadTodos(moduleId);
        }
    });
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
function saveNotes(textarea) {
    const moduleId = textarea.dataset.widgetId || textarea.dataset.moduleId;
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
    const widget = document.querySelector(`.widget[data-widget-id="${moduleId}"]`);
    if (!widget) return;

    const list = widget.querySelector('.todo-list');
    if (!list) return;

    const todos = JSON.parse(localStorage.getItem('todos_' + moduleId) || '[]');
    list.innerHTML = '';

    todos.forEach(todo => {
        const li = document.createElement('li');
        li.style.cssText = 'display:flex; align-items:center; gap:8px; padding:4px 0; border-bottom:1px solid rgba(255,255,255,0.05);';
        li.innerHTML = `
            <input type="checkbox" ${todo.done ? 'checked' : ''} 
                   onchange="toggleTodo(${moduleId}, ${todo.id})"
                   style="accent-color:#4CAF50; cursor:pointer;">
            <span style="${todo.done ? 'text-decoration: line-through; opacity: 0.6;' : ''}; flex:1; font-size:13px;">
                ${escapeHtml(todo.text)}
            </span>
            <button class="delete-todo-btn" onclick="deleteTodo(${moduleId}, ${todo.id})" 
                    style="background:none; border:none; color:rgba(244,67,54,0.3); cursor:pointer; font-size:14px;">
                ×
            </button>
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

// ===== ГЛОБАЛЬНЫЕ ПРИВЯЗКИ ДЛЯ HTML =====
window.toggleModuleSettings = toggleModuleSettings;
window.loadModuleSettings = loadModuleSettings;
window.addModule = addModule;
window.deleteModule = deleteModule;

console.log('✅ Modules.js loaded. Functions available:', {
    toggleModuleSettings: typeof window.toggleModuleSettings,
    loadModuleSettings: typeof window.loadModuleSettings,
    addModule: typeof window.addModule,
    deleteModule: typeof window.deleteModule
});