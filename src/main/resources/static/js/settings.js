/**
 * SETTINGS.JS - Панель настроек
 */

// ===== ОТКРЫТИЕ/ЗАКРЫТИЕ =====
function toggleSettings() {
    const overlay = document.getElementById('settingsOverlay');
    if (!overlay) {
        return;
    }

    overlay.classList.toggle('active');

    if (overlay.classList.contains('active')) {
        document.body.style.overflow = 'hidden';
        loadSettings();
    } else {
        document.body.style.overflow = '';
    }
}

// ===== ЗАГРУЗКА НАСТРОЕК =====
async function loadSettings() {
    try {
        const response = await fetch(`/api/settings/${currentPageId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        settingsData = await response.json();
        renderSettings(settingsData);

        // ===== ЗАГРУЖАЕМ НАСТРОЙКИ ССЫЛОК =====
        await loadLinkSettings();

        // ===== ПРИНУДИТЕЛЬНАЯ СИНХРОНИЗАЦИЯ ЧЕКБОКСА =====
        const checkbox = document.getElementById('showAddLinkButton');
        if (checkbox && linkSettings) {
            const shouldBeChecked = linkSettings.showAddLinkButton === true;
            checkbox.checked = shouldBeChecked;
        }
    } catch (error) {
        showToast('❌ Ошибка загрузки настроек');
    }
}

// ===== РЕНДЕРИНГ НАСТРОЕК =====
function renderSettings(data) {
    renderAvailableModules(data);
    renderLinksSettings(data.links);
    renderModulesSettings(data.modules);

    if (typeof WallpaperModule !== 'undefined' && currentPageId) {
        WallpaperModule.loadData().then(data => {
            if (data) {
                WallpaperModule.updateUI(data);
                WallpaperModule.render();
            }
        });
    }
}

// ============================================================
// НАСТРОЙКИ ССЫЛОК
// ============================================================

async function loadLinkSettings() {
    console.log('🟡 loadLinkSettings START');
    try {
        const response = await fetch(`/api/pages/${currentPageId}/links/settings`);
        if (response.ok) {
            const settings = await response.json();
            console.log('🟡 Settings from server:', settings);

            linkSettings = {
                iconSize: settings.linkIconSize || settings.iconSize || 28,
                fontSize: settings.linkFontSize || settings.fontSize || 12,
                bgOpacity: settings.linkBgOpacity || settings.bgOpacity || 15,
                bgDarkness: settings.linkBgDarkness || settings.bgDarkness || 0,
                showAddLinkButton: settings.showAddLinkButton !== undefined ? settings.showAddLinkButton : true
            };
            console.log('🟡 linkSettings after load:', linkSettings);
            console.log('🟡 showAddLinkButton:', linkSettings.showAddLinkButton);

            // Устанавливаем значения ползунков
            const iconSlider = document.getElementById('linkIconSize');
            if (iconSlider) {
                iconSlider.value = linkSettings.iconSize;
            }

            const fontSlider = document.getElementById('linkFontSize');
            if (fontSlider) {
                fontSlider.value = linkSettings.fontSize;
            }

            const opacitySlider = document.getElementById('linkBgOpacity');
            if (opacitySlider) {
                opacitySlider.value = linkSettings.bgOpacity;
            }

            const darknessSlider = document.getElementById('linkBgDarkness');
            if (darknessSlider) {
                darknessSlider.value = linkSettings.bgDarkness;
            }

            // ===== ОБНОВЛЯЕМ ЧЕКБОКС =====
            const checkbox = document.getElementById('showAddLinkButton');
            if (checkbox) {
                checkbox.checked = linkSettings.showAddLinkButton;
                console.log('🟡 Checkbox set to:', checkbox.checked);
            }

            // Обновляем отображение
            updateLinkSettingsDisplay(linkSettings);

            // Применяем стили
            applyLinkStylesFromSettings(linkSettings);

            // Пересоздаем иконки
            if (typeof recreateLinkIcons === 'function') {
                recreateLinkIcons(linkSettings);
            }

            // ===== ПЕРЕРИСОВЫВАЕМ ССЫЛКИ =====
            if (typeof renderLinks === 'function') {
                renderLinks();
                console.log('🟡 renderLinks called from loadLinkSettings');
            }
        }
    } catch (error) {
        console.error('🔴 Error loading link settings:', error);
    }
    console.log('🟡 loadLinkSettings END');
}

function updateLinkSettingsDisplay(settings) {
    const iconSize = settings.iconSize || 28;
    const fontSize = settings.fontSize || 12;
    const bgOpacity = settings.bgOpacity || 15;
    const bgDarkness = settings.bgDarkness || 0;

    const iconSizeSpan = document.getElementById('iconSizeValue');
    if (iconSizeSpan) iconSizeSpan.textContent = iconSize + 'px';

    const fontSizeSpan = document.getElementById('fontSizeValue');
    if (fontSizeSpan) fontSizeSpan.textContent = fontSize + 'px';

    const opacitySpan = document.getElementById('bgOpacityValue');
    if (opacitySpan) opacitySpan.textContent = bgOpacity + '%';

    const darknessSpan = document.getElementById('bgDarknessValue');
    if (darknessSpan) {
        let darknessText = 'Нейтральный';
        if (bgDarkness > 10) darknessText = 'Светлее';
        if (bgDarkness < -10) darknessText = 'Темнее';
        darknessSpan.textContent = darknessText + ' (' + bgDarkness + '%)';
    }
}

async function updateLinkSetting(key, value) {
    try {
        // Получаем текущие значения из ползунков
        const iconSlider = document.getElementById('linkIconSize');
        const fontSlider = document.getElementById('linkFontSize');
        const opacitySlider = document.getElementById('linkBgOpacity');
        const darknessSlider = document.getElementById('linkBgDarkness');

        if (!iconSlider || !fontSlider || !opacitySlider || !darknessSlider) {
            showToast('❌ Ошибка: не найдены элементы управления');
            return;
        }

        const settings = {
            iconSize: parseInt(iconSlider.value) || 28,
            fontSize: parseInt(fontSlider.value) || 12,
            bgOpacity: parseInt(opacitySlider.value) || 15,
            bgDarkness: parseInt(darknessSlider.value) || 0
        };

        const response = await fetch(`/api/pages/${currentPageId}/links/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });

        if (response.ok) {
            const savedSettings = await response.json();

            // ===== ВАЖНО: Извлекаем правильные значения =====
            const updatedSettings = {
                iconSize: savedSettings.linkIconSize || settings.iconSize || 28,
                fontSize: savedSettings.linkFontSize || settings.fontSize || 12,
                bgOpacity: savedSettings.linkBgOpacity || settings.bgOpacity || 15,
                bgDarkness: savedSettings.linkBgDarkness || settings.bgDarkness || 0
            };

            // Сохраняем в глобальную переменную
            linkSettings = updatedSettings;

            // Обновляем отображение в UI
            updateLinkSettingsDisplay(updatedSettings);

            // Применяем стили с обновленными настройками
            applyLinkStylesFromSettings(updatedSettings);

            // Пересоздаем иконки с обновленным размером
            if (typeof recreateLinkIcons === 'function') {
                recreateLinkIcons(updatedSettings);
            }

            showToast('✅ Настройки обновлены');
        } else {
            const error = await response.text();
            showToast('❌ Ошибка сохранения: ' + error);
        }
    } catch (error) {
        showToast('❌ Ошибка обновления настроек');
    }
}

