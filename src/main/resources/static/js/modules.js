/**
 * MODULES.JS - Общая логика для всех модулей
 * Версия: 2.0 - LINK логика вынесена в links.js
 */

let widgetSettingsCache = {};

// ===== РЕНДЕРИНГ ОБЩИХ НАСТРОЕК ВИДЖЕТА =====
function renderWidgetSettings(moduleId, hideBackground) {
    return `
        <div class="widget-settings-section" style="
            border-bottom: 1px solid rgba(255,255,255,0.08);
            padding-bottom: 12px;
            margin-bottom: 12px;
        ">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 10px;">
                <span style="font-size:12px; font-weight:600; opacity:0.6; color:rgba(255,255,255,0.6); letter-spacing:0.5px; text-transform:uppercase;">
                    📐 Настройки виджета
                </span>
                <span style="font-size:10px; opacity:0.3; color:rgba(255,255,255,0.3);">общие</span>
            </div>
            
            <!-- Скрыть фон виджета -->
            <div style="display:flex; align-items:center; gap:10px;">
                <input type="checkbox" class="widget-setting-checkbox" 
                       data-module="${moduleId}" data-setting="hideBackground"
                       ${hideBackground ? 'checked' : ''}
                       style="accent-color:#4CAF50; width:18px; height:18px; cursor:pointer;">
                <label style="font-size:12px; opacity:0.7; color:rgba(255,255,255,0.7); cursor:pointer;">
                    Скрыть фон виджета
                </label>
            </div>
            <div style="font-size:10px; opacity:0.3; color:rgba(255,255,255,0.3); margin-top:4px; padding-left:28px;">
                Оставляет только содержимое, убирает фон и заголовок
            </div>
        </div>
    `;
}

// ===== ИНИЦИАЛИЗАЦИЯ СОБЫТИЙ ОБЩИХ НАСТРОЕК =====
function initWidgetSettingsEvents(moduleId, settingsContainer) {
    const checkboxes = settingsContainer.querySelectorAll('.widget-setting-checkbox');
    checkboxes.forEach(checkbox => {
        const newCheckbox = checkbox.cloneNode(true);
        checkbox.parentNode.replaceChild(newCheckbox, checkbox);

        newCheckbox.addEventListener('mousedown', function(e) {
            e.stopPropagation();
        });

        newCheckbox.addEventListener('change', function(e) {
            e.stopPropagation();
            const moduleIdFromCheckbox = this.dataset.module;
            const setting = this.dataset.setting;
            const value = this.checked;

            // Сохраняем общую настройку
            saveWidgetSetting(moduleIdFromCheckbox, setting, value);

            // Применяем к виджету
            applyWidgetSetting(moduleIdFromCheckbox, setting, value);
        });
    });
}

