/**
 * LINKS.JS - Полная логика работы со ссылками
 * Версия: 3.9 - alignment вынесен в общие настройки
 */

// ===== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ =====
let linkModuleSettingsCache = {};

// ============================================================
// 1. РАБОТА С НАСТРОЙКАМИ
// ============================================================

function getLinkSettingsFromWidget(widgetElement) {
    if (!widgetElement) return null;

    const settingsJson = widgetElement.dataset.linkSettings;
    if (settingsJson) {
        try {
            return JSON.parse(settingsJson);
        } catch (e) {}
    }

    const moduleId = widgetElement.dataset.widgetId;
    if (moduleId && linkModuleSettingsCache[moduleId]) {
        return linkModuleSettingsCache[moduleId];
    }

    return {
        iconSize: 28,
        fontSize: 12,
        blurAmount: 15,
        bgDarkness: 0,
        hideBackground: false
    };
}

async function loadLinkSettingsFromServer(moduleId) {
    try {
        const response = await fetch(`/api/modules/${moduleId}/settings`);
        if (response.ok) {
            const data = await response.json();
            const content = data.content || {};
            const linkData = content.linkData || content.settings || {};

            linkModuleSettingsCache[moduleId] = linkData;

            const widget = document.querySelector(`.widget[data-widget-id="${moduleId}"]`);
            if (widget) {
                widget.dataset.linkSettings = JSON.stringify(linkData);
            }

            return linkData;
        }
    } catch (error) {
        console.error('Error loading link settings:', error);
    }
    return null;
}

async function saveLinkSettingToServer(moduleId, setting, value) {
    console.log('Saving link setting:', moduleId, setting, value);

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
                linkModuleSettingsCache[moduleId] = data.content.linkData;

                const widget = document.querySelector(`.widget[data-widget-id="${moduleId}"]`);
                if (widget) {
                    widget.dataset.linkSettings = JSON.stringify(data.content.linkData);
                }
            }
            console.log('✅ Link setting saved:', setting, value);
            return true;
        } else {
            console.error('❌ Failed to save link setting:', await response.text());
            return false;
        }
    } catch (error) {
        console.error('❌ Error saving link setting:', error);
        return false;
    }
}

// ============================================================
// 2. ПРИМЕНЕНИЕ СТИЛЕЙ (только LINK специфичные)
// ============================================================

