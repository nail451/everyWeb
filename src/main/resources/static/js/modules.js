/**
 * MODULES.JS - Общая логика для всех модулей
 * Версия: 2.5 - исправлено сохранение и позиционирование
 */

// ===== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ =====
let widgetSettingsCache = {};

// ===== ГЛОБАЛЬНАЯ ОБЁРТКА ДЛЯ НАСТРОЕК (ТЁМНЫЙ СТИЛЬ) =====
function wrapSettingsInDarkTheme(html) {
    if (!html || !html.trim()) {
        return '';
    }
    return `
        <div class="settings-dark-theme" style="
            background: rgba(30, 30, 50, 0.95);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-radius: 12px;
            padding: 14px;
            border: 1px solid rgba(255,255,255,0.06);
        ">
            ${html}
        </div>
    `;
}

// ===== РЕНДЕРИНГ ОБЩИХ НАСТРОЕК ВИДЖЕТА =====
function renderWidgetSettings(moduleId, hideBackground, alignment) {
    const defaultAlignment = alignment || 'center-center';
    const [activeVertical, activeHorizontal] = defaultAlignment.split('-');

    const html = `
        <div class="widget-settings-section" data-module-id="${moduleId}">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 10px;">
                <span style="font-size:12px; font-weight:600; opacity:0.6; color:rgba(255,255,255,0.6); letter-spacing:0.5px; text-transform:uppercase;">
                    📐 Настройки виджета
                </span>
                <span style="font-size:10px; opacity:0.3; color:rgba(255,255,255,0.3);">общие</span>
            </div>
            
            <!-- Скрыть фон виджета -->
            <div style="display:flex; align-items:center; gap:10px; margin-bottom: 12px;">
                <input type="checkbox" class="widget-setting-checkbox" 
                       data-module="${moduleId}" data-setting="hideBackground"
                       ${hideBackground ? 'checked' : ''}
                       style="accent-color:#4CAF50; width:18px; height:18px; cursor:pointer;">
                <label style="font-size:12px; opacity:0.7; color:rgba(255,255,255,0.7); cursor:pointer;">
                    Скрыть фон виджета
                </label>
            </div>
            <div style="font-size:10px; opacity:0.3; color:rgba(255,255,255,0.3); margin-bottom:12px; padding-left:28px;">
                Оставляет только содержимое, убирает фон и заголовок
            </div>

            <!-- ВЫРАВНИВАНИЕ КОНТЕНТА -->
            <div style="border-top:1px solid rgba(255,255,255,0.06); padding-top:12px;">
                <label style="font-size:12px; opacity:0.6; color:rgba(255,255,255,0.6); display:block; margin-bottom:8px;">
                    🎯 Расположение контента
                </label>
                <div class="alignment-grid" style="display:grid; grid-template-columns:repeat(3, 1fr); gap:4px; max-width:180px; margin:0 auto;">
                    ${['top-left', 'top-center', 'top-right', 'center-left', 'center-center', 'center-right', 'bottom-left', 'bottom-center', 'bottom-right'].map(pos => {
        const [v, h] = pos.split('-');
        const isActive = v === activeVertical && h === activeHorizontal;
        const label = pos === 'center-center' ? '⊹' :
            pos === 'top-left' ? '↖' :
                pos === 'top-right' ? '↗' :
                    pos === 'bottom-left' ? '↙' :
                        pos === 'bottom-right' ? '↘' :
                            pos === 'top-center' ? '↑' :
                                pos === 'bottom-center' ? '↓' :
                                    pos === 'center-left' ? '←' :
                                        pos === 'center-right' ? '→' : '•';
        return `
                            <button class="alignment-btn" 
                                data-module="${moduleId}" 
                                data-alignment="${pos}"
                                style="padding:6px 4px; border-radius:4px; border:2px solid ${isActive ? '#4CAF50' : 'rgba(255,255,255,0.08)'}; 
                                   background:${isActive ? 'rgba(76,175,80,0.2)' : 'rgba(255,255,255,0.03)'}; 
                                   color:${isActive ? '#81C784' : 'rgba(255,255,255,0.3)'}; 
                                   cursor:pointer; font-size:16px; transition:all 0.2s;"
                                onmouseover="this.style.background='${isActive ? 'rgba(76,175,80,0.3)' : 'rgba(255,255,255,0.08)'}'"
                                onmouseout="this.style.background='${isActive ? 'rgba(76,175,80,0.2)' : 'rgba(255,255,255,0.03)'}'"
                                onclick="setAlignment(${moduleId}, '${pos}')">
                                ${label}
                            </button>
                        `;
    }).join('')}
                </div>
                <div style="text-align:center; font-size:10px; opacity:0.3; color:rgba(255,255,255,0.3); margin-top:4px;">
                    ${defaultAlignment.replace('-', ' → ')}
                </div>
            </div>
        </div>
    `;

    return wrapSettingsInDarkTheme(html);
}