async function updateShowAddButton(checked) {
    console.log('🟢 updateShowAddButton START, checked:', checked);
    try {
        const response = await fetch(`/api/pages/${currentPageId}/show-add-button`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ show: checked })
        });

        if (response.ok) {
            const data = await response.json();
            console.log('🟢 Server response:', data);

            // Обновляем linkSettings
            if (linkSettings) {
                linkSettings.showAddLinkButton = checked;
                console.log('🟢 linkSettings.showAddLinkButton =', linkSettings.showAddLinkButton);
            }

            // Перерисовываем ссылки
            if (typeof renderLinks === 'function') {
                renderLinks();
                console.log('🟢 renderLinks called');
            }

            showToast(checked ? '✅ Кнопка добавления включена' : '✅ Кнопка добавления выключена');
        } else {
            console.error('🟡 Server error:', await response.text());
            showToast('❌ Ошибка обновления настройки');
        }
    } catch (error) {
        console.error('🔴 Error updating show add button:', error);
        showToast('❌ Ошибка обновления настройки');
    }
    console.log('🟢 updateShowAddButton END');
}

// ============================================================
// ДОСТУПНЫЕ МОДУЛИ
// ============================================================

function renderAvailableModules(data) {
    const container = document.getElementById('availableModules');
    if (!container) {
        return;
    }

    container.innerHTML = '';

    if (!data.availableModules || data.availableModules.length === 0) {
        container.innerHTML = `
            <div style="opacity:0.5;text-align:center;padding:20px;grid-column:1/-1;">
                Нет доступных модулей
            </div>
        `;
        return;
    }

    data.availableModules.forEach(module => {
        const div = document.createElement('div');
        div.className = 'module-card' + (module.enabled ? '' : ' disabled');
        div.innerHTML = `
            <span class="icon">${module.icon || '📦'}</span>
            <div class="name">${escapeHtml(module.name || 'Модуль')}</div>
            <div class="description">${escapeHtml(module.description || '')}</div>
            <span class="badge ${module.enabled ? '' : 'disabled-badge'}">
                ${module.enabled ? '✅ Доступен' : '❌ Недоступен'}
            </span>
        `;
        if (module.enabled) {
            div.onclick = () => addModuleFromSettings(module.type, module.name);
            div.style.cursor = 'pointer';
        }
        container.appendChild(div);
    });
}