function applyLinkStylesToWidget(widget, settings) {
    if (!widget) return;
    if (!settings) {
        settings = getLinkSettingsFromWidget(widget);
    }
    if (!settings) return;

    const iconSize = settings.iconSize || 28;
    const fontSize = settings.fontSize || 12;
    const blurAmount = settings.blurAmount || 15;
    const bgDarkness = settings.bgDarkness || 0;

    // ===== СТИЛИ ДЛЯ ССЫЛОК =====
    const iconSizePx = Math.max(16, Math.min(100, iconSize)) + 'px';
    const containerSize = Math.max(28, Math.min(112, iconSize + 12)) + 'px';
    const blurPx = Math.min(blurAmount / 100 * 12, 12);

    const bgOpacity = Math.max(0.04, 0.25 - (blurAmount / 100) * 0.2);
    const baseColor = `rgba(255, 255, 255, ${bgOpacity})`;
    const hoverColor = 'rgba(255, 255, 255, 0.08)';

    let darknessColor = 'transparent';
    if (bgDarkness < 0) {
        darknessColor = `rgba(0, 0, 0, ${Math.abs(bgDarkness) / 100 * 0.4})`;
    } else if (bgDarkness > 0) {
        darknessColor = `rgba(255, 255, 255, ${bgDarkness / 100 * 0.2})`;
    }

    const linkItems = widget.querySelectorAll('.link-item-link');

    linkItems.forEach(item => {
        const oldBlurLayer = item.querySelector('.blur-layer');
        if (oldBlurLayer) oldBlurLayer.remove();
        const oldDarkLayer = item.querySelector('.darkness-layer');
        if (oldDarkLayer) oldDarkLayer.remove();

        item.style.background = baseColor;
        item.style.backdropFilter = 'none';
        item.style.webkitBackdropFilter = 'none';

        item.style.boxShadow = blurPx < 3 ? '0 2px 10px rgba(0,0,0,0.06)' : '0 4px 14px rgba(0,0,0,0.08)';

        item.style.transition = 'background 0.25s ease';

        item.onmouseenter = function() {
            this.style.background = hoverColor;
        };
        item.onmouseleave = function() {
            this.style.background = baseColor;
        };

        if (blurPx > 0) {
            const blurLayer = document.createElement('div');
            blurLayer.className = 'blur-layer';
            blurLayer.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: transparent;
                backdrop-filter: blur(${blurPx}px);
                -webkit-backdrop-filter: blur(${blurPx}px);
                pointer-events: none;
                z-index: 0;
                border-radius: inherit;
                transition: none;
            `;
            item.prepend(blurLayer);
        }

        if (darknessColor !== 'transparent') {
            const darkLayer = document.createElement('div');
            darkLayer.className = 'darkness-layer';
            darkLayer.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: ${darknessColor};
                pointer-events: none;
                z-index: 1;
                border-radius: inherit;
                transition: none;
            `;
            item.prepend(darkLayer);
        }

        const iconContainer = item.querySelector('.link-icon-container');
        if (iconContainer) {
            iconContainer.style.width = containerSize;
            iconContainer.style.height = containerSize;
            iconContainer.style.position = 'relative';
            iconContainer.style.zIndex = '2';
        }

        const iconSpan = item.querySelector('.link-icon-emoji');
        if (iconSpan) {
            iconSpan.style.fontSize = iconSizePx;
            iconSpan.style.position = 'relative';
            iconSpan.style.zIndex = '2';
        }

        const iconImg = item.querySelector('.link-icon-img, .link-icon-favicon');
        if (iconImg) {
            iconImg.style.position = 'relative';
            iconImg.style.zIndex = '2';
            iconImg.style.width = '100%';
            iconImg.style.height = '100%';
        }

        const titleSpan = item.querySelector('.link-title-text');
        if (titleSpan) {
            titleSpan.style.fontSize = fontSize + 'px';
            titleSpan.style.position = 'relative';
            titleSpan.style.zIndex = '2';
        }
    });
}

// ============================================================
// 3. РЕНДЕРИНГ ССЫЛОК В ВИДЖЕТЕ
// ============================================================