// ===== УСТАНОВКА ВЫРАВНИВАНИЯ =====
function setAlignment(moduleId, alignment) {
    console.log('🔵 setAlignment called:', moduleId, alignment);

    // Обновляем UI в текущих настройках
    const section = document.querySelector(`.widget-settings-section[data-module-id="${moduleId}"]`);
    if (section) {
        const buttons = section.querySelectorAll('.alignment-btn');
        buttons.forEach(btn => {
            const isActive = btn.dataset.alignment === alignment;
            btn.style.borderColor = isActive ? '#4CAF50' : 'rgba(255,255,255,0.08)';
            btn.style.background = isActive ? 'rgba(76,175,80,0.2)' : 'rgba(255,255,255,0.03)';
            btn.style.color = isActive ? '#81C784' : 'rgba(255,255,255,0.3)';
        });

        const label = section.querySelector('.alignment-grid + div');
        if (label) {
            label.textContent = alignment.replace('-', ' → ');
        }
    }

    // Сохраняем и применяем
    saveWidgetSetting(moduleId, 'alignment', alignment);
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

            console.log('Widget setting changed:', moduleIdFromCheckbox, setting, value);
            saveWidgetSetting(moduleIdFromCheckbox, setting, value);
        });
    });
}

// ===== СОХРАНЕНИЕ ОБЩЕЙ НАСТРОЙКИ =====
async function saveWidgetSetting(moduleId, setting, value) {
    console.log('🔵 saveWidgetSetting called:', { moduleId, setting, value });

    try {
        const updateParams = {};
        updateParams[setting] = value;

        // ===== ВАЖНО: Отправляем как updateSettings для ЛЮБОГО модуля =====
        // Общие настройки (hideBackground, alignment) будут обработаны в ModuleContext
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
            console.log('✅ Widget setting saved on server');

            // Обновляем кэш
            if (!widgetSettingsCache[moduleId]) {
                widgetSettingsCache[moduleId] = {};
            }
            widgetSettingsCache[moduleId][setting] = value;

            // Применяем к виджету сразу
            applyWidgetStyles(moduleId);

            return true;
        } else {
            const errorText = await response.text();
            console.error('❌ Failed to save widget setting:', errorText);
            showToast('❌ Ошибка сохранения настройки');
            return false;
        }
    } catch (error) {
        console.error('❌ Error saving widget setting:', error);
        showToast('❌ Ошибка сохранения настройки');
        return false;
    }
}

// ===== ЗАГРУЗКА НАСТРОЕК ВИДЖЕТА =====
async function loadWidgetSettings(moduleId) {
    try {
        const response = await fetch(`/api/modules/${moduleId}/settings`);
        if (response.ok) {
            const data = await response.json();
            console.log('🔵 loadWidgetSettings: data for module', moduleId, data);

            const content = data.content || {};
            const settings = content.settings || {};
            const linkData = content.linkData || {};

            const hideBackground = settings.hideBackground !== undefined
                ? settings.hideBackground
                : (linkData.hideBackground || false);

            const alignment = settings.alignment !== undefined
                ? settings.alignment
                : (linkData.alignment || 'center-center');

            console.log('🔵 loadWidgetSettings: parsed for', moduleId, { hideBackground, alignment });

            if (!widgetSettingsCache[moduleId]) {
                widgetSettingsCache[moduleId] = {};
            }
            widgetSettingsCache[moduleId].hideBackground = hideBackground;
            widgetSettingsCache[moduleId].alignment = alignment;

            // ===== ПРИМЕНЯЕМ СТИЛИ СРАЗУ =====
            applyWidgetStyles(moduleId);

            return { hideBackground, alignment };
        } else {
            console.warn('🔵 loadWidgetSettings: failed for', moduleId, response.status);
        }
    } catch (error) {
        console.error('Error loading widget settings:', error);
    }
    return null;
}

