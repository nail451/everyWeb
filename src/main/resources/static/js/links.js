/**
 * LINKS.JS - Управление ссылками
 */

function initLinks() {
    // Проверяем, существует ли контейнер для ссылок
    const container = document.getElementById('linksContainer');
    if (container) {
        renderLinks();
    } else {
        console.log('linksContainer not found, links are managed through LINK widget');
    }
}

// ===== РЕНДЕРИНГ ССЫЛОК =====
function renderLinks() {
    const container = document.getElementById('linksContainer');
    if (!container) {
        console.log('linksContainer not found, skipping renderLinks');
        return;
    }

    console.log('=== RENDER LINKS START ===');
    console.log('Container ID:', container.id);

    // Получаем данные из атрибута
    let linksData = container.getAttribute('data-links');
    console.log('Raw data-links:', linksData);

    // Если данных нет, пробуем получить из глобальной переменной
    if (!linksData || linksData === 'null' || linksData === 'undefined' || linksData === '[]') {
        console.warn('No links data in container, trying from settingsData');
        if (settingsData && settingsData.links) {
            linksData = JSON.stringify(settingsData.links);
            console.log('Using settingsData.links:', linksData);
        }
    }

    // Если все еще нет данных - показываем кнопку добавления
    if (!linksData || linksData === 'null' || linksData === 'undefined' || linksData === '[]') {
        console.warn('No links data available');
        container.innerHTML = `
            <button class="add-link-btn" onclick="openAddLinkModal()">
                <span class="icon">➕</span>
                <span class="label">Добавить</span>
            </button>
        `;
        return;
    }

    try {
        const links = JSON.parse(linksData);
        console.log('Links parsed:', links.length, 'items');

        if (!Array.isArray(links) || links.length === 0) {
            container.innerHTML = `
                <button class="add-link-btn" onclick="openAddLinkModal()">
                    <span class="icon">➕</span>
                    <span class="label">Добавить</span>
                </button>
            `;
            return;
        }

        // Очищаем контейнер
        container.innerHTML = '';

        // ===== НАСТРОЙКИ =====
        let iconSize = linkSettings?.iconSize || 28;
        let fontSize = linkSettings?.fontSize || 12;
        let bgOpacity = linkSettings?.bgOpacity || 15;
        let bgDarkness = linkSettings?.bgDarkness || 0;
        let showAddButton = linkSettings?.showAddLinkButton !== undefined ? linkSettings.showAddLinkButton : true;

        console.log('Settings:', { iconSize, fontSize, bgOpacity, bgDarkness, showAddButton });

        const iconSizePx = Math.max(28, Math.min(90, iconSize)) + 'px';
        const containerSize = Math.max(40, Math.min(102, iconSize + 12)) + 'px';
        const opacity = bgOpacity / 100;
        const baseColor = `rgba(255, 255, 255, ${opacity})`;

        let darknessColor = 'transparent';
        if (bgDarkness < 0) {
            darknessColor = `rgba(0, 0, 0, ${Math.abs(bgDarkness) / 100 * 0.5})`;
        } else if (bgDarkness > 0) {
            darknessColor = `rgba(255, 255, 255, ${bgDarkness / 100 * 0.3})`;
        }

        // ===== РЕНДЕРИНГ КАЖДОЙ ССЫЛКИ =====
        links.forEach((link, index) => {
            console.log(`Rendering link ${index + 1}:`, link.title);

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
            linkElement.style.position = 'relative';
            linkElement.style.background = baseColor;
            linkElement.style.boxShadow = opacity < 0.3
                ? '0 2px 12px rgba(0, 0, 0, 0.25)'
                : '0 2px 12px rgba(0, 0, 0, 0.08)';

            // ===== ИКОНКА =====
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
                             onerror="this.style.display='none'; this.parentElement.querySelector('.link-icon-fallback').style.display='block'">
                        <span class="link-icon-fallback" style="display:none; font-size:${iconSizePx};">🔗</span>
                    </div>
                `;
            } else if (iconType === 'favicon' && icon && icon.startsWith('http')) {
                iconHtml = `
                    <div class="icon-container" style="${iconContainerStyle}">
                        <img src="${icon}" alt="${link.title}" class="link-icon-favicon" 
                             style="width:100%; height:100%; border-radius:6px; object-fit:contain; display:block; background:rgba(255,255,255,0.05); padding:2px;"
                             onerror="this.style.display='none'; this.parentElement.querySelector('.link-icon-fallback').style.display='block'">
                        <span class="link-icon-fallback" style="display:none; font-size:${iconSizePx};">🔗</span>
                    </div>
                `;
            } else {
                iconHtml = `
                    <div class="icon-container" style="${iconContainerStyle}">
                        <span class="link-icon" style="font-size:${iconSizePx};">${icon}</span>
                    </div>
                `;
            }

            // ===== КНОПКИ =====
            const actionsDiv = document.createElement('div');
            actionsDiv.style.cssText = 'display:flex; gap:4px; position:absolute; top:4px; right:4px; z-index:2;';

            // Кнопка удаления
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = '×';
            deleteBtn.style.cssText = `
                background: rgba(244,67,54,0.25);
                border: none;
                color: rgba(255,255,255,0.4);
                border-radius: 50%;
                width: 18px;
                height: 18px;
                cursor: pointer;
                font-size: 10px;
                padding: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.2s;
            `;
            deleteBtn.onclick = function(e) {
                e.stopPropagation();
                e.preventDefault();
                console.log('Delete button clicked for link:', link.id);
                deleteLink(link.id);
            };
            actionsDiv.appendChild(deleteBtn);

            // ===== СБОРКА =====
            linkElement.innerHTML = `
                ${iconHtml}
                <span class="link-title" style="font-size:${fontSize}px;">${escapeHtml(link.title || 'Без названия')}</span>
            `;
            linkElement.appendChild(actionsDiv);

            // Показываем кнопки при наведении на карточку
            linkElement.addEventListener('mouseenter', function() {
                const btns = this.querySelectorAll('.edit-btn, .delete-btn');
                btns.forEach(btn => btn.style.opacity = '1');
            });
            linkElement.addEventListener('mouseleave', function() {
                const btns = this.querySelectorAll('.edit-btn, .delete-btn');
                btns.forEach(btn => btn.style.opacity = '0');
            });

            // Обработчик клика
            linkElement.addEventListener('click', function(e) {
                if (e.target.closest('.edit-btn') || e.target.closest('.delete-btn')) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
                if (this.href && this.href !== '#') {
                    window.open(this.href, '_blank');
                }
                e.preventDefault();
            });

            container.appendChild(linkElement);
        });

        // ===== КНОПКА ДОБАВЛЕНИЯ =====
        if (showAddButton) {
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
        }

        console.log('✅ Links rendered successfully, count:', links.length);

    } catch (error) {
        console.error('Error rendering links:', error);
        container.innerHTML = `
            <button class="add-link-btn" onclick="openAddLinkModal()">
                <span class="icon">➕</span>
                <span class="label">Добавить</span>
            </button>
        `;
    }
}

// ===== УДАЛЕНИЕ ССЫЛКИ =====
function deleteLink(linkId) {
    console.log('deleteLink called for:', linkId);
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

// ===== ОТКРЫТИЕ РЕДАКТИРОВАНИЯ =====
function openEditLinkModal(linkId) {
    console.log('openEditLinkModal called for link:', linkId);

    // Ищем карточку
    const linkCard = document.querySelector(`.link-card`);
    if (!linkCard) {
        showToast('❌ Ссылка не найдена');
        return;
    }

    // Получаем данные из глобальной переменной или делаем запрос
    if (settingsData && settingsData.links) {
        const link = settingsData.links.find(l => l.id === linkId);
        if (link) {
            console.log('Found link in settingsData:', link);
            if (typeof LinksModal !== 'undefined') {
                LinksModal.openEditWithData(link);
                return;
            }
        }
    }

    // Если не нашли, делаем запрос
    fetch(`/api/links/${linkId}`)
        .then(response => response.ok ? response.json() : null)
        .then(link => {
            if (link && typeof LinksModal !== 'undefined') {
                LinksModal.openEditWithData(link);
            } else {
                showToast('❌ Ссылка не найдена');
            }
        })
        .catch(() => showToast('❌ Ошибка загрузки ссылки'));
}

// ===== ОТКРЫТИЕ МОДАЛЬНОГО ОКНА ДОБАВЛЕНИЯ =====
function openAddLinkModal() {
    console.log('openAddLinkModal() called');
    if (typeof LinksModal !== 'undefined') {
        LinksModal.open();
    } else {
        showToast('❌ Система ссылок не загружена');
    }
}

// Добавляем функцию в глобальный объект для доступа из HTML
window.openAddLinkModal = openAddLinkModal;
window.openEditLinkModal = openEditLinkModal;
window.deleteLink = deleteLink;