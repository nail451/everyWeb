/**
 * LINKS.JS - Управление ссылками
 */

function initLinks() {
    renderLinks();
}

// ===== РЕНДЕРИНГ ССЫЛОК =====
function renderLinks() {
    const container = document.getElementById('linksContainer');
    if (!container) {
        return;
    }

    // ===== ОПРЕДЕЛЯЕМ НАСТРОЙКИ =====
    let iconSize, fontSize, bgOpacity, bgDarkness, showAddButton;

    // ПРИОРИТЕТ 1: Глобальные настройки (linkSettings)
    if (linkSettings) {
        iconSize = linkSettings.iconSize || 28;
        fontSize = linkSettings.fontSize || 12;
        bgOpacity = linkSettings.bgOpacity || 15;
        bgDarkness = linkSettings.bgDarkness || 0;
        showAddButton = linkSettings.showAddLinkButton !== undefined ? linkSettings.showAddLinkButton : true;
    }
    // ПРИОРИТЕТ 2: Data-атрибуты
    else {
        iconSize = parseInt(container.dataset.iconSize) || 28;
        fontSize = parseInt(container.dataset.fontSize) || 12;
        bgOpacity = parseInt(container.dataset.bgOpacity) || 15;
        bgDarkness = parseInt(container.dataset.bgDarkness) || 0;
        showAddButton = container.dataset.showAddButton === 'true' || true;
    }

    // ===== РАСЧЕТ РАЗМЕРОВ =====
    const iconSizePx = Math.max(28, Math.min(90, iconSize)) + 'px';
    const containerSize = Math.max(40, Math.min(102, iconSize + 12)) + 'px';

    const opacity = bgOpacity / 100;
    const baseColor = `rgba(255, 255, 255, ${opacity})`;

    let darknessColor = 'transparent';
    if (bgDarkness < 0) {
        const darkAmount = Math.abs(bgDarkness) / 100;
        darknessColor = `rgba(0, 0, 0, ${darkAmount * 0.5})`;
    } else if (bgDarkness > 0) {
        const lightAmount = bgDarkness / 100;
        darknessColor = `rgba(255, 255, 255, ${lightAmount * 0.3})`;
    }

    let linksData = container.getAttribute('data-links');

    // Очищаем контейнер
    container.innerHTML = '';

    // ===== ЕСЛИ НЕТ ССЫЛОК =====
    if (!linksData || linksData === 'null' || linksData === 'undefined' || linksData === '[]') {
        if (showAddButton === true) {
            container.innerHTML = `
                <button class="add-link-btn" onclick="openAddLinkModal()">
                    <span class="icon">➕</span>
                    <span class="label">Добавить</span>
                </button>
            `;
        } else {
        }
        return;
    }

    try {
        const links = JSON.parse(linksData);

        if (!Array.isArray(links) || links.length === 0) {
            if (showAddButton === true) {
                container.innerHTML = `
                    <button class="add-link-btn" onclick="openAddLinkModal()">
                        <span class="icon">➕</span>
                        <span class="label">Добавить</span>
                    </button>
                `;
            } else {
            }
            return;
        }

        // ===== ДОБАВЛЯЕМ ССЫЛКИ =====
        links.forEach(link => {
            const linkElement = document.createElement('a');
            let url = link.url || '#';
            if (url !== '#' && !url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
            }

            linkElement.href = url;
            linkElement.target = '_blank';
            linkElement.rel = 'noopener noreferrer';
            linkElement.className = 'link-card';
            linkElement.title = link.title || 'Ссылка';

            // Фон
            linkElement.style.background = baseColor;

            // Слой затемнения
            const oldLayer = linkElement.querySelector('.darkness-layer');
            if (oldLayer) oldLayer.remove();

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
                    z-index: 0;
                    border-radius: inherit;
                `;
                linkElement.prepend(darkLayer);
            }

            linkElement.style.boxShadow = opacity < 0.3
                ? '0 2px 12px rgba(0, 0, 0, 0.25)'
                : '0 2px 12px rgba(0, 0, 0, 0.08)';

            // ===== ГЕНЕРАЦИЯ ИКОНКИ =====
            const iconType = link.iconType || 'emoji';
            const icon = link.icon || '🔗';
            const customImage = link.customImage || null;

            const iconContainerStyle = `display:flex; align-items:center; justify-content:center; width:${containerSize}; height:${containerSize}; flex-shrink:0; position:relative; z-index:1;`;

            let iconHtml = '';

            if (iconType === 'custom' && customImage) {
                iconHtml = `
                    <div class="icon-container" style="${iconContainerStyle}">
                        <img src="${customImage}" alt="${link.title}" class="link-icon-img" 
                             style="width:100%; height:100%; border-radius:10px; object-fit:cover; display:block;"
                             onerror="this.style.display='none'; this.parentElement.querySelector('.link-icon-fallback').classList.add('active')">
                        <span class="link-icon-fallback" style="display:none; font-size:${iconSizePx};">🔗</span>
                    </div>
                `;
            } else if (iconType === 'favicon' && icon && icon.startsWith('http')) {
                iconHtml = `
                    <div class="icon-container" style="${iconContainerStyle}">
                        <img src="${icon}" alt="${link.title}" class="link-icon-favicon" 
                             style="width:100%; height:100%; border-radius:6px; object-fit:contain; display:block; background:rgba(255,255,255,0.05); padding:2px;"
                             onerror="this.style.display='none'; this.parentElement.querySelector('.link-icon-fallback').classList.add('active')">
                        <span class="link-icon-fallback" style="display:none; font-size:${iconSizePx};">🔗</span>
                    </div>
                `;
            } else if (icon && (icon.startsWith('http://') || icon.startsWith('https://'))) {
                const ext = icon.split('.').pop().toLowerCase();
                if (['ico', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp'].includes(ext)) {
                    iconHtml = `
                        <div class="icon-container" style="${iconContainerStyle}">
                            <img src="${icon}" alt="${link.title}" class="link-icon-favicon" 
                                 style="width:100%; height:100%; border-radius:6px; object-fit:contain; display:block; background:rgba(255,255,255,0.05); padding:2px;"
                                 onerror="this.style.display='none'; this.parentElement.querySelector('.link-icon-fallback').classList.add('active')">
                            <span class="link-icon-fallback" style="display:none; font-size:${iconSizePx};">🔗</span>
                        </div>
                    `;
                } else {
                    iconHtml = `
                        <div class="icon-container" style="${iconContainerStyle}">
                            <span class="link-icon" style="font-size:${iconSizePx};">🔗</span>
                        </div>
                    `;
                }
            } else {
                // Эмодзи
                iconHtml = `
                    <div class="icon-container" style="${iconContainerStyle}">
                        <span class="link-icon" style="font-size:${iconSizePx};">${icon}</span>
                    </div>
                `;
            }

            linkElement.innerHTML = `
                ${iconHtml}
                <span class="link-title" style="font-size:${fontSize}px;">${escapeHtml(link.title || 'Без названия')}</span>
                <div style="display:flex; gap:4px; position:absolute; top:4px; right:4px; z-index:2;">
                    <button class="edit-btn" onclick="event.stopPropagation(); event.preventDefault(); openEditLinkModal(${link.id})">✏️</button>
                    <button class="delete-btn" onclick="event.stopPropagation(); event.preventDefault(); deleteLink(${link.id})">×</button>
                </div>
            `;

            // События
            linkElement.addEventListener('mouseenter', function() {
                const btns = this.querySelectorAll('.edit-btn, .delete-btn');
                btns.forEach(btn => btn.style.display = 'flex');
            });
            linkElement.addEventListener('mouseleave', function() {
                const btns = this.querySelectorAll('.edit-btn, .delete-btn');
                btns.forEach(btn => btn.style.display = 'none');
            });

            linkElement.addEventListener('click', function(e) {
                if (e.target.classList.contains('edit-btn') || e.target.classList.contains('delete-btn')) {
                    e.preventDefault();
                    return;
                }
                if (this.href && this.href !== '#') {
                    window.open(this.href, '_blank');
                }
                e.preventDefault();
            });
            container.appendChild(linkElement);
        });

        // ===== ДОБАВЛЯЕМ КНОПКУ ПОСЛЕ ВСЕХ ССЫЛОК =====
        if (showAddButton === true) {
            const addButton = document.createElement('button');
            addButton.className = 'add-link-btn';
            addButton.id = 'addLinkButton';
            addButton.innerHTML = `
                <span class="icon">➕</span>
                <span class="label">Добавить</span>
            `;
            addButton.onclick = function(e) {
                e.stopPropagation();
                e.preventDefault();
                openAddLinkModal();
            };
            container.appendChild(addButton);
        } else {
        }

    } catch (error) {
        if (showAddButton === true) {
            container.innerHTML = `
                <button class="add-link-btn" onclick="openAddLinkModal()">
                    <span class="icon">➕</span>
                    <span class="label">Добавить</span>
                </button>
            `;
        }
    }
}

// ===== УДАЛЕНИЕ ССЫЛКИ =====
function deleteLink(linkId) {
    if (!confirm('Удалить ссылку?')) return;

    fetch(`/api/links/${linkId}`, { method: 'DELETE' })
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