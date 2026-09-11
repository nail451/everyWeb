/**
 * WIDGET-ADD-MODAL.JS
 * Модальное окно добавления виджета.
 * Один шаг: клик по карточке → виджет создаётся сразу.
 */

let WidgetAddModal = (function() {
    let overlayEl = null;
    let modalEl = null;
    let isOpen = false;
    let modulesList = [];
    let availableModules = null; // кэш доступных модулей
    let outsideClickHandler = null;
    let escapeHandler = null;

    // ===== СЕКЦИИ =====
    const SECTIONS = [
        {
            title: 'Контент',
            types: ['LINK', 'WEATHER', 'NEXTCLOUD']
        },
        {
            title: 'Продуктивность',
            types: ['CLOCK', 'NOTE', 'TODO']
        },
        {
            title: 'Система',
            types: ['CPU', 'MEMORY', 'DISK', 'NETWORK', 'BATTERY']
        }
    ];

    // ===== ПРОВЕРКА: ЕСТЬ ЛИ МЕСТО ПОД ВИДЖЕТ =====
    function hasFreeSpace(rowSpan, colSpan) {
        if (typeof gridState === 'undefined' || !gridState) return true;

        const rows = gridState.gridRows || 4;
        const cols = gridState.gridCols || 4;
        const widgets = gridState.widgets || [];

        const occupied = [];
        for (let r = 0; r < rows; r++) {
            occupied[r] = [];
            for (let c = 0; c < cols; c++) {
                occupied[r][c] = false;
            }
        }

        widgets.forEach(w => {
            for (let r = w.row; r < w.row + w.rowSpan && r < rows; r++) {
                for (let c = w.col; c < w.col + w.colSpan && c < cols; c++) {
                    occupied[r][c] = true;
                }
            }
        });

        for (let r = 0; r <= rows - rowSpan; r++) {
            for (let c = 0; c <= cols - colSpan; c++) {
                let free = true;
                for (let dr = 0; dr < rowSpan && free; dr++) {
                    for (let dc = 0; dc < colSpan; dc++) {
                        if (occupied[r + dr][c + dc]) {
                            free = false;
                            break;
                        }
                    }
                }
                if (free) return true;
            }
        }
        return false;
    }

    // ===== ЗАГРУЗКА МОДУЛЕЙ =====
    async function loadAvailableModules(forceReload) {
        if (!forceReload && availableModules && availableModules.length > 0) {
            return availableModules;
        }

        const pageId = (typeof currentPageId !== 'undefined' && currentPageId)
            ? currentPageId
            : null;

        if (!pageId) {
            console.warn('[WidgetAddModal] currentPageId не определён');
            return [];
        }

        try {
            const response = await fetch(`/api/settings/${pageId}`);
            if (!response.ok) throw new Error('HTTP ' + response.status);

            const data = await response.json();
            availableModules = Array.isArray(data.availableModules) ? data.availableModules : [];
            return availableModules;
        } catch (e) {
            console.error('[WidgetAddModal] Ошибка загрузки модулей:', e);
            return [];
        }
    }

    // ===== ПОСТРОЕНИЕ КАРТОЧКИ =====
    function buildCard(module) {
        const { type, name, description, icon, enabled } = module;
        const rowSpan = Number.isFinite(module.defaultRowSpan) ? module.defaultRowSpan : 1;
        const colSpan = Number.isFinite(module.defaultColSpan) ? module.defaultColSpan : 1;

        const isEnabled = enabled !== false;
        const spaceOk = isEnabled && hasFreeSpace(rowSpan, colSpan);

        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'widget-add-card';
        card.dataset.type = type;

        if (!isEnabled) {
            card.classList.add('disabled');
        } else if (!spaceOk) {
            card.classList.add('no-space');
        }

        card.innerHTML = `
        <span class="wa-icon">${icon || '📦'}</span>
        <span class="wa-name">${escapeHtml(name || type)}</span>
        <span class="wa-desc">${escapeHtml(description || '')}</span>
        <span class="wa-size">${rowSpan}×${colSpan}</span>
    `;

        card.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (!isEnabled) {
                showToast('❌ Виджет недоступен');
                return;
            }

            if (!spaceOk) {
                showToast(`❌ Недостаточно места. Освободите пространство под виджет ${rowSpan}×${colSpan}`);
                return;
            }

            handleCardClick(type);
        });

        return card;
    }

    // ===== КЛИК ПО КАРТОЧКЕ =====
    async function handleCardClick(type) {
        if (typeof addWidget !== 'function') {
            showToast('❌ Функция добавления виджета недоступна');
            return;
        }

        close();

        try {
            await addWidget(type);
        } catch (e) {
            console.error('[WidgetAddModal] Ошибка добавления:', e);
        }
    }

    // ===== РЕНДЕР =====
    function render() {
        const bodyEl = modalEl.querySelector('.widget-add-body');
        if (!bodyEl) return;

        bodyEl.innerHTML = '';

        if (!availableModules || availableModules.length === 0) {
            bodyEl.innerHTML = `<div class="widget-add-empty">Нет доступных модулей</div>`;
            return;
        }

        // Индекс по типу
        const byType = {};
        availableModules.forEach(m => {
            if (m && m.type) byType[m.type] = m;
        });

        SECTIONS.forEach(section => {
            const sectionModules = section.types
                .map(t => byType[t])
                .filter(Boolean);

            if (sectionModules.length === 0) return;

            const sectionEl = document.createElement('div');
            sectionEl.className = 'widget-add-section';

            const titleEl = document.createElement('div');
            titleEl.className = 'widget-add-section-title';
            titleEl.textContent = section.title;
            sectionEl.appendChild(titleEl);

            const gridEl = document.createElement('div');
            gridEl.className = 'widget-add-grid';

            sectionModules.forEach(m => {
                gridEl.appendChild(buildCard(m));
            });

            sectionEl.appendChild(gridEl);
            bodyEl.appendChild(sectionEl);
        });

        // Модули, которых нет ни в одной секции — выкинем в "Прочее"
        const knownTypes = new Set(SECTIONS.flatMap(s => s.types));
        const others = availableModules.filter(m => m && m.type && !knownTypes.has(m.type));
        if (others.length > 0) {
            const sectionEl = document.createElement('div');
            sectionEl.className = 'widget-add-section';

            const titleEl = document.createElement('div');
            titleEl.className = 'widget-add-section-title';
            titleEl.textContent = 'Прочее';
            sectionEl.appendChild(titleEl);

            const gridEl = document.createElement('div');
            gridEl.className = 'widget-add-grid';
            others.forEach(m => gridEl.appendChild(buildCard(m)));

            sectionEl.appendChild(gridEl);
            bodyEl.appendChild(sectionEl);
        }

        // Подвал
        const footerEl = modalEl.querySelector('.widget-add-footer');
        if (footerEl) {
            const freeCells = countFreeCells();
            footerEl.innerHTML = `
                <span class="wa-hint">💡 Клик по карточке — добавить виджет</span>
                <span class="wa-hint">Свободно: ${freeCells} ячеек</span>
            `;
        }
    }

    // ===== ПОДСЧЁТ СВОБОДНЫХ ЯЧЕЕК =====
    function countFreeCells() {
        if (typeof gridState === 'undefined' || !gridState) return 0;
        const rows = gridState.gridRows || 4;
        const cols = gridState.gridCols || 4;
        const total = rows * cols;
        let used = 0;
        (gridState.widgets || []).forEach(w => {
            used += (w.rowSpan || 1) * (w.colSpan || 1);
        });
        return Math.max(0, total - used);
    }

    // ===== СОЗДАНИЕ DOM =====
    function createModal() {
        if (overlayEl) return;

        overlayEl = document.createElement('div');
        overlayEl.className = 'widget-add-overlay';
        overlayEl.innerHTML = `
            <div class="widget-add-modal">
                <div class="widget-add-header">
                    <h2>➕ Добавить виджет</h2>
                    <button class="widget-add-close" title="Закрыть (Esc)">✕</button>
                </div>
                <div class="widget-add-body"></div>
                <div class="widget-add-footer"></div>
            </div>
        `;

        document.body.appendChild(overlayEl);
        modalEl = overlayEl.querySelector('.widget-add-modal');

        overlayEl.querySelector('.widget-add-close').addEventListener('click', () => close());

        overlayEl.addEventListener('mousedown', (e) => {
            if (e.target === overlayEl) close();
        });

        outsideClickHandler = (e) => {
            if (!overlayEl) return;
            if (overlayEl.contains(e.target)) return;
            // Не закрываем, если клик по кнопке открытия
            const addBtn = e.target.closest('.add-widget-btn');
            if (addBtn) return;
            close();
        };

        escapeHandler = (e) => {
            if (e.key === 'Escape' && isOpen) close();
        };
    }

    // ===== ОТКРЫТИЕ =====
    async function open() {
        if (isOpen) return;

        createModal();

        overlayEl.classList.add('active');
        overlayEl.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        isOpen = true;

        // Индикатор загрузки
        const bodyEl = modalEl.querySelector('.widget-add-body');
        if (bodyEl) {
            bodyEl.innerHTML = `<div class="widget-add-empty">⏳ Загрузка модулей...</div>`;
        }

        await loadAvailableModules(true);
        render();

        document.addEventListener('mousedown', outsideClickHandler);
        document.addEventListener('keydown', escapeHandler);
    }

    // ===== ЗАКРЫТИЕ =====
    function close() {
        if (!overlayEl) return;
        overlayEl.classList.remove('active');
        overlayEl.style.display = 'none';
        document.body.style.overflow = '';
        isOpen = false;

        if (outsideClickHandler) {
            document.removeEventListener('mousedown', outsideClickHandler);
        }
        if (escapeHandler) {
            document.removeEventListener('keydown', escapeHandler);
        }
    }

    // ===== ПУБЛИЧНЫЙ API =====
    return {
        open,
        close,
        isOpen: () => isOpen
    };
})();

// ===== ЗАМЕНА СТАРОГО addWidgetDialog =====
window.addWidgetDialog = function() {
    WidgetAddModal.open();
};

window.WidgetAddModal = WidgetAddModal;