// ===== ПРИМЕНЕНИЕ СТИЛЕЙ ВИДЖЕТА =====
function applyWidgetStyles(moduleId) {
    console.log('🔵 applyWidgetStyles called for:', moduleId);

    if (moduleId) {
        const widget = document.querySelector(`.widget[data-widget-id="${moduleId}"]`);
        if (!widget) {
            console.log('🔵 Widget not found for:', moduleId);
            return;
        }
        applyWidgetStylesToElement(widget);
        return;
    }

    document.querySelectorAll('.widget').forEach(widget => {
        applyWidgetStylesToElement(widget);
    });
}

function applyWidgetStylesToElement(widget) {
    if (!widget) return;

    const moduleId = widget.dataset.widgetId;
    const settings = widgetSettingsCache[moduleId] || {};

    console.log('🔵 applyWidgetStylesToElement:', moduleId, settings);

    // Если нет настроек в кэше — загружаем
    if (Object.keys(settings).length === 0) {
        console.log('🔵 No settings in cache for', moduleId, 'loading...');
        loadWidgetSettings(moduleId);
        return;
    }

    const hideBackground = settings.hideBackground || false;
    const alignment = settings.alignment || 'center-center';

    console.log('🔵 Applying styles to', moduleId, { hideBackground, alignment });

    // ===== ПРИМЕНЯЕМ СКРЫТИЕ ФОНА =====
    if (hideBackground) {
        widget.style.background = 'transparent';
        widget.style.backdropFilter = 'none';
        widget.style.border = 'none';
        widget.style.boxShadow = 'none';
        widget.style.padding = '4px';
        widget.style.backgroundColor = 'transparent';
        widget.style.overflow = 'visible';
        widget.style.setProperty('background', 'transparent', 'important');
        widget.style.setProperty('backdrop-filter', 'none', 'important');

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
        widget.style.setProperty('background', '', 'important');
        widget.style.setProperty('backdrop-filter', '', 'important');

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

    // ===== ПРИМЕНЯЕМ ВЫРАВНИВАНИЕ =====
    let contentContainer = null;
    contentContainer = widget.querySelector('.link-grid');

    if (!contentContainer) {
        const wrapper = widget.querySelector('.widget-content-wrapper');
        if (wrapper) {
            const children = wrapper.children;
            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                if (!child.classList.contains('module-settings') && child.children && child.children.length > 0) {
                    contentContainer = child;
                    break;
                }
            }
        }
    }

    if (!contentContainer) {
        contentContainer = widget.querySelector('.widget-content') || widget.querySelector('.module-content');
    }

    if (contentContainer) {
        const [vertical, horizontal] = alignment.split('-');

        contentContainer.style.display = 'flex';
        contentContainer.style.flexWrap = 'wrap';
        contentContainer.style.flex = '1';
        contentContainer.style.width = '100%';
        contentContainer.style.height = '100%';
        contentContainer.style.minHeight = '60px';
        contentContainer.style.gap = '10px';
        contentContainer.style.padding = '8px';
        contentContainer.style.alignContent = 'center';
        contentContainer.style.boxSizing = 'border-box';

        switch (horizontal) {
            case 'left': contentContainer.style.justifyContent = 'flex-start'; break;
            case 'center': contentContainer.style.justifyContent = 'center'; break;
            case 'right': contentContainer.style.justifyContent = 'flex-end'; break;
            default: contentContainer.style.justifyContent = 'center';
        }

        switch (vertical) {
            case 'top':
                contentContainer.style.alignItems = 'flex-start';
                contentContainer.style.alignContent = 'flex-start';
                break;
            case 'center':
                contentContainer.style.alignItems = 'center';
                contentContainer.style.alignContent = 'center';
                break;
            case 'bottom':
                contentContainer.style.alignItems = 'flex-end';
                contentContainer.style.alignContent = 'flex-end';
                break;
            default:
                contentContainer.style.alignItems = 'center';
                contentContainer.style.alignContent = 'center';
        }
    }

    const wrapper = widget.querySelector('.widget-content-wrapper');
    if (wrapper) {
        wrapper.style.display = 'flex';
        wrapper.style.flex = '1';
        wrapper.style.flexDirection = 'column';
        wrapper.style.minHeight = '0';
        wrapper.style.overflow = 'visible';
    }
}