// ===== СОХРАНЕНИЕ ОБЩЕЙ НАСТРОЙКИ =====
async function saveWidgetSetting(moduleId, setting, value) {
    console.log('Saving widget setting:', moduleId, setting, value);

    try {
        const updateParams = {};
        updateParams[setting] = value;

        const response = await fetch(`/api/modules/${moduleId}/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'updateSettings',
                params: updateParams
            })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.content && data.content.linkData) {
                // Обновляем кэш
                if (!widgetSettingsCache[moduleId]) {
                    widgetSettingsCache[moduleId] = {};
                }
                widgetSettingsCache[moduleId][setting] = value;
            }
            console.log('✅ Widget setting saved:', setting, value);
            return true;
        } else {
            console.error('❌ Failed to save widget setting:', await response.text());
            return false;
        }
    } catch (error) {
        console.error('❌ Error saving widget setting:', error);
        return false;
    }
}

// ===== ПРИМЕНЕНИЕ ОБЩЕЙ НАСТРОЙКИ =====
function applyWidgetSetting(moduleId, setting, value) {
    console.log('Applying widget setting:', moduleId, setting, value);

    const widget = document.querySelector(`.widget[data-widget-id="${moduleId}"]`);
    if (!widget) return;

    // Обновляем кэш
    if (!widgetSettingsCache[moduleId]) {
        widgetSettingsCache[moduleId] = {};
    }
    widgetSettingsCache[moduleId][setting] = value;

    // Применяем настройку к виджету
    if (setting === 'hideBackground') {
        applyHideBackground(widget, value);
    }
}

// ===== ПРИМЕНЕНИЕ СКРЫТИЯ ФОНА =====
function applyHideBackground(widget, hide) {
    if (!widget) return;

    const moduleId = widget.dataset.widgetId;

    if (hide) {
        widget.style.background = 'transparent';
        widget.style.backdropFilter = 'none';
        widget.style.border = 'none';
        widget.style.boxShadow = 'none';
        widget.style.padding = '4px';
        widget.style.backgroundColor = 'transparent';
        widget.style.overflow = 'visible';

        const header = widget.querySelector('.widget-header');
        if (header) {
            const titleSpan = header.querySelector('.widget-title');
            if (titleSpan) {
                titleSpan.style.display = 'none';
            }
            const actions = header.querySelector('.widget-actions');
            if (actions) {
                actions.style.display = 'flex';
                actions.style.marginLeft = 'auto';
                actions.style.flexShrink = '0';
            }
            header.style.borderBottom = 'none';
            header.style.marginBottom = '0';
            header.style.paddingBottom = '0';
            header.style.minHeight = '28px';
            header.style.justifyContent = 'flex-end';
        }
    } else {
        widget.style.background = '';
        widget.style.backdropFilter = '';
        widget.style.border = '';
        widget.style.boxShadow = '';
        widget.style.padding = '';
        widget.style.backgroundColor = '';
        widget.style.overflow = 'visible';

        const header = widget.querySelector('.widget-header');
        if (header) {
            const titleSpan = header.querySelector('.widget-title');
            if (titleSpan) {
                titleSpan.style.display = '';
            }
            const actions = header.querySelector('.widget-actions');
            if (actions) {
                actions.style.display = '';
                actions.style.marginLeft = '';
                actions.style.flexShrink = '';
            }
            header.style.borderBottom = '';
            header.style.marginBottom = '';
            header.style.paddingBottom = '';
            header.style.minHeight = '';
            header.style.justifyContent = '';
        }
    }
}



// ===== ИНИЦИАЛИЗАЦИЯ =====
function initModules() {
    console.log('Modules initialized');
}

// ===== ЗАГРУЗКА НАСТРОЕК МОДУЛЯ =====
async function loadModuleSettings(moduleElement) {
    const moduleId = moduleElement.dataset.widgetId;
    const moduleType = moduleElement.dataset.widgetType;
    const settingsDiv = moduleElement.querySelector('.module-settings');

    if (!settingsDiv) return;

    try {
        const numericId = parseInt(moduleId);
        if (isNaN(numericId)) {
            settingsDiv.innerHTML = `
                <div style="text-align:center; color:#ff6b6b; padding:10px; font-size:13px;">
                    ❌ Неверный ID модуля
                </div>
            `;
            return;
        }

        // Загружаем настройки модуля (содержат и общие настройки тоже)
        const response = await fetch(`/api/modules/${numericId}/settings`);

        if (response.ok) {
            const data = await response.json();
            console.log('Settings data loaded for module', moduleType, ':', data);

            const content = data.content || {};
            const moduleSettings = content.linkData || content.settings || {};

            // Получаем общие настройки
            const hideBackground = moduleSettings.hideBackground || false;

            // Сохраняем в кэш общих настроек
            if (!widgetSettingsCache[numericId]) {
                widgetSettingsCache[numericId] = {};
            }
            widgetSettingsCache[numericId].hideBackground = hideBackground;

            // Применяем общие настройки к виджету
            applyHideBackground(moduleElement, hideBackground);

            // === СТРОИМ ПАНЕЛЬ НАСТРОЕК ===
            let html = '';

            // 1. ОБЩИЕ НАСТРОЙКИ ВИДЖЕТА
            html += renderWidgetSettings(numericId, hideBackground);

            // 2. СПЕЦИФИЧНЫЕ НАСТРОЙКИ МОДУЛЯ
            if (moduleType === 'LINK') {
                if (typeof renderLinkSettings === 'function') {
                    html += renderLinkSettings(data, numericId);
                }
            } else if (moduleType === 'CLOCK' && typeof renderClockSettings === 'function') {
                html += renderClockSettings(data);
            } else if (moduleType === 'WEATHER' && typeof renderWeatherSettings === 'function') {
                html += renderWeatherSettings(data);
            } else if (moduleType === 'NEXTCLOUD' && typeof renderNextcloudSettings === 'function') {
                html += renderNextcloudSettings(data);
            } else {
                html += `
                    <div style="text-align:center; opacity:0.5; padding:10px; font-size:13px;">
                        Настройки для модуля "${moduleType}" не найдены
                    </div>
                `;
            }

            settingsDiv.innerHTML = html;

            // Инициализируем события для общих настроек
            initWidgetSettingsEvents(numericId, settingsDiv);

            // Инициализируем события для специфичных настроек
            if (moduleType === 'LINK' && typeof initLinkSettingsEvents === 'function') {
                initLinkSettingsEvents(numericId, settingsDiv);
            } else if (moduleType === 'CLOCK' && typeof initClockSettingsEvents === 'function') {
                initClockSettingsEvents(numericId, settingsDiv);
            } else if (moduleType === 'WEATHER' && typeof initWeatherSettingsEvents === 'function') {
                initWeatherSettingsEvents(numericId, settingsDiv);
            } else if (moduleType === 'NEXTCLOUD' && typeof initNextcloudSettingsEvents === 'function') {
                initNextcloudSettingsEvents(numericId, settingsDiv);
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

// ===== ПЕРЕКЛЮЧЕНИЕ НАСТРОЕК МОДУЛЯ =====
function toggleModuleSettings(moduleId) {
    console.log('toggleModuleSettings called for:', moduleId);

    const widget = document.querySelector(`.widget[data-widget-id="${moduleId}"]`);
    if (!widget) {
        showToast('❌ Виджет не найден');
        return;
    }

    if (!window.gridState || !window.gridState.isEditing) {
        showToast('✏️ Включите режим редактирования для доступа к настройкам');
        return;
    }

    const wrapper = widget.querySelector('.widget-content-wrapper');
    if (!wrapper) {
        showToast('❌ Ошибка: обёртка контента не найдена');
        return;
    }

    let settingsDiv = wrapper.querySelector('.module-settings');

    if (!settingsDiv) {
        console.log('Creating module-settings div for widget:', moduleId);
        settingsDiv = document.createElement('div');
        settingsDiv.className = 'module-settings';
        settingsDiv.style.cssText = 'display:none; margin-top:10px; flex-shrink:0;';
        wrapper.appendChild(settingsDiv);
    }

    const isOpen = settingsDiv.style.display !== 'none' && settingsDiv.style.display !== '';

    if (isOpen) {
        settingsDiv.style.display = 'none';
        if (window.gridState && window.gridState.isEditing) {
            widget.draggable = true;
            widget.style.cursor = 'grab';
        }
        console.log('Settings closed for module:', moduleId);
    } else {
        settingsDiv.style.display = 'block';
        widget.draggable = false;
        widget.style.cursor = 'default';
        loadModuleSettings(widget);
        console.log('Settings opened for module:', moduleId);
    }
}



// ===== ИНИЦИАЛИЗАЦИЯ МОДУЛЕЙ =====
function initializeModules() {
    console.log('Initializing modules...');

    document.querySelectorAll('.widget').forEach(widgetElement => {
        const moduleId = widgetElement.dataset.widgetId;
        const moduleType = widgetElement.dataset.widgetType;

        if (moduleType === 'CLOCK' && typeof initClockModule === 'function') {
            initClockModule(widgetElement, moduleId);
        }

        if (moduleType === 'WEATHER' && typeof initWeatherModule === 'function') {
            initWeatherModule(widgetElement, moduleId);
        }

        if (moduleType === 'NEXTCLOUD' && typeof initNextcloudModule === 'function') {
            initNextcloudModule(widgetElement, moduleId);
        }

        if (moduleType === 'LINK') {
            if (typeof loadLinkWidgetData === 'function') {
                loadLinkWidgetData(widgetElement);
            }
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

// ===== ГЛОБАЛЬНЫЕ ПРИВЯЗКИ =====
window.toggleModuleSettings = toggleModuleSettings;
window.loadModuleSettings = loadModuleSettings;
window.initializeModules = initializeModules;
window.addTodo = addTodo;
window.loadTodos = loadTodos;
window.toggleTodo = toggleTodo;
window.deleteTodo = deleteTodo;

console.log('✅ modules.js 2.0 loaded');