async function addModuleFromSettings(type, name) {
    let settings = {};
    if (type === 'WEATHER') {
        const city = prompt('Введите город:', 'Moscow');
        if (city === null) return;
        if (!city.trim()) {
            showToast('❌ Город не указан');
            return;
        }
        settings.city = city.trim();
    }

    try {
        const response = await fetch(`/api/pages/${currentPageId}/modules`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: type,
                title: name || type,
                settings: JSON.stringify(settings)
            })
        });
        if (response.ok) {
            showToast(`✅ Модуль "${name}" добавлен`);
            setTimeout(() => location.reload(), 500);
        } else {
            showToast('❌ Ошибка добавления модуля');
        }
    } catch (error) {
        showToast('❌ Ошибка добавления модуля');
    }
}

// ============================================================
// ССЫЛКИ В НАСТРОЙКАХ
// ============================================================

function renderLinksSettings(links) {
    const container = document.getElementById('linksList');
    if (!container) {
        return;
    }

    container.innerHTML = '';

    if (!links || links.length === 0) {
        container.innerHTML = `
            <div style="opacity:0.5;text-align:center;padding:20px;">
                Нет ссылок
            </div>
        `;
        return;
    }

    links.forEach(link => {
        const div = document.createElement('div');
        div.className = 'link-item';
        div.draggable = true;
        div.dataset.id = link.id;
        div.innerHTML = `
            <span class="icon">${link.icon || '🔗'}</span>
            <div class="info">
                <div class="title">${escapeHtml(link.title || 'Без названия')}</div>
                <div class="url">${escapeHtml(link.url || '')}</div>
            </div>
            <div class="actions">
                <button class="edit-btn" onclick="editLink(${link.id})" title="Редактировать">✏️</button>
                <button class="delete-btn" onclick="deleteLinkFromSettings(${link.id})" title="Удалить">🗑️</button>
            </div>
        `;
        container.appendChild(div);
    });
}

function addLinkFromSettings() {
    toggleSettings();
    setTimeout(() => {
        if (typeof LinksModal !== 'undefined') {
            LinksModal.open();
        }
    }, 350);
}