async function renderLinksInWidget(widgetElement) {
    console.log('renderLinksInWidget called for:', widgetElement?.dataset?.widgetId);

    if (!widgetElement) {
        console.error('renderLinksInWidget: widgetElement is null');
        return;
    }

    const linkGrid = widgetElement.querySelector('.link-grid');
    if (!linkGrid) {
        console.warn('Link grid not found in widget:', widgetElement);
        return;
    }

    let pageId = linkGrid.dataset.pageId;
    if (!pageId || pageId === 'undefined' || pageId === 'null') {
        pageId = window.currentPageId;
    }

    if (!pageId) {
        console.error('Page ID not found for widget:', widgetElement.dataset.widgetId);
        linkGrid.innerHTML = `
            <div style="text-align:center; opacity:0.3; padding:10px; grid-column:1/-1; color: rgba(255,255,255,0.5);">
                ⚠️ Ошибка: ID страницы не найден
            </div>
        `;
        return;
    }

    try {
        const moduleId = widgetElement.dataset.widgetId;
        console.log('Loading links for module:', moduleId, 'page:', pageId);

        let settings = linkModuleSettingsCache[moduleId];
        if (!settings) {
            settings = await loadLinkSettingsFromServer(moduleId);
        }
        if (!settings) {
            settings = { iconSize: 28, fontSize: 12, blurAmount: 15, bgDarkness: 0, hideBackground: false };
        }

        const iconSize = settings.iconSize || 28;
        const fontSize = settings.fontSize || 12;
        const blurAmount = settings.blurAmount || 15;
        const bgDarkness = settings.bgDarkness || 0;

        const iconSizePx = Math.max(16, Math.min(100, iconSize)) + 'px';
        const containerSize = Math.max(28, Math.min(112, iconSize + 12)) + 'px';
        const blurPx = Math.min(blurAmount / 100 * 12, 12);

        const bgOpacity = Math.max(0.04, 0.25 - (blurAmount / 100) * 0.2);
        const baseColor = `rgba(255, 255, 255, ${bgOpacity})`;
        const hoverColor = 'rgba(255, 255, 255, 0.08)';

        let darknessColor = 'transparent';
        if (bgDarkness < 0) {
            darknessColor = `rgba(0, 0, 0, ${Math.abs(bgDarkness) / 100 * 0.4})`;
        } else if (bgDarkness > 0) {
            darknessColor = `rgba(255, 255, 255, ${bgDarkness / 100 * 0.2})`;
        }

        const isEditing = window.gridState && window.gridState.isEditing;

        const response = await fetch(`/api/pages/${pageId}/links`);
        if (!response.ok) {
            console.error('Failed to load links:', response.status);
            linkGrid.innerHTML = `
                <div style="text-align:center; color:#ff6b6b; padding:10px; grid-column:1/-1;">
                    ❌ Ошибка загрузки ссылок (${response.status})
                </div>
            `;
            return;
        }

        const links = await response.json();
        console.log('Links loaded:', links ? links.length : 0);

        let html = '';

        if (links && links.length > 0) {
            links.forEach(link => {
                const title = link.title || 'Ссылка';
                const url = link.url || '#';

                const iconType = link.iconType || 'emoji';
                const icon = link.icon || '🔗';
                const customImage = link.customImage || null;

                let iconHtml = '';
                if (iconType === 'custom' && customImage) {
                    iconHtml = `
                        <img src="${customImage}" alt="${title}" class="link-icon-img" 
                             style="width:100%; height:100%; border-radius:4px; object-fit:cover; position:relative; z-index:2;">
                    `;
                } else if (iconType === 'favicon' && icon && icon.startsWith('http')) {
                    iconHtml = `
                        <img src="${icon}" alt="${title}" class="link-icon-favicon" 
                             style="width:100%; height:100%; border-radius:4px; object-fit:contain; background:rgba(255,255,255,0.03); padding:2px; position:relative; z-index:2;"
                             onerror="this.style.display='none'; this.parentElement.querySelector('.link-icon-emoji').style.display='block'">
                        <span class="link-icon-emoji" style="display:none; font-size:${iconSizePx}; position:relative; z-index:2;">🔗</span>
                    `;
                } else {
                    iconHtml = `
                        <span class="link-icon-emoji" style="font-size:${iconSizePx}; position:relative; z-index:2;">${icon}</span>
                    `;
                }

                const clickHandler = isEditing
                    ? `onclick="event.preventDefault(); openEditLinkModalFromWidget(${link.id});"`
                    : '';

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
                              padding:8px 12px; background:${baseColor}; border-radius:8px; 
                              text-decoration:none; color:rgba(255,255,255,0.85); min-width:60px; max-width:100px;
                              min-height:70px; transition:background 0.25s ease; text-align:center; position:relative;
                              ${isEditing ? 'cursor:pointer; border:2px solid rgba(33,150,243,0.2);' : 'border:1px solid rgba(255,255,255,0.04);'}
                              box-shadow: ${blurPx < 3 ? '0 2px 10px rgba(0,0,0,0.06)' : '0 4px 14px rgba(0,0,0,0.08)'};"
                       onmouseenter="this.style.background='${hoverColor}'"
                       onmouseleave="this.style.background='${baseColor}'"
                       ${clickHandler}>
                        ${blurPx > 0 ? `
                            <div class="blur-layer" style="position:absolute; top:0; left:0; right:0; bottom:0; background:transparent; backdrop-filter:blur(${blurPx}px); -webkit-backdrop-filter:blur(${blurPx}px); pointer-events:none; z-index:0; border-radius:inherit;"></div>
                        ` : ''}
                        ${darknessColor !== 'transparent' ? `
                            <div class="darkness-layer" style="position:absolute; top:0; left:0; right:0; bottom:0; background:${darknessColor}; pointer-events:none; z-index:1; border-radius:inherit;"></div>
                        ` : ''}
                        <div class="link-icon-container" style="display:flex; align-items:center; justify-content:center; width:${containerSize}; height:${containerSize}; position:relative; z-index:2; flex-shrink:0;">
                            ${iconHtml}
                        </div>
                        <span class="link-title-text" style="font-size:${fontSize}px; text-align:center; max-width:80px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; opacity:0.7; position:relative; z-index:2;">${escapeHtml(title)}</span>
                        ${isEditing ? `<span style="position:absolute; top:2px; right:4px; font-size:10px; opacity:0.4; z-index:3;">✏️</span>` : ''}
                    </a>
                `;
            });
        }

        if (!links || links.length === 0) {
            html = `
                <div style="text-align:center; opacity:0.3; padding:10px; grid-column:1/-1; color: rgba(255,255,255,0.5);">
                    📭 Нет ссылок
                </div>
            `;
        }

        linkGrid.innerHTML = html;
        console.log('✅ Links rendered successfully for module:', moduleId);

        // Применяем стили к новым ссылкам
        applyLinkStylesToWidget(widgetElement, settings);

        // Применяем общие стили виджета (выравнивание и фон)
        if (typeof window.applyWidgetStyles === 'function') {
            window.applyWidgetStyles(widgetElement);
        }

    } catch (error) {
        console.error('Error rendering links:', error);
        linkGrid.innerHTML = `
            <div style="text-align:center; color:#ff6b6b; padding:10px; grid-column:1/-1;">
                ❌ Ошибка загрузки ссылок: ${error.message}
            </div>
        `;
    }
}

// ============================================================
// 4. РЕНДЕРИНГ НАСТРОЕК LINK (только специфичные)
// ============================================================

function renderLinkSettings(data, moduleId) {
    console.log('Rendering link content settings for module:', moduleId);

    const content = data.content || {};
    const linkData = content.linkData || content.settings || {};

    const iconSize = linkData.iconSize || 28;
    const fontSize = linkData.fontSize || 12;
    const blurAmount = linkData.blurAmount || 15;
    const bgDarkness = linkData.bgDarkness || 0;

    return `
        <div class="link-settings-container" data-module-id="${moduleId}">
            <div style="display:flex; flex-direction:column; gap:14px;">
                <!-- РАЗМЕР ИКОНКИ -->
                <div>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <label style="font-size:12px; opacity:0.6; color:rgba(255,255,255,0.6);">Размер иконки</label>
                        <span style="font-size:12px; opacity:0.4; color:rgba(255,255,255,0.4);" id="iconSizeVal_${moduleId}">${iconSize}px</span>
                    </div>
                    <input type="range" class="link-slider" data-module="${moduleId}" data-setting="iconSize"
                           min="16" max="100" value="${iconSize}" step="1"
                           style="width:100%; accent-color:#4CAF50; cursor:pointer; touch-action:none; background:transparent; height:4px;">
                </div>

                <!-- РАЗМЕР ТЕКСТА -->
                <div>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <label style="font-size:12px; opacity:0.6; color:rgba(255,255,255,0.6);">Размер текста</label>
                        <span style="font-size:12px; opacity:0.4; color:rgba(255,255,255,0.4);" id="fontSizeVal_${moduleId}">${fontSize}px</span>
                    </div>
                    <input type="range" class="link-slider" data-module="${moduleId}" data-setting="fontSize"
                           min="8" max="24" value="${fontSize}" step="1"
                           style="width:100%; accent-color:#4CAF50; cursor:pointer; touch-action:none; background:transparent; height:4px;">
                </div>

                <!-- РАЗМЫТИЕ ФОНА -->
                <div>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <label style="font-size:12px; opacity:0.6; color:rgba(255,255,255,0.6);">Размытие фона</label>
                        <span style="font-size:12px; opacity:0.4; color:rgba(255,255,255,0.4);" id="blurAmountVal_${moduleId}">${blurAmount}%</span>
                    </div>
                    <input type="range" class="link-slider" data-module="${moduleId}" data-setting="blurAmount"
                           min="0" max="100" value="${blurAmount}" step="1"
                           style="width:100%; accent-color:#4CAF50; cursor:pointer; touch-action:none; background:transparent; height:4px;">
                </div>

                <!-- ЗАТЕМНЕНИЕ ФОНА -->
                <div>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <label style="font-size:12px; opacity:0.6; color:rgba(255,255,255,0.6);">Затемнение фона</label>
                        <span style="font-size:12px; opacity:0.4; color:rgba(255,255,255,0.4);" id="bgDarknessVal_${moduleId}">
                            ${bgDarkness < 0 ? 'Темнее' : bgDarkness > 0 ? 'Светлее' : 'Нейтральный'} (${bgDarkness}%)
                        </span>
                    </div>
                    <input type="range" class="link-slider" data-module="${moduleId}" data-setting="bgDarkness"
                           min="-50" max="50" value="${bgDarkness}" step="1"
                           style="width:100%; accent-color:#4CAF50; cursor:pointer; touch-action:none; background:transparent; height:4px;">
                </div>

                <!-- КНОПКА ДОБАВЛЕНИЯ -->
                <div style="margin-top:4px; padding-top:8px; border-top:1px solid rgba(255,255,255,0.06);">
                    <button onclick="openLinkWidgetAddModal(${moduleId})" 
                            class="link-add-button"
                            style="width:100%; padding:8px 16px; border-radius:6px;
                                   background:rgba(76,175,80,0.15); border:1px solid rgba(76,175,80,0.3);
                                   color:rgba(255,255,255,0.8); cursor:pointer;
                                   font-size:13px; transition:all 0.3s ease;
                                   display:flex; align-items:center; justify-content:center; gap:8px;"
                            onmouseover="this.style.background='rgba(76,175,80,0.25)';"
                            onmouseout="this.style.background='rgba(76,175,80,0.15)';">
                        <span style="font-size:18px;">➕</span>
                        Добавить ссылку
                    </button>
                </div>

                <div style="padding:8px 12px; border-radius:6px; background:rgba(255,255,255,0.03); 
                            border:1px solid rgba(255,255,255,0.05); font-size:11px; opacity:0.4; color:rgba(255,255,255,0.4); text-align:center;">
                    💡 Настройки применяются автоматически
                </div>
            </div>
        </div>
    `;
}

// ===== ИНИЦИАЛИЗАЦИЯ СОБЫТИЙ НАСТРОЕК =====
function initLinkSettingsEvents(moduleId, settingsContainer) {
    console.log('Initializing link settings events for module:', moduleId);

    const sliders = settingsContainer.querySelectorAll('.link-slider');
    sliders.forEach(slider => {
        const setting = slider.dataset.setting;
        const moduleIdFromSlider = slider.dataset.module;

        const newSlider = slider.cloneNode(true);
        slider.parentNode.replaceChild(newSlider, slider);

        newSlider.addEventListener('mousedown', function(e) {
            e.stopPropagation();
        });

        newSlider.addEventListener('touchstart', function(e) {
            e.stopPropagation();
        });

        newSlider.addEventListener('input', function(e) {
            e.stopPropagation();
            const value = parseInt(this.value);
            updateLinkSettingDisplay(moduleIdFromSlider, setting, value);
            applyLinkSettingPreview(moduleIdFromSlider, setting, value);
        });

        newSlider.addEventListener('change', function(e) {
            e.stopPropagation();
            const value = parseInt(this.value);
            saveLinkSettingToServer(moduleIdFromSlider, setting, value);
        });
    });
}

function updateLinkSettingDisplay(moduleId, setting, value) {
    const idMap = {
        'iconSize': 'iconSizeVal',
        'fontSize': 'fontSizeVal',
        'blurAmount': 'blurAmountVal',
        'bgDarkness': 'bgDarknessVal'
    };

    const elementId = idMap[setting];
    if (!elementId) return;

    const el = document.getElementById(elementId + '_' + moduleId);
    if (!el) return;

    if (setting === 'bgDarkness') {
        let label = 'Нейтральный';
        if (value < 0) label = 'Темнее';
        if (value > 0) label = 'Светлее';
        el.textContent = `${label} (${value}%)`;
    } else if (setting === 'iconSize' || setting === 'fontSize') {
        el.textContent = value + 'px';
    } else {
        el.textContent = value + '%';
    }
}

function applyLinkSettingPreview(moduleId, setting, value) {
    const widget = document.querySelector(`.widget[data-widget-id="${moduleId}"]`);
    if (!widget) return;

    const currentSettings = linkModuleSettingsCache[moduleId] || {};
    currentSettings[setting] = value;
    linkModuleSettingsCache[moduleId] = currentSettings;

    applyLinkStylesToWidget(widget, currentSettings);
}

// ============================================================
// 5. УПРАВЛЕНИЕ НАСТРОЙКАМИ
// ============================================================

async function loadLinkWidgetData(widgetElement) {
    if (!widgetElement) return;
    const widgetType = widgetElement.dataset.widgetType;
    if (widgetType !== 'LINK') return;
    await renderLinksInWidget(widgetElement);
}

async function refreshAllLinkWidgets() {
    console.log('refreshAllLinkWidgets called');
    const widgets = document.querySelectorAll('.widget.link-widget');
    for (const widget of widgets) {
        await loadLinkWidgetData(widget);
    }
}

// ============================================================
// 6. РАБОТА С МОДАЛЬНЫМ ОКНОМ
// ============================================================

function openEditLinkModalFromWidget(linkId) {
    console.log('openEditLinkModalFromWidget called for link:', linkId);

    const linkElement = document.querySelector(`.link-item-link[data-link-id="${linkId}"]`);
    if (!linkElement) {
        showToast('❌ Ссылка не найдена');
        return;
    }

    const linkData = {
        id: linkId,
        title: linkElement.dataset.linkTitle || '',
        url: linkElement.dataset.linkUrl || '',
        icon: linkElement.dataset.linkIcon || '🔗',
        iconType: linkElement.dataset.linkIconType || 'emoji',
        customImage: linkElement.dataset.linkCustomImage || null
    };

    if (typeof LinksModal !== 'undefined') {
        LinksModal.openEditWithData(linkData);
        LinksModal.afterSubmit(function(data) {
            refreshAllLinkWidgets();
        });
    } else {
        showToast('❌ Система ссылок не загружена');
    }
}

function openLinkWidgetAddModal(moduleId) {
    console.log('openLinkWidgetAddModal called for module:', moduleId);

    if (typeof LinksModal === 'undefined') {
        showToast('❌ Система ссылок не загружена. Обновите страницу.');
        return;
    }

    if (!LinksModal.pageId) {
        if (typeof currentPageId !== 'undefined' && currentPageId) {
            LinksModal.init(currentPageId);
        } else {
            showToast('❌ Ошибка: ID страницы не найден');
            return;
        }
    }

    LinksModal.afterSubmit(function(data) {
        setTimeout(() => {
            refreshAllLinkWidgets();
        }, 300);
    });

    LinksModal.open();
}

async function deleteLink(linkId) {
    if (!confirm('Удалить ссылку?')) return;

    try {
        const response = await fetch(`/api/links/${linkId}`, { method: 'DELETE' });
        if (response.ok) {
            showToast('✅ Ссылка удалена');
            refreshAllLinkWidgets();
        } else {
            showToast('❌ Ошибка удаления ссылки');
        }
    } catch (error) {
        console.error('Error deleting link:', error);
        showToast('❌ Ошибка удаления ссылки');
    }
}

// ============================================================
// 7. ИНИЦИАЛИЗАЦИЯ И ЭКСПОРТЫ
// ============================================================

window.LinksModule = {
    settingsCache: linkModuleSettingsCache,
    getSettings: getLinkSettingsFromWidget,
    loadSettings: loadLinkSettingsFromServer,
    saveSetting: saveLinkSettingToServer,
    applyStyles: applyLinkStylesToWidget,
    renderSettings: renderLinkSettings,
    initSettingsEvents: initLinkSettingsEvents,
    renderWidget: renderLinksInWidget,
    loadWidget: loadLinkWidgetData,
    refreshAll: refreshAllLinkWidgets,
    openEdit: openEditLinkModalFromWidget,
    openAdd: openLinkWidgetAddModal,
    deleteLink: deleteLink
};

window.renderLinkSettings = renderLinkSettings;
window.initLinkSettingsEvents = initLinkSettingsEvents;
window.renderLinksInWidget = renderLinksInWidget;
window.loadLinkWidgetData = loadLinkWidgetData;
window.refreshAllLinkWidgets = refreshAllLinkWidgets;
window.openEditLinkModalFromWidget = openEditLinkModalFromWidget;
window.openLinkWidgetAddModal = openLinkWidgetAddModal;
window.deleteLink = deleteLink;
window.linkModuleSettingsCache = linkModuleSettingsCache;
window.getLinkSettingsFromWidget = getLinkSettingsFromWidget;
window.applyLinkStylesToWidget = applyLinkStylesToWidget;
window.saveLinkSettingToServer = saveLinkSettingToServer;
window.loadLinkSettingsFromServer = loadLinkSettingsFromServer;

console.log('✅ links.js 3.9 loaded');
console.log('✅ renderLinkSettings available:', typeof window.renderLinkSettings === 'function');