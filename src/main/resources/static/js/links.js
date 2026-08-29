/**
 * LINKS.JS - Полная логика работы со ссылками
 * Версия: 3.8 - размытие вместо прозрачности + темные настройки
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
        blurAmount: 0,
        bgDarkness: 0,
        hideBackground: false,
        alignment: 'center-center'
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
// 2. ПРИМЕНЕНИЕ СТИЛЕЙ
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
    const hideBackground = settings.hideBackground || false;
    const alignment = settings.alignment || 'center-center';

    const wrapper = widget.querySelector('.widget-content-wrapper');
    const linkGrid = widget.querySelector('.link-grid');

    // ===== ПРИМЕНЯЕМ СКРЫТИЕ ФОНА =====
    if (hideBackground) {
        widget.style.background = 'transparent';
        widget.style.backdropFilter = 'none';
        widget.style.border = 'none';
        widget.style.boxShadow = 'none';
        widget.style.padding = '4px';
        widget.style.backgroundColor = 'transparent';
        widget.style.overflow = 'visible';

        const header = widget.querySelector('.widget-header');
        if (header) {
            // Скрываем только заголовок, НО НЕ кнопки
            const titleSpan = header.querySelector('.widget-title');
            if (titleSpan) {
                titleSpan.style.display = 'none';
            }

            // === ВАЖНО: Кнопки остаются на месте ===
            const actions = header.querySelector('.widget-actions');
            if (actions) {
                actions.style.display = 'flex';
                actions.style.marginLeft = 'auto';  // Прижимаем к правому краю
                actions.style.flexShrink = '0';
            }

            header.style.borderBottom = 'none';
            header.style.marginBottom = '0';
            header.style.paddingBottom = '0';
            header.style.minHeight = '28px';
            header.style.justifyContent = 'flex-end'; // Кнопки справа
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

    // ===== ВЫРАВНИВАНИЕ =====
    if (linkGrid) {
        linkGrid.style.display = 'flex';
        linkGrid.style.flexWrap = 'wrap';
        linkGrid.style.flex = '1';
        linkGrid.style.width = '100%';
        linkGrid.style.height = '100%';
        linkGrid.style.minHeight = '80px';
        linkGrid.style.gap = '10px';
        linkGrid.style.padding = '8px';
        linkGrid.style.alignContent = 'center';

        const [vertical, horizontal] = alignment.split('-');

        switch (horizontal) {
            case 'left': linkGrid.style.justifyContent = 'flex-start'; break;
            case 'center': linkGrid.style.justifyContent = 'center'; break;
            case 'right': linkGrid.style.justifyContent = 'flex-end'; break;
            default: linkGrid.style.justifyContent = 'center';
        }

        switch (vertical) {
            case 'top':
                linkGrid.style.alignItems = 'flex-start';
                linkGrid.style.alignContent = 'flex-start';
                break;
            case 'center':
                linkGrid.style.alignItems = 'center';
                linkGrid.style.alignContent = 'center';
                break;
            case 'bottom':
                linkGrid.style.alignItems = 'flex-end';
                linkGrid.style.alignContent = 'flex-end';
                break;
            default:
                linkGrid.style.alignItems = 'center';
                linkGrid.style.alignContent = 'center';
        }
    }

    if (wrapper) {
        wrapper.style.display = 'flex';
        wrapper.style.flex = '1';
        wrapper.style.flexDirection = 'column';
        wrapper.style.minHeight = '0';
        wrapper.style.overflow = 'visible';
    }

    // ===== СТИЛИ ДЛЯ ССЫЛОК =====
    const iconSizePx = Math.max(16, Math.min(100, iconSize)) + 'px';
    const containerSize = Math.max(28, Math.min(112, iconSize + 12)) + 'px';
    const blurPx = Math.min(blurAmount / 100 * 12, 12);

    const bgOpacity = Math.max(0.04, 0.25 - (blurAmount / 100) * 0.2);
    const baseColor = hideBackground
        ? `rgba(255, 255, 255, ${Math.max(0.02, bgOpacity * 0.3)})`
        : `rgba(255, 255, 255, ${bgOpacity})`;

    const hoverColor = hideBackground
        ? 'rgba(255, 255, 255, 0.06)'
        : 'rgba(255, 255, 255, 0.08)';

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

        item.style.boxShadow = hideBackground
            ? '0 2px 8px rgba(0,0,0,0.08)'
            : (blurPx < 3 ? '0 2px 10px rgba(0,0,0,0.06)' : '0 4px 14px rgba(0,0,0,0.08)');

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

// ===== ОБНОВЛЕННАЯ ФУНКЦИЯ renderLinksInWidget =====
async function renderLinksInWidget(widgetElement) {
    console.log('renderLinksInWidget called for:', widgetElement.dataset.widgetId);

    const linkGrid = widgetElement.querySelector('.link-grid');
    if (!linkGrid) {
        console.warn('Link grid not found');
        return;
    }

    let pageId = linkGrid.dataset.pageId;
    if (!pageId || pageId === 'undefined') {
        pageId = window.currentPageId;
    }

    if (!pageId) {
        console.error('Page ID not found');
        linkGrid.innerHTML = `
            <div style="text-align:center; opacity:0.3; padding:10px; grid-column:1/-1;">
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
            settings = { iconSize: 28, fontSize: 12, blurAmount: 15, bgDarkness: 0, hideBackground: false, alignment: 'center-center' };
        }

        const iconSize = settings.iconSize || 28;
        const fontSize = settings.fontSize || 12;
        const blurAmount = settings.blurAmount || 15;
        const bgDarkness = settings.bgDarkness || 0;
        const hideBackground = settings.hideBackground || false;
        const alignment = settings.alignment || 'center-center';

        const iconSizePx = Math.max(16, Math.min(100, iconSize)) + 'px';
        const containerSize = Math.max(28, Math.min(112, iconSize + 12)) + 'px';
        const blurPx = Math.min(blurAmount / 100 * 12, 12);

        // === ЦВЕТА ФОНА ===
        const bgOpacity = Math.max(0.04, 0.25 - (blurAmount / 100) * 0.2);
        const baseColor = hideBackground
            ? `rgba(255, 255, 255, ${Math.max(0.02, bgOpacity * 0.3)})`
            : `rgba(255, 255, 255, ${bgOpacity})`;

        const hoverColor = hideBackground
            ? 'rgba(255, 255, 255, 0.06)'
            : 'rgba(255, 255, 255, 0.08)';

        let darknessColor = 'transparent';
        if (bgDarkness < 0) {
            darknessColor = `rgba(0, 0, 0, ${Math.abs(bgDarkness) / 100 * 0.4})`;
        } else if (bgDarkness > 0) {
            darknessColor = `rgba(255, 255, 255, ${bgDarkness / 100 * 0.2})`;
        }

        const isEditing = window.gridState && window.gridState.isEditing;

        // ===== ПРИМЕНЯЕМ СКРЫТИЕ ФОНА =====
        if (hideBackground) {
            widgetElement.style.background = 'transparent';
            widgetElement.style.backdropFilter = 'none';
            widgetElement.style.border = 'none';
            widgetElement.style.boxShadow = 'none';
            widgetElement.style.padding = '4px';
            widgetElement.style.backgroundColor = 'transparent';

            const header = widgetElement.querySelector('.widget-header');
            if (header) {
                const titleSpan = header.querySelector('.widget-title');
                if (titleSpan) titleSpan.style.display = 'none';
                const actions = header.querySelector('.widget-actions');
                if (actions) actions.style.display = 'flex';
                header.style.borderBottom = 'none';
                header.style.marginBottom = '0';
                header.style.paddingBottom = '0';
            }
        } else {
            widgetElement.style.background = '';
            widgetElement.style.backdropFilter = '';
            widgetElement.style.border = '';
            widgetElement.style.boxShadow = '';
            widgetElement.style.padding = '';
            widgetElement.style.backgroundColor = '';

            const header = widgetElement.querySelector('.widget-header');
            if (header) {
                const titleSpan = header.querySelector('.widget-title');
                if (titleSpan) titleSpan.style.display = '';
                const actions = header.querySelector('.widget-actions');
                if (actions) actions.style.display = '';
                header.style.borderBottom = '';
                header.style.marginBottom = '';
                header.style.paddingBottom = '';
            }
        }

        // ===== ВЫРАВНИВАНИЕ =====
        const [vertical, horizontal] = alignment.split('-');

        linkGrid.style.display = 'flex';
        linkGrid.style.flexWrap = 'wrap';
        linkGrid.style.flex = '1';
        linkGrid.style.width = '100%';
        linkGrid.style.height = '100%';
        linkGrid.style.minHeight = '80px';
        linkGrid.style.gap = '10px';
        linkGrid.style.padding = '8px';
        linkGrid.style.alignContent = 'center';

        switch (horizontal) {
            case 'left': linkGrid.style.justifyContent = 'flex-start'; break;
            case 'center': linkGrid.style.justifyContent = 'center'; break;
            case 'right': linkGrid.style.justifyContent = 'flex-end'; break;
            default: linkGrid.style.justifyContent = 'center';
        }

        switch (vertical) {
            case 'top':
                linkGrid.style.alignItems = 'flex-start';
                linkGrid.style.alignContent = 'flex-start';
                break;
            case 'center':
                linkGrid.style.alignItems = 'center';
                linkGrid.style.alignContent = 'center';
                break;
            case 'bottom':
                linkGrid.style.alignItems = 'flex-end';
                linkGrid.style.alignContent = 'flex-end';
                break;
            default:
                linkGrid.style.alignItems = 'center';
                linkGrid.style.alignContent = 'center';
        }

        const wrapper = widgetElement.querySelector('.widget-content-wrapper');
        if (wrapper) {
            wrapper.style.display = 'flex';
            wrapper.style.flex = '1';
            wrapper.style.flexDirection = 'column';
            wrapper.style.minHeight = '0';
            wrapper.style.overflow = 'visible';
        }

        // ===== ЗАГРУЖАЕМ ССЫЛКИ =====
        const response = await fetch(`/api/pages/${pageId}/links`);
        if (!response.ok) {
            linkGrid.innerHTML = `
                <div style="text-align:center; color:#ff6b6b; padding:10px; grid-column:1/-1;">
                    ❌ Ошибка загрузки ссылок (${response.status})
                </div>
            `;
            return;
        }

        const links = await response.json();

        // ===== РЕНДЕРИМ ССЫЛКИ =====
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
                              box-shadow: ${hideBackground ? '0 2px 8px rgba(0,0,0,0.08)' : (blurPx < 3 ? '0 2px 10px rgba(0,0,0,0.06)' : '0 4px 14px rgba(0,0,0,0.08)')};"
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
                <div style="text-align:center; opacity:0.3; padding:10px; grid-column:1/-1;">
                    📭 Нет ссылок
                </div>
            `;
        }

        linkGrid.innerHTML = html;
        console.log('Links rendered successfully for module:', moduleId);

        // Применяем стили к новым ссылкам
        applyLinkStylesToWidget(widgetElement, settings);

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
// 3. РЕНДЕРИНГ ССЫЛОК В ВИДЖЕТЕ
// ============================================================

async function renderLinksInWidget(widgetElement) {
    console.log('renderLinksInWidget called for:', widgetElement.dataset.widgetId);

    const linkGrid = widgetElement.querySelector('.link-grid');
    if (!linkGrid) {
        console.warn('Link grid not found');
        return;
    }

    let pageId = linkGrid.dataset.pageId;
    if (!pageId || pageId === 'undefined') {
        pageId = window.currentPageId;
    }

    if (!pageId) {
        console.error('Page ID not found');
        linkGrid.innerHTML = `
            <div style="text-align:center; opacity:0.3; padding:10px; grid-column:1/-1;">
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
            settings = { iconSize: 28, fontSize: 12, blurAmount: 15, bgDarkness: 0, hideBackground: false, alignment: 'center-center' };
        }

        const iconSize = settings.iconSize || 28;
        const fontSize = settings.fontSize || 12;
        const blurAmount = settings.blurAmount || 15;
        const bgDarkness = settings.bgDarkness || 0;
        const hideBackground = settings.hideBackground || false;
        const alignment = settings.alignment || 'center-center';

        const iconSizePx = Math.max(16, Math.min(100, iconSize)) + 'px';
        const containerSize = Math.max(28, Math.min(112, iconSize + 12)) + 'px';
        const blurPx = Math.min(blurAmount / 100 * 12, 12);
        const bgOpacity = Math.max(0.05, 1 - blurAmount / 120);

        const baseColor = hideBackground
            ? `rgba(255, 255, 255, ${Math.max(0.03, bgOpacity * 0.5)})`
            : `rgba(255, 255, 255, ${bgOpacity})`;

        let darknessColor = 'transparent';
        if (bgDarkness < 0) {
            darknessColor = `rgba(0, 0, 0, ${Math.abs(bgDarkness) / 100 * 0.5})`;
        } else if (bgDarkness > 0) {
            darknessColor = `rgba(255, 255, 255, ${bgDarkness / 100 * 0.3})`;
        }

        const isEditing = window.gridState && window.gridState.isEditing;

        // ===== ПРИМЕНЯЕМ СКРЫТИЕ ФОНА =====
        if (hideBackground) {
            widgetElement.style.background = 'transparent';
            widgetElement.style.backdropFilter = 'none';
            widgetElement.style.border = 'none';
            widgetElement.style.boxShadow = 'none';
            widgetElement.style.padding = '4px';
            widgetElement.style.backgroundColor = 'transparent';

            const header = widgetElement.querySelector('.widget-header');
            if (header) {
                const titleSpan = header.querySelector('.widget-title');
                if (titleSpan) titleSpan.style.display = 'none';
                const actions = header.querySelector('.widget-actions');
                if (actions) actions.style.display = 'flex';
                header.style.borderBottom = 'none';
                header.style.marginBottom = '0';
                header.style.paddingBottom = '0';
            }
        } else {
            widgetElement.style.background = '';
            widgetElement.style.backdropFilter = '';
            widgetElement.style.border = '';
            widgetElement.style.boxShadow = '';
            widgetElement.style.padding = '';
            widgetElement.style.backgroundColor = '';

            const header = widgetElement.querySelector('.widget-header');
            if (header) {
                const titleSpan = header.querySelector('.widget-title');
                if (titleSpan) titleSpan.style.display = '';
                const actions = header.querySelector('.widget-actions');
                if (actions) actions.style.display = '';
                header.style.borderBottom = '';
                header.style.marginBottom = '';
                header.style.paddingBottom = '';
            }
        }

        // ===== ВЫРАВНИВАНИЕ =====
        const [vertical, horizontal] = alignment.split('-');

        linkGrid.style.display = 'flex';
        linkGrid.style.flexWrap = 'wrap';
        linkGrid.style.flex = '1';
        linkGrid.style.width = '100%';
        linkGrid.style.height = '100%';
        linkGrid.style.minHeight = '80px';
        linkGrid.style.gap = '10px';
        linkGrid.style.padding = '8px';
        linkGrid.style.alignContent = 'center';

        switch (horizontal) {
            case 'left': linkGrid.style.justifyContent = 'flex-start'; break;
            case 'center': linkGrid.style.justifyContent = 'center'; break;
            case 'right': linkGrid.style.justifyContent = 'flex-end'; break;
            default: linkGrid.style.justifyContent = 'center';
        }

        switch (vertical) {
            case 'top':
                linkGrid.style.alignItems = 'flex-start';
                linkGrid.style.alignContent = 'flex-start';
                break;
            case 'center':
                linkGrid.style.alignItems = 'center';
                linkGrid.style.alignContent = 'center';
                break;
            case 'bottom':
                linkGrid.style.alignItems = 'flex-end';
                linkGrid.style.alignContent = 'flex-end';
                break;
            default:
                linkGrid.style.alignItems = 'center';
                linkGrid.style.alignContent = 'center';
        }

        const wrapper = widgetElement.querySelector('.widget-content-wrapper');
        if (wrapper) {
            wrapper.style.display = 'flex';
            wrapper.style.flex = '1';
            wrapper.style.flexDirection = 'column';
            wrapper.style.minHeight = '0';
            wrapper.style.overflow = 'visible';
        }

        // ===== ЗАГРУЖАЕМ ССЫЛКИ =====
        const response = await fetch(`/api/pages/${pageId}/links`);
        if (!response.ok) {
            linkGrid.innerHTML = `
                <div style="text-align:center; color:#ff6b6b; padding:10px; grid-column:1/-1;">
                    ❌ Ошибка загрузки ссылок (${response.status})
                </div>
            `;
            return;
        }

        const links = await response.json();

        // ===== РЕНДЕРИМ ССЫЛКИ =====
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
                             style="width:100%; height:100%; border-radius:4px; object-fit:contain; background:rgba(255,255,255,0.05); padding:2px; position:relative; z-index:2;"
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
                              min-height:70px; transition:all 0.2s; text-align:center; position:relative;
                              ${isEditing ? 'cursor:pointer; border:2px solid rgba(33,150,243,0.2);' : 'border:1px solid rgba(255,255,255,0.06);'}
                              box-shadow: ${hideBackground ? '0 2px 8px rgba(0,0,0,0.12)' : (blurPx < 3 ? '0 2px 12px rgba(0,0,0,0.08)' : '0 4px 16px rgba(0,0,0,0.10)')};"
                       onmouseover="this.style.background='rgba(255,255,255,0.15)'"
                       onmouseout="this.style.background='${baseColor}'"
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
                <div style="text-align:center; opacity:0.3; padding:10px; grid-column:1/-1;">
                    📭 Нет ссылок
                </div>
            `;
        }

        linkGrid.innerHTML = html;
        console.log('Links rendered successfully for module:', moduleId);

        // Применяем стили к новым ссылкам
        applyLinkStylesToWidget(widgetElement, settings);

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
// 4. РЕНДЕРИНГ НАСТРОЕК (ТЕМНЫЙ СТИЛЬ ВСЕГДА)
// ============================================================

function renderLinkSettings(data, moduleId) {
    console.log('Rendering link content settings for module:', moduleId);

    const content = data.content || {};
    const linkData = content.linkData || content.settings || {};

    const iconSize = linkData.iconSize || 28;
    const fontSize = linkData.fontSize || 12;
    const blurAmount = linkData.blurAmount || 15;
    const bgDarkness = linkData.bgDarkness || 0;
    const alignment = linkData.alignment || 'center-center';

    const [activeVertical, activeHorizontal] = alignment.split('-');

    // ТОЛЬКО настройки контента (без обёртки, без hideBackground)
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

                <!-- ВЫРАВНИВАНИЕ -->
                <div style="padding-top:4px; border-top:1px solid rgba(255,255,255,0.06);">
                    <label style="font-size:12px; opacity:0.6; color:rgba(255,255,255,0.6); display:block; margin-bottom:8px;">Расположение ссылок</label>
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
                                        onclick="setLinkAlignment(${moduleId}, '${pos}')">
                                    ${label}
                                </button>
                            `;
    }).join('')}
                    </div>
                    <div style="text-align:center; font-size:10px; opacity:0.3; color:rgba(255,255,255,0.3); margin-top:4px;">
                        ${alignment.replace('-', ' → ')}
                    </div>
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

    // Только ползунки LINK
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


function setLinkAlignment(moduleId, alignment) {
    console.log('Setting alignment:', moduleId, alignment);

    const container = document.querySelector(`.link-settings-container[data-module-id="${moduleId}"]`);
    if (container) {
        const buttons = container.querySelectorAll('.alignment-btn');
        buttons.forEach(btn => {
            const isActive = btn.dataset.alignment === alignment;
            btn.style.borderColor = isActive ? '#4CAF50' : 'rgba(255,255,255,0.08)';
            btn.style.background = isActive ? 'rgba(76,175,80,0.2)' : 'rgba(255,255,255,0.03)';
            btn.style.color = isActive ? '#81C784' : 'rgba(255,255,255,0.3)';
        });

        const label = container.querySelector('.alignment-grid + div');
        if (label) {
            label.textContent = alignment.replace('-', ' → ');
        }
    }

    saveLinkSettingToServer(moduleId, 'alignment', alignment);
    applyLinkSettingPreview(moduleId, 'alignment', alignment);
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

function toggleLinkSettings(moduleId) {
    console.log('toggleLinkSettings called for:', moduleId);

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
        loadLinkSettingsAndRender(moduleId, settingsDiv);
        console.log('Settings opened for module:', moduleId);
    }
}

async function loadLinkSettingsAndRender(moduleId, settingsDiv) {
    try {
        console.log('Loading settings for module:', moduleId);
        const settings = await loadLinkSettingsFromServer(moduleId);
        settingsDiv.innerHTML = renderLinkSettingsPanel(moduleId, settings);
        initLinkSettingsEvents(moduleId, settingsDiv);
        settingsDiv.style.display = 'block';
        console.log('Settings rendered for module:', moduleId);
    } catch (error) {
        console.error('Error loading link settings:', error);
        settingsDiv.innerHTML = `
            <div style="text-align:center; color:#ff6b6b; padding:10px; font-size:13px;">
                ❌ Ошибка загрузки настроек: ${error.message}
            </div>
        `;
        settingsDiv.style.display = 'block';
    }
}

// ============================================================
// 6. ОСТАЛЬНЫЕ ФУНКЦИИ
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

function reinitializeLinkWidget(moduleId) {
    console.log('Reinitializing link widget:', moduleId);
    const widget = document.querySelector(`.widget[data-widget-id="${moduleId}"]`);
    if (!widget) return;
    loadLinkWidgetData(widget);
}

// Переопределяем loadGridData
const originalLoadGridData = window.loadGridData || function() {};

window.loadGridData = async function() {
    console.log('loadGridData called - reinitializing link widgets after grid update');
    if (typeof originalLoadGridData === 'function') {
        await originalLoadGridData();
    }
    setTimeout(() => {
        const widgets = document.querySelectorAll('.widget.link-widget');
        widgets.forEach(widget => {
            const moduleId = widget.dataset.widgetId;
            if (moduleId) {
                reinitializeLinkWidget(moduleId);
            }
        });
    }, 150);
};

// ============================================================
// 8. РАБОТА С МОДАЛЬНЫМ ОКНОМ
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

async function deleteLinkFromWidget(moduleId, linkId) {
    await deleteLink(linkId);
}

function openAddLinkModal() {
    if (typeof LinksModal !== 'undefined') {
        LinksModal.open();
        LinksModal.afterSubmit(function(data) {
            setTimeout(() => {
                refreshAllLinkWidgets();
            }, 300);
        });
    } else {
        showToast('❌ Система ссылок не загружена');
    }
}

// ============================================================
// 9. ИНИЦИАЛИЗАЦИЯ
// ============================================================

window.LinksModule = {
    settingsCache: linkModuleSettingsCache,
    getSettings: getLinkSettingsFromWidget,
    loadSettings: loadLinkSettingsFromServer,
    saveSetting: saveLinkSettingToServer,
    applyStyles: applyLinkStylesToWidget,
    renderSettings: renderLinkSettingsPanel,
    initSettingsEvents: initLinkSettingsEvents,
    toggleSettings: toggleLinkSettings,
    renderWidget: renderLinksInWidget,
    loadWidget: loadLinkWidgetData,
    refreshAll: refreshAllLinkWidgets,
    reinitialize: reinitializeLinkWidget,
    openEdit: openEditLinkModalFromWidget,
    openAdd: openLinkWidgetAddModal,
    deleteLink: deleteLink,
    setAlignment: setLinkAlignment
};

window.loadLinkWidgetData = loadLinkWidgetData;
window.renderLinksInWidget = renderLinksInWidget;
window.refreshAllLinkWidgets = refreshAllLinkWidgets;
window.openEditLinkModalFromWidget = openEditLinkModalFromWidget;
window.openLinkWidgetAddModal = openLinkWidgetAddModal;
window.deleteLink = deleteLink;
window.linkModuleSettingsCache = linkModuleSettingsCache;
window.getLinkSettingsFromWidget = getLinkSettingsFromWidget;
window.applyLinkStylesToWidget = applyLinkStylesToWidget;
window.toggleLinkSettings = toggleLinkSettings;
window.loadLinkSettingsAndRender = loadLinkSettingsAndRender;
window.setLinkAlignment = setLinkAlignment;
window.reinitializeLinkWidget = reinitializeLinkWidget;

console.log('✅ links.js 3.8 loaded');