function editLink(id) {
    if (!settingsData || !settingsData.links) {
        showToast('❌ Данные не загружены');
        return;
    }

    const link = settingsData.links.find(l => l.id === id);
    if (!link) {
        showToast('❌ Ссылка не найдена');
        return;
    }

    const overlay = document.getElementById('settingsOverlay');
    if (overlay) {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    if (typeof LinksModal === 'undefined') {
        showToast('❌ Ошибка: модальное окно не загружено');
        return;
    }

    setTimeout(() => {
        if (typeof LinksModal.openEditWithData === 'function') {
            LinksModal.openEditWithData(link);
        } else {
            showToast('❌ Ошибка: метод редактирования не найден');
        }
    }, 350);
}

function deleteLinkFromSettings(id) {
    if (!confirm('Удалить ссылку?')) return;

    fetch(`/api/links/${id}`, { method: 'DELETE' })
        .then(response => {
            if (response.ok) {
                showToast('✅ Ссылка удалена');
                setTimeout(() => location.reload(), 500);
            } else {
                showToast('❌ Ошибка удаления ссылки');
            }
        })
        .catch(() => showToast('❌ Ошибка удаления ссылки'));
}

// ============================================================
// МОДУЛИ В НАСТРОЙКАХ
// ============================================================

function renderModulesSettings(modules) {
    const container = document.getElementById('modulesList');
    if (!container) {
        return;
    }

    container.innerHTML = '';

    if (!modules || modules.length === 0) {
        container.innerHTML = `
            <div style="opacity:0.5;text-align:center;padding:20px;">
                Нет модулей
            </div>
        `;
        return;
    }

    modules.forEach(module => {
        const div = document.createElement('div');
        div.className = 'module-item';
        div.draggable = true;
        div.dataset.id = module.id;
        div.innerHTML = `
            <span class="icon">${getModuleIcon(module.type)}</span>
            <div class="info">
                <div class="title">${escapeHtml(module.title || 'Модуль')}</div>
                <div class="type">${escapeHtml(module.type || '')}</div>
            </div>
            <div class="actions">
                <button class="edit-btn" onclick="editModule(${module.id})" title="Редактировать">✏️</button>
                <button class="delete-btn" onclick="deleteModuleFromSettings(${module.id})" title="Удалить">🗑️</button>
            </div>
        `;
        container.appendChild(div);
    });
}

function getModuleIcon(type) {
    const icons = {
        'WEATHER': '🌤️',
        'NOTES': '📝',
        'CLOCK': '🕐',
        'CALENDAR': '📅',
        'TODO': '✅',
        'RSS': '📰',
        'QUOTE': '💭',
        'COUNTER': '🔢'
    };
    return icons[type] || '📦';
}

function editModule(id) {
    if (!settingsData || !settingsData.modules) return;
    const module = settingsData.modules.find(m => m.id === id);
    if (!module) return;

    const title = prompt('Введите новый заголовок:', module.title || '');
    if (title === null) return;
    if (!title.trim()) {
        showToast('❌ Заголовок не может быть пустым');
        return;
    }

    let settings = {};
    if (module.type === 'WEATHER') {
        const currentSettings = JSON.parse(module.settings || '{}');
        const city = prompt('Введите город:', currentSettings.city || 'Moscow');
        if (city !== null && city.trim()) {
            settings.city = city.trim();
        }
    }

    fetch(`/api/modules/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            title: title.trim(),
            settings: JSON.stringify(settings)
        })
    })
        .then(response => {
            if (response.ok) {
                showToast('✅ Модуль обновлен');
                setTimeout(() => location.reload(), 500);
            } else {
                showToast('❌ Ошибка обновления модуля');
            }
        })
        .catch(() => showToast('❌ Ошибка обновления модуля'));
}

function deleteModuleFromSettings(id) {
    if (!confirm('Удалить модуль?')) return;

    fetch(`/api/modules/${id}`, { method: 'DELETE' })
        .then(response => {
            if (response.ok) {
                showToast('✅ Модуль удален');
                setTimeout(() => location.reload(), 500);
            } else {
                showToast('❌ Ошибка удаления модуля');
            }
        })
        .catch(() => showToast('❌ Ошибка удаления модуля'));
}

// ============================================================
// ЗАКРЫТИЕ НАСТРОЕК
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    const overlay = document.getElementById('settingsOverlay');
    if (overlay) {
        overlay.addEventListener('click', function(e) {
            if (e.target === this) {
                toggleSettings();
            }
        });
    }

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && overlay && overlay.classList.contains('active')) {
            toggleSettings();
        }
    });
});