// ===== ВОССТАНОВЛЕНИЕ НАСТРОЕК ПОСЛЕ ПЕРЕЗАГРУЗКИ =====
function restoreAllWidgetSettings() {
    console.log('🔄 Restoring all widget settings');

    const widgets = document.querySelectorAll('.widget');
    console.log('🔄 Found widgets:', widgets.length);

    if (widgets.length === 0) {
        console.log('🔄 No widgets found, will retry...');
        return;
    }

    // Загружаем настройки для каждого виджета
    let pendingRequests = 0;
    let completedRequests = 0;

    widgets.forEach(widget => {
        const moduleId = widget.dataset.widgetId;
        if (moduleId) {
            pendingRequests++;
            console.log('🔄 Loading settings for widget:', moduleId);

            // Загружаем настройки и применяем
            loadWidgetSettings(moduleId).then(() => {
                completedRequests++;
                console.log(`🔄 Settings loaded for ${moduleId} (${completedRequests}/${pendingRequests})`);
            });
        }
    });

    // После загрузки всех настроек, применяем стили повторно
    setTimeout(() => {
        widgets.forEach(widget => {
            const moduleId = widget.dataset.widgetId;
            if (moduleId) {
                applyWidgetStyles(moduleId);
            }
        });
        console.log('🔄 All styles reapplied');
    }, 500);
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
            settingsDiv.innerHTML = wrapSettingsInDarkTheme(`
                <div style="text-align:center; color:#ff6b6b; padding:10px; font-size:13px;">
                    ❌ Неверный ID модуля
                </div>
            `);
            return;
        }

        console.log('loadModuleSettings: Loading settings for module', numericId, 'type:', moduleType);

        // ===== ВАЖНО: Сначала загружаем настройки с сервера и применяем их =====
        await loadWidgetSettings(numericId);

        const response = await fetch(`/api/modules/${numericId}/settings`);

        if (response.ok) {
            const data = await response.json();
            console.log('Settings data loaded:', data);

            const content = data.content || {};

            // ===== ВАЖНО: Используем НАСТОЯЩИЕ настройки из кэша =====
            // Не из data, а из widgetSettingsCache!
            const cachedSettings = widgetSettingsCache[numericId] || {};
            const hideBackground = cachedSettings.hideBackground || false;
            const alignment = cachedSettings.alignment || 'center-center';

            console.log('🔵 Using cached settings for UI:', { hideBackground, alignment });

            // Убеждаемся, что кэш обновлён
            if (!widgetSettingsCache[numericId]) {
                widgetSettingsCache[numericId] = {};
            }
            widgetSettingsCache[numericId].hideBackground = hideBackground;
            widgetSettingsCache[numericId].alignment = alignment;

            // Применяем стили к виджету
            applyWidgetStyles(numericId);

            let html = '';

            // 1. ОБЩИЕ НАСТРОЙКИ ВИДЖЕТА (передаём реальные значения)
            html += renderWidgetSettings(numericId, hideBackground, alignment);

            // 2. СПЕЦИФИЧНЫЕ НАСТРОЙКИ МОДУЛЯ
            let contentHtml = '';

            if (moduleType === 'LINK') {
                if (typeof window.renderLinkSettings === 'function') {
                    contentHtml = window.renderLinkSettings(data, numericId);
                } else {
                    contentHtml = `
                        <div style="text-align:center; opacity:0.5; padding:10px; font-size:13px; color:rgba(255,255,255,0.5);">
                            ⚠️ Функция настроек LINK не загружена
                        </div>
                    `;
                }
            } else if (moduleType === 'CLOCK' && typeof window.renderClockSettings === 'function') {
                contentHtml = window.renderClockSettings(data);
            } else if (moduleType === 'WEATHER' && typeof window.renderWeatherSettings === 'function') {
                contentHtml = window.renderWeatherSettings(data);
            } else if (moduleType === 'NEXTCLOUD' && typeof window.renderNextcloudSettings === 'function') {
                contentHtml = window.renderNextcloudSettings(data);
            } else {
                contentHtml = `
                    <div style="text-align:center; opacity:0.5; padding:10px; font-size:13px; color:rgba(255,255,255,0.5);">
                        Настройки для модуля "${moduleType}" не найдены
                    </div>
                `;
            }

            if (contentHtml && contentHtml.trim()) {
                html += wrapSettingsInDarkTheme(`
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px;">
                        <span style="font-size:12px; font-weight:600; opacity:0.6; color:rgba(255,255,255,0.6); letter-spacing:0.5px; text-transform:uppercase;">
                            🔧 Настройки контента
                        </span>
                        <span style="font-size:10px; opacity:0.3; color:rgba(255,255,255,0.3);">${moduleType}</span>
                    </div>
                    ${contentHtml}
                `);
            }

            settingsDiv.innerHTML = html;

            // Инициализируем события для общих настроек
            initWidgetSettingsEvents(numericId, settingsDiv);

            // Инициализируем события для специфичных настроек
            if (moduleType === 'LINK' && typeof window.initLinkSettingsEvents === 'function') {
                window.initLinkSettingsEvents(numericId, settingsDiv);
            } else if (moduleType === 'CLOCK' && typeof window.initClockSettingsEvents === 'function') {
                window.initClockSettingsEvents(numericId, settingsDiv);
            } else if (moduleType === 'WEATHER' && typeof window.initWeatherSettingsEvents === 'function') {
                window.initWeatherSettingsEvents(numericId, settingsDiv);
            } else if (moduleType === 'NEXTCLOUD' && typeof window.initNextcloudSettingsEvents === 'function') {
                window.initNextcloudSettingsEvents(numericId, settingsDiv);
            }

        } else if (response.status === 404) {
            settingsDiv.innerHTML = wrapSettingsInDarkTheme(`
                <div style="text-align:center; opacity:0.5; padding:10px; font-size:13px; color:rgba(255,255,255,0.5);">
                    Настройки не найдены
                </div>
            `);
        } else {
            settingsDiv.innerHTML = wrapSettingsInDarkTheme(`
                <div style="text-align:center; color:#ff6b6b; padding:10px; font-size:13px;">
                    ❌ Ошибка загрузки настроек (${response.status})
                </div>
            `);
        }
    } catch (error) {
        console.error('Error loading module settings:', error);
        settingsDiv.innerHTML = wrapSettingsInDarkTheme(`
            <div style="text-align:center; color:#ff6b6b; padding:10px; font-size:13px;">
                ❌ Ошибка загрузки настроек: ${error.message}
            </div>
        `);
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

// ===== ПЕРЕОПРЕДЕЛЯЕМ loadGridData =====
const originalLoadGridData = window.loadGridData || function() {};

window.loadGridData = async function() {
    console.log('🔄 loadGridData called - restoring settings after grid update');

    if (typeof originalLoadGridData === 'function') {
        await originalLoadGridData();
    }

    // Несколько попыток восстановления
    setTimeout(() => {
        if (typeof restoreAllWidgetSettings === 'function') {
            console.log('🔄 Restoring after grid update (attempt 1)');
            restoreAllWidgetSettings();
        }
    }, 200);

    setTimeout(() => {
        if (typeof restoreAllWidgetSettings === 'function') {
            console.log('🔄 Restoring after grid update (attempt 2)');
            restoreAllWidgetSettings();
        }
    }, 500);

    setTimeout(() => {
        if (typeof restoreAllWidgetSettings === 'function') {
            console.log('🔄 Restoring after grid update (attempt 3)');
            restoreAllWidgetSettings();
        }
    }, 800);
};

// ===== ЭКСПОРТ =====
window.renderWidgetSettings = renderWidgetSettings;
window.wrapSettingsInDarkTheme = wrapSettingsInDarkTheme;
window.setAlignment = setAlignment;
window.initWidgetSettingsEvents = initWidgetSettingsEvents;
window.saveWidgetSetting = saveWidgetSetting;
window.loadWidgetSettings = loadWidgetSettings;
window.applyWidgetStyles = applyWidgetStyles;
window.restoreAllWidgetSettings = restoreAllWidgetSettings;
window.toggleModuleSettings = toggleModuleSettings;
window.loadModuleSettings = loadModuleSettings;
window.initializeModules = initializeModules;
window.widgetSettingsCache = widgetSettingsCache;
window.initModules = initModules;
window.addTodo = addTodo;
window.loadTodos = loadTodos;
window.toggleTodo = toggleTodo;
window.deleteTodo = deleteTodo;

console.log('✅ modules.js 2.6 loaded');
console.log('✅ toggleModuleSettings exported:', typeof window.toggleModuleSettings === 'function');
console.log('✅ setAlignment exported:', typeof window.setAlignment === 'function');