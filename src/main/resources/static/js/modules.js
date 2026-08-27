/**
 * MODULES.JS - Управление модулями (общая логика)
 */

window.openEditLinkModalFromWidget = openEditLinkModalFromWidget;

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
        const numericId = parseInt(moduleId);
        if (isNaN(numericId)) {
            settingsDiv.innerHTML = `
                <div style="text-align:center; color:#ff6b6b; padding:10px; font-size:13px;">
                    ❌ Неверный ID модуля
                </div>
            `;
            return;
        }

        // Для LINK модуля - показываем настройки ссылок
        if (moduleType === 'LINK') {
            settingsDiv.innerHTML = renderLinkWidgetSettings(numericId);
            initLinkWidgetSettingsEvents(numericId, settingsDiv);
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
            loadLinkWidgetData(widgetElement);
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

// ===== ЗАГРУЗКА ССЫЛОК В ВИДЖЕТ =====
async function loadLinkWidgetData(widgetElement) {
    const linkGrid = widgetElement.querySelector('.link-grid');
    if (!linkGrid) return;

    let pageId = linkGrid.dataset.pageId;
    if (!pageId || pageId === 'undefined') {
        pageId = currentPageId;
    }

    if (!pageId) {
        linkGrid.innerHTML = `
            <div style="text-align:center; opacity:0.3; padding:10px; grid-column:1/-1;">
                ⚠️ Ошибка: ID страницы не найден
            </div>
        `;
        return;
    }

    try {
        const response = await fetch(`/api/pages/${pageId}/links`);
        if (response.ok) {
            const links = await response.json();
            if (links && links.length > 0) {
                let html = '';
                links.forEach(link => {
                    const title = link.title || 'Ссылка';
                    const url = link.url || '#';

                    // ===== ОПРЕДЕЛЯЕМ ИКОНКУ =====
                    let iconHtml = '';
                    const iconType = link.iconType || 'emoji';
                    const icon = link.icon || '🔗';
                    const customImage = link.customImage || null;

                    if (iconType === 'custom' && customImage) {
                        iconHtml = `<img src="${customImage}" alt="${title}" style="width:24px; height:24px; border-radius:4px; object-fit:cover;">`;
                    } else if (iconType === 'favicon' && icon && icon.startsWith('http')) {
                        iconHtml = `<img src="${icon}" alt="${title}" style="width:24px; height:24px; border-radius:4px; object-fit:contain; background:rgba(255,255,255,0.05); padding:2px;"
                                        onerror="this.style.display='none'; this.parentElement.querySelector('.link-icon-fallback').style.display='block'">
                                    <span class="link-icon-fallback" style="display:none; font-size:20px;">🔗</span>`;
                    } else {
                        iconHtml = `<span style="font-size:20px;">${icon}</span>`;
                    }

                    // ===== ВАЖНО: Добавляем обработчик для редактирования =====
                    const isEditing = gridState && gridState.isEditing;

                    html += `
                        <a href="${url}" target="_blank" rel="noopener noreferrer" 
                           class="link-item-link"
                           data-link-id="${link.id}"
                           data-link-title="${escapeHtml(title)}"
                           data-link-url="${url}"
                           data-link-icon="${icon}"
                           data-link-icon-type="${iconType}"
                           data-link-custom-image="${customImage || ''}"
                           style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; 
                                  padding:8px 12px; background:rgba(255,255,255,0.06); border-radius:8px; 
                                  text-decoration:none; color:rgba(255,255,255,0.85); min-width:60px; max-width:100px;
                                  min-height:70px; transition:all 0.2s; text-align:center;
                                  ${isEditing ? 'cursor:pointer; border:2px solid transparent;' : ''}
                                  ${isEditing ? 'border-color: rgba(33,150,243,0.2);' : ''}"
                           onmouseover="this.style.background='rgba(255,255,255,0.12)'"
                           onmouseout="this.style.background='rgba(255,255,255,0.06)'"
                           ${isEditing ? `onclick="event.preventDefault(); openEditLinkModalFromWidget(${link.id});"` : ''}>
                            <div style="display:flex; align-items:center; justify-content:center; width:28px; height:28px;">
                                ${iconHtml}
                            </div>
                            <span style="font-size:10px; text-align:center; max-width:80px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; opacity:0.7;">${escapeHtml(title)}</span>
                            ${isEditing ? '' : ''}
                        </a>
                    `;
                });
                linkGrid.innerHTML = html;
            } else {
                linkGrid.innerHTML = `
                    <div style="text-align:center; opacity:0.3; padding:10px; grid-column:1/-1;">
                        📭 Нет ссылок
                    </div>
                `;
            }
        } else if (response.status === 404) {
            linkGrid.innerHTML = `
                <div style="text-align:center; opacity:0.3; padding:10px; grid-column:1/-1;">
                    📭 Нет ссылок
                </div>
            `;
        } else {
            linkGrid.innerHTML = `
                <div style="text-align:center; color:#ff6b6b; padding:10px; grid-column:1/-1;">
                    ❌ Ошибка загрузки ссылок (${response.status})
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading link widget data:', error);
        linkGrid.innerHTML = `
            <div style="text-align:center; color:#ff6b6b; padding:10px; grid-column:1/-1;">
                ❌ Ошибка загрузки ссылок
            </div>
        `;
    }
}

// ===== ОТКРЫТИЕ РЕДАКТИРОВАНИЯ ИЗ ВИДЖЕТА =====
function openEditLinkModalFromWidget(linkId) {
    console.log('openEditLinkModalFromWidget called for link:', linkId);

    // Находим ссылку в виджете
    const linkElement = document.querySelector(`.link-item-link[data-link-id="${linkId}"]`);
    if (!linkElement) {
        showToast('❌ Ссылка не найдена');
        return;
    }

    // Собираем данные из data-атрибутов
    const linkData = {
        id: linkId,
        title: linkElement.dataset.linkTitle || '',
        url: linkElement.dataset.linkUrl || '',
        icon: linkElement.dataset.linkIcon || '🔗',
        iconType: linkElement.dataset.linkIconType || 'emoji',
        customImage: linkElement.dataset.linkCustomImage || null
    };

    console.log('Link data for edit:', linkData);

    if (typeof LinksModal !== 'undefined') {
        LinksModal.openEditWithData(linkData);
    } else {
        showToast('❌ Система ссылок не загружена');
    }
}

// ===== НАСТРОЙКИ LINK ВИДЖЕТА =====
function renderLinkWidgetSettings(moduleId) {
    // Получаем текущие ссылки из виджета
    const widget = document.querySelector(`.widget[data-widget-id="${moduleId}"]`);
    const linkGrid = widget ? widget.querySelector('.link-grid') : null;
    const pageId = linkGrid ? linkGrid.dataset.pageId : currentPageId;

    let html = `
        <div style="display:flex; flex-direction:column; gap:12px; padding:4px 0;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:13px; opacity:0.7;">🔗 Управление ссылками</span>
                <button class="link-add-btn" onclick="openLinkWidgetAddModal(${moduleId})" 
                        style="padding:4px 12px; border-radius:4px; background:rgba(76,175,80,0.2); 
                               border:1px solid rgba(76,175,80,0.3); color:white; cursor:pointer; font-size:12px;">
                    + Добавить
                </button>
            </div>
            <div class="link-widget-list" style="display:flex; flex-direction:column; gap:4px; max-height:200px; overflow-y:auto;">
                <div style="text-align:center; opacity:0.3; padding:10px; font-size:13px;">
                    ⏳ Загрузка ссылок...
                </div>
            </div>
        </div>
    `;

    // Загружаем ссылки асинхронно
    setTimeout(() => {
        loadLinkWidgetSettingsData(moduleId);
    }, 100);

    return html;
}

async function loadLinkWidgetSettingsData(moduleId) {
    const widget = document.querySelector(`.widget[data-widget-id="${moduleId}"]`);
    if (!widget) return;

    const linkGrid = widget.querySelector('.link-grid');
    const pageId = linkGrid ? linkGrid.dataset.pageId : currentPageId;
    const listContainer = widget.querySelector('.link-widget-list');
    if (!listContainer) return;

    try {
        const response = await fetch(`/api/pages/${pageId}/links`);
        if (response.ok) {
            const links = await response.json();
            if (links && links.length > 0) {
                let html = '';
                links.forEach(link => {
                    // ===== ОПРЕДЕЛЯЕМ ИКОНКУ =====
                    let iconDisplay = '';
                    const iconType = link.iconType || 'emoji';
                    const icon = link.icon || '🔗';
                    const customImage = link.customImage || null;

                    if (iconType === 'custom' && customImage) {
                        iconDisplay = `<img src="${customImage}" style="width:18px; height:18px; border-radius:4px; object-fit:cover;">`;
                    } else if (iconType === 'favicon' && icon && icon.startsWith('http')) {
                        iconDisplay = `<img src="${icon}" style="width:18px; height:18px; border-radius:4px; object-fit:contain; background:rgba(255,255,255,0.05); padding:2px;"
                                            onerror="this.style.display='none'; this.parentElement.textContent='🔗'">`;
                    } else {
                        iconDisplay = icon;
                    }

                    html += `
                        <div style="display:flex; align-items:center; gap:8px; padding:4px 8px; 
                                    background:rgba(255,255,255,0.03); border-radius:6px; font-size:13px;">
                            <span style="font-size:18px; width:24px; text-align:center;">${iconDisplay}</span>
                            <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${link.title || 'Ссылка'}</span>
                            <span style="font-size:11px; opacity:0.4; max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${link.url || ''}</span>
                            <button onclick="deleteLinkFromWidget(${moduleId}, ${link.id})" 
                                    style="background:rgba(244,67,54,0.2); border:none; color:rgba(255,255,255,0.5); 
                                           border-radius:50%; width:22px; height:22px; cursor:pointer; font-size:14px;">
                                ×
                            </button>
                        </div>
                    `;
                });
                listContainer.innerHTML = html;
            } else {
                listContainer.innerHTML = `
                    <div style="text-align:center; opacity:0.3; padding:10px; font-size:13px;">
                        📭 Нет ссылок
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('Error loading link settings data:', error);
        listContainer.innerHTML = `
            <div style="text-align:center; color:#ff6b6b; padding:10px; font-size:13px;">
                ❌ Ошибка загрузки ссылок
            </div>
        `;
    }
}

function initLinkWidgetSettingsEvents(moduleId, settingsContainer) {
    // События уже привязаны через onclick
}

// ===== ДОБАВЛЕНИЕ ССЫЛКИ ИЗ ВИДЖЕТА =====
function openLinkWidgetAddModal(moduleId) {
    console.log('openLinkWidgetAddModal called for module:', moduleId);
    console.log('LinksModal available?', typeof LinksModal !== 'undefined');

    if (typeof LinksModal === 'undefined') {
        console.error('LinksModal not loaded!');
        showToast('❌ Система ссылок не загружена. Обновите страницу.');
        return;
    }

    // Проверяем, что LinksModal инициализирован
    if (!LinksModal.pageId) {
        console.log('LinksModal not initialized, initializing now...');
        if (typeof currentPageId !== 'undefined' && currentPageId) {
            LinksModal.init(currentPageId);
        } else {
            showToast('❌ Ошибка: ID страницы не найден');
            return;
        }
    }

    // Устанавливаем колбэк после добавления
    LinksModal.afterSubmit(function(data) {
        console.log('Link added, refreshing widget:', moduleId);
        setTimeout(() => {
            const widget = document.querySelector(`.widget[data-widget-id="${moduleId}"]`);
            if (widget) {
                loadLinkWidgetData(widget);
                loadLinkWidgetSettingsData(parseInt(moduleId));
            }
            // Обновляем все LINK виджеты
            document.querySelectorAll('.widget.link-widget').forEach(w => {
                const wid = w.dataset.widgetId;
                if (wid !== String(moduleId)) {
                    loadLinkWidgetData(w);
                }
            });
        }, 300);
    });

    // Открываем модальное окно
    LinksModal.open();
}

// ===== УДАЛЕНИЕ ССЫЛКИ ИЗ ВИДЖЕТА =====
async function deleteLinkFromWidget(moduleId, linkId) {
    if (!confirm('Удалить ссылку?')) return;

    try {
        const response = await fetch(`/api/links/${linkId}`, { method: 'DELETE' });
        if (response.ok) {
            showToast('✅ Ссылка удалена');
            // Обновляем список в настройках виджета
            loadLinkWidgetSettingsData(moduleId);
            // Обновляем отображение в виджете
            const widget = document.querySelector(`.widget[data-widget-id="${moduleId}"]`);
            if (widget) {
                loadLinkWidgetData(widget);
            }
        } else {
            showToast('❌ Ошибка удаления ссылки');
        }
    } catch (error) {
        console.error('Error deleting link:', error);
        showToast('❌ Ошибка удаления ссылки');
    }
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