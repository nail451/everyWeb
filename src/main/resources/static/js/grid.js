/**
 * GRID.JS - Управление виджетами на странице
 */

let gridState = {
    widgets: [],
    isEditing: false,
    gridRows: 4,
    gridCols: 4,
    // Drag state
    draggedWidget: null,
    dragStartX: 0,
    dragStartY: 0,
    dragStartRow: 0,
    dragStartCol: 0,
    dragGhost: null,
    dragOverlay: null,
    highlightCells: [],
    dropTargetRow: -1,
    dropTargetCol: -1,
    // Resize state
    isResizing: false,
    resizeTarget: null,
    resizeGhost: null,
    resizeStartX: 0,
    resizeStartY: 0,
    resizeStartRow: 0,
    resizeStartCol: 0,
    resizeStartRowSpan: 0,
    resizeStartColSpan: 0,
    resizeCurrentRowSpan: 0,
    resizeCurrentColSpan: 0
};

// ===== ПОЛУЧЕНИЕ ИКОНКИ ВИДЖЕТА =====
function getWidgetIcon(type) {
    const icons = {
        'LINK': '🔗',
        'CLOCK': '🕐',
        'WEATHER': '🌤️',
        'NOTE': '📝',
        'TODO': '✅',
        'NEXTCLOUD': '☁️',
        'CALENDAR': '📅',
        'RSS': '📰',
        'QUOTE': '💭',
        'COUNTER': '🔢'
    };
    return icons[type] || '📦';
}

// ===== ПОЛУЧЕНИЕ ЦВЕТА ДЛЯ ВИДЖЕТА =====
function getWidgetColor(type) {
    const colors = {
        'LINK': 'rgba(33, 150, 243, 0.15)',
        'CLOCK': 'rgba(156, 39, 176, 0.15)',
        'WEATHER': 'rgba(255, 193, 7, 0.15)',
        'NOTE': 'rgba(76, 175, 80, 0.15)',
        'TODO': 'rgba(244, 67, 54, 0.15)',
        'NEXTCLOUD': 'rgba(0, 150, 136, 0.15)',
        'CALENDAR': 'rgba(233, 30, 99, 0.15)',
        'RSS': 'rgba(255, 87, 34, 0.15)'
    };
    return colors[type] || 'rgba(255,255,255,0.05)';
}

// ===== ПОЛУЧЕНИЕ КОНТЕНТА ВИДЖЕТА =====
function getWidgetContent(widget) {
    switch (widget.type) {
        case 'LINK':
            return `<div class="link-grid" data-widget-id="${widget.id}">Загрузка ссылок...</div>`;
        case 'CLOCK':
            return `<div class="clock-display" data-widget-id="${widget.id}">--:--:--</div>`;
        case 'WEATHER':
            return `
                <div class="weather-display" data-widget-id="${widget.id}">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <div style="font-size:32px;">🌤️</div>
                        <div>
                            <div style="font-size:24px; font-weight:300;">--°C</div>
                            <div style="opacity:0.6; font-size:13px;">Загрузка...</div>
                        </div>
                    </div>
                </div>
            `;
        case 'NOTE':
            return `
                <textarea class="note-text" placeholder="Заметка..." 
                          data-widget-id="${widget.id}"
                          style="width:100%; min-height:60px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.06); border-radius:8px; color:white; padding:8px; font-size:13px; resize:vertical;">${widget.data || ''}</textarea>
            `;
        case 'TODO':
            return `
                <div class="todo-widget" data-widget-id="${widget.id}">
                    <input type="text" placeholder="Добавить задачу..." 
                           style="width:100%; padding:6px 10px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.06); border-radius:6px; color:white; font-size:13px; margin-bottom:8px;"
                           onkeypress="if(event.key==='Enter') addTodo(this, '${widget.id}')">
                    <ul class="todo-list" style="list-style:none; padding:0; max-height:120px; overflow-y:auto;"></ul>
                </div>
            `;
        case 'NEXTCLOUD':
            return `
                <div class="nextcloud-display" data-widget-id="${widget.id}">
                    <div style="text-align:center; opacity:0.5; padding:10px;">⏳ Загрузка Nextcloud...</div>
                </div>
            `;
        default:
            return `<div style="opacity:0.5;text-align:center;padding:20px;">${widget.type}</div>`;
    }
}

// ===== ИНИЦИАЛИЗАЦИЯ =====
function initGrid() {
    console.log('Grid initialized');
    loadGridData();
}

// ===== ЗАГРУЗКА ДАННЫХ =====
async function loadGridData() {
    try {
        const response = await fetch(`/api/pages/${currentPageId}/layout`);
        if (response.ok) {
            const data = await response.json();
            console.log('Grid data loaded:', data);

            gridState.isEditing = data.isEditing || false;
            gridState.gridRows = data.gridRows || 4;
            gridState.gridCols = data.gridCols || 4;
            gridState.widgets = data.widgets || [];

            renderGrid();

            const editBtn = document.querySelector('.edit-mode-btn');
            if (editBtn) {
                editBtn.textContent = gridState.isEditing ? '💾 Сохранить' : '✏️ Редактировать';
                editBtn.style.background = gridState.isEditing ? 'rgba(76,175,80,0.2)' : 'rgba(33,150,243,0.2)';
                editBtn.style.borderColor = gridState.isEditing ? 'rgba(76,175,80,0.3)' : 'rgba(33,150,243,0.3)';
            }
        }
    } catch (error) {
        console.error('Error loading grid data:', error);
    }
}

// ===== РЕНДЕРИНГ ГРИДА =====
function renderGrid() {
    const container = document.getElementById('pageGrid');
    if (!container) return;

    container.innerHTML = '';
    container.className = 'page-grid';
    if (gridState.isEditing) {
        container.classList.add('editing');
    }

    container.style.gridTemplateRows = `repeat(${gridState.gridRows}, 1fr)`;
    container.style.gridTemplateColumns = `repeat(${gridState.gridCols}, 1fr)`;

    if (gridState.isEditing) {
        container.style.gap = '6px';
        container.style.padding = '6px';
        container.style.background = 'rgba(255,255,255,0.02)';
        container.style.borderRadius = '16px';
        container.style.border = '1px solid rgba(255,255,255,0.04)';
    }

    const sortedWidgets = [...gridState.widgets].sort((a, b) => {
        if (a.row !== b.row) return a.row - b.row;
        return a.col - b.col;
    });

    sortedWidgets.forEach(widget => {
        const widgetElement = createWidgetElement(widget);
        widgetElement.style.gridRow = `${widget.row + 1} / span ${widget.rowSpan}`;
        widgetElement.style.gridColumn = `${widget.col + 1} / span ${widget.colSpan}`;
        widgetElement.dataset.widgetId = widget.id;
        widgetElement.dataset.widgetType = widget.type;
        widgetElement.dataset.row = widget.row;
        widgetElement.dataset.col = widget.col;
        widgetElement.dataset.rowSpan = widget.rowSpan;
        widgetElement.dataset.colSpan = widget.colSpan;

        if (gridState.isEditing) {
            widgetElement.draggable = true;
            widgetElement.addEventListener('dragstart', handleDragStart);
            widgetElement.addEventListener('dragend', handleDragEnd);
            widgetElement.addEventListener('dragover', handleDragOver);
            widgetElement.addEventListener('drop', handleDrop);

            const resizeHandle = widgetElement.querySelector('.widget-resize-handle');
            if (resizeHandle) {
                resizeHandle.addEventListener('mousedown', startResize);
                resizeHandle.addEventListener('touchstart', startResize);
            }
        }

        container.appendChild(widgetElement);
    });

    if (gridState.isEditing) {
        addEmptyCells(container);
    }

    setTimeout(() => {
        if (typeof initializeModules === 'function') {
            initializeModules();
        }
    }, 100);
}

// ===== СОЗДАНИЕ ЭЛЕМЕНТА ВИДЖЕТА =====
function createWidgetElement(widget) {
    const div = document.createElement('div');
    div.className = `widget ${widget.type.toLowerCase()}-widget`;
    div.dataset.widgetId = widget.id;
    div.dataset.widgetType = widget.type;
    div.dataset.row = widget.row;
    div.dataset.col = widget.col;
    div.dataset.rowSpan = widget.rowSpan;
    div.dataset.colSpan = widget.colSpan;

    if (gridState.isEditing) {
        div.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        div.style.border = '2px solid rgba(76,175,80,0.15)';
        div.style.cursor = 'grab';
    }

    // Заголовок
    const header = document.createElement('div');
    header.className = 'widget-header';
    header.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        padding-bottom: 6px;
        border-bottom: 1px solid rgba(255,255,255,0.04);
    `;

    // Название виджета
    const titleSpan = document.createElement('span');
    titleSpan.className = 'widget-title';
    titleSpan.style.cssText = 'font-size:13px; font-weight:500; opacity:0.6; display:flex; align-items:center; gap:6px;';
    titleSpan.innerHTML = `
        ${getWidgetIcon(widget.type)} ${escapeHtml(widget.title || widget.type)}
        ${gridState.isEditing ? `<span style="font-size:10px; opacity:0.3; margin-left:4px;">(${widget.rowSpan}×${widget.colSpan})</span>` : ''}
    `;
    header.appendChild(titleSpan);

    // Действия (только в режиме редактирования)
    if (gridState.isEditing) {
        const actions = document.createElement('div');
        actions.className = 'widget-actions';
        actions.style.cssText = 'display:flex; gap:4px; opacity:0.6; transition:opacity 0.3s;';

        // Кнопка настроек модуля (⚙️)
        const settingsBtn = document.createElement('button');
        settingsBtn.className = 'widget-settings-btn';
        settingsBtn.innerHTML = '⚙️';
        settingsBtn.style.cssText = `
            background: rgba(33,150,243,0.2);
            border: none;
            color: rgba(255,255,255,0.5);
            border-radius: 4px;
            padding: 2px 6px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s;
        `;
        settingsBtn.title = 'Настройки модуля';
        settingsBtn.onclick = function(e) {
            e.stopPropagation();
            toggleModuleSettings(widget.id);
        };
        actions.appendChild(settingsBtn);

        // Кнопка удаления (×)
        const removeBtn = document.createElement('button');
        removeBtn.className = 'widget-remove';
        removeBtn.innerHTML = '×';
        removeBtn.style.cssText = `
            background: rgba(244,67,54,0.2);
            border: none;
            color: rgba(255,255,255,0.3);
            border-radius: 4px;
            padding: 2px 6px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
        `;
        removeBtn.title = 'Удалить виджет';
        removeBtn.onclick = function(e) {
            e.stopPropagation();
            removeWidget(widget.id);
        };
        actions.appendChild(removeBtn);

        header.appendChild(actions);
    }

    div.appendChild(header);

    // Контент
    const content = document.createElement('div');
    content.className = 'widget-content';
    content.innerHTML = getWidgetContent(widget);
    div.appendChild(content);

    // Настройки (скрыты по умолчанию)
    const settingsDiv = document.createElement('div');
    settingsDiv.className = 'module-settings';
    settingsDiv.style.cssText = 'display:none; margin-top:10px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.05);';
    div.appendChild(settingsDiv);

    // Resize handle (только в режиме редактирования)
    if (gridState.isEditing) {
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'widget-resize-handle';
        resizeHandle.innerHTML = '↘';
        resizeHandle.style.cssText = `
            position: absolute;
            bottom: 4px;
            right: 4px;
            width: 28px;
            height: 28px;
            cursor: nwse-resize;
            opacity: 0.4;
            font-size: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            user-select: none;
            background: rgba(255,255,255,0.08);
            border-radius: 4px;
            transition: all 0.2s;
        `;
        resizeHandle.addEventListener('mouseenter', function() {
            this.style.opacity = '0.8';
            this.style.background = 'rgba(255,255,255,0.15)';
        });
        resizeHandle.addEventListener('mouseleave', function() {
            this.style.opacity = '0.4';
            this.style.background = 'rgba(255,255,255,0.08)';
        });
        resizeHandle.addEventListener('mousedown', startResize);
        resizeHandle.addEventListener('touchstart', startResize);
        div.appendChild(resizeHandle);
    }

    return div;
}

// ===== ДОБАВЛЕНИЕ ПУСТЫХ ЯЧЕЕК =====
function addEmptyCells(container) {
    const occupied = new Set();
    gridState.widgets.forEach(widget => {
        for (let r = widget.row; r < widget.row + widget.rowSpan; r++) {
            for (let c = widget.col; c < widget.col + widget.colSpan; c++) {
                occupied.add(`${r}-${c}`);
            }
        }
    });

    for (let r = 0; r < gridState.gridRows; r++) {
        for (let c = 0; c < gridState.gridCols; c++) {
            if (!occupied.has(`${r}-${c}`)) {
                const empty = document.createElement('div');
                empty.className = 'grid-empty-cell';
                empty.style.gridRow = `${r + 1} / span 1`;
                empty.style.gridColumn = `${c + 1} / span 1`;
                empty.style.background = 'rgba(255,255,255,0.02)';
                empty.style.borderRadius = '8px';
                empty.style.border = '1px dashed rgba(255,255,255,0.06)';
                empty.style.minHeight = '60px';
                empty.style.transition = 'all 0.2s ease';
                empty.dataset.row = r;
                empty.dataset.col = c;
                empty.addEventListener('dragover', handleDragOver);
                empty.addEventListener('drop', handleDropOnEmpty);
                container.appendChild(empty);
            }
        }
    }
}

// ===== DRAG & DROP - НОВАЯ ВЕРСИЯ С ПЕРЕСЕЧЕНИЕМ =====
let dragCounter = 0;
let lastHighlightTime = 0;

function handleDragStart(e) {
    const widget = e.target.closest('.widget');
    if (!widget) return;

    if (gridState.draggedWidget) {
        e.preventDefault();
        return;
    }

    const rect = widget.getBoundingClientRect();

    gridState.draggedWidget = {
        id: widget.dataset.widgetId,
        row: parseInt(widget.dataset.row),
        col: parseInt(widget.dataset.col),
        rowSpan: parseInt(widget.dataset.rowSpan),
        colSpan: parseInt(widget.dataset.colSpan),
        element: widget,
        width: rect.width,
        height: rect.height
    };

    gridState.dragStartRow = gridState.draggedWidget.row;
    gridState.dragStartCol = gridState.draggedWidget.col;
    gridState.dropTargetRow = -1;
    gridState.dropTargetCol = -1;

    // Оверлей
    const overlay = document.createElement('div');
    overlay.id = 'drag-overlay';
    overlay.style.cssText = `
        position: fixed;
        pointer-events: none;
        z-index: 9998;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.1);
        backdrop-filter: blur(2px);
    `;
    document.body.appendChild(overlay);
    gridState.dragOverlay = overlay;

    // Призрак - делаем его полупрозрачным и без лишних элементов
    const ghost = widget.cloneNode(true);
    ghost.id = 'drag-ghost';
    // Убираем все лишние элементы
    const removeElements = ghost.querySelectorAll('.widget-remove, .widget-resize-handle, .widget-resize-btn, .widget-actions');
    removeElements.forEach(el => el.remove());

    // Делаем призрак больше похожим на призрак
    ghost.style.cssText = `
        position: fixed;
        pointer-events: none;
        z-index: 9999;
        opacity: 0.85;
        background: ${getWidgetColor(widget.dataset.widgetType)};
        border-radius: 16px;
        padding: 12px;
        border: 2px solid rgba(76, 175, 80, 0.4);
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        backdrop-filter: blur(8px);
        transition: none;
    `;

    document.body.appendChild(ghost);
    gridState.dragGhost = ghost;

    // Сразу обновляем позицию призрака
    updateGhostPosition(e.clientX, e.clientY);

    widget.style.opacity = '0.3';
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', widget.dataset.widgetId);

    dragCounter++;
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (!gridState.draggedWidget || !gridState.dragGhost) return;

    // Обновляем позицию призрака с привязкой к сетке
    updateGhostPosition(e.clientX, e.clientY);
}

function updateGhostPosition(clientX, clientY) {
    if (!gridState.dragGhost) return;

    const ghost = gridState.dragGhost;
    const grid = document.getElementById('pageGrid');
    const gridRect = grid.getBoundingClientRect();

    // Получаем размер ячейки
    const cellWidth = (gridRect.right - gridRect.left) / gridState.gridCols;
    const cellHeight = (gridRect.bottom - gridRect.top) / gridState.gridRows;

    const rowSpan = gridState.draggedWidget.rowSpan;
    const colSpan = gridState.draggedWidget.colSpan;

    // Вычисляем позицию мыши относительно грида
    const mouseX = clientX - gridRect.left;
    const mouseY = clientY - gridRect.top;

    // Находим ячейку под мышью
    let col = Math.floor(mouseX / cellWidth);
    let row = Math.floor(mouseY / cellHeight);

    // Корректируем для больших виджетов
    col = Math.max(0, Math.min(col, gridState.gridCols - colSpan));
    row = Math.max(0, Math.min(row, gridState.gridRows - rowSpan));

    // Проверяем, не занята ли позиция
    if (!isPositionValid(row, col)) {
        // Ищем ближайшую свободную
        const freePos = findNearestFreePositionOptimized(row, col, rowSpan, colSpan);
        if (freePos) {
            row = freePos.row;
            col = freePos.col;
        } else {
            // Если ничего не найдено, оставляем текущую позицию
            const currentRow = gridState.draggedWidget.row;
            const currentCol = gridState.draggedWidget.col;
            if (isPositionValid(currentRow, currentCol)) {
                row = currentRow;
                col = currentCol;
            }
        }
    }

    // Вычисляем позицию призрака
    const ghostX = gridRect.left + col * cellWidth;
    const ghostY = gridRect.top + row * cellHeight;

    // Добавляем небольшой отступ для выравнивания
    const padding = 3;
    ghost.style.left = (ghostX + padding) + 'px';
    ghost.style.top = (ghostY + padding) + 'px';
    ghost.style.width = (colSpan * cellWidth - padding * 2) + 'px';
    ghost.style.height = (rowSpan * cellHeight - padding * 2) + 'px';

    // Сохраняем целевую позицию для подсветки
    if (isPositionValid(row, col)) {
        gridState.dropTargetRow = row;
        gridState.dropTargetCol = col;
        highlightDropZoneOptimized(row, col, rowSpan, colSpan);
    } else {
        gridState.dropTargetRow = -1;
        gridState.dropTargetCol = -1;
        clearHighlightsOptimized();
    }
}

function checkGhostIntersection() {
    const ghost = gridState.dragGhost;
    if (!ghost) return;

    const now = Date.now();
    if (now - lastHighlightTime < 50) return;
    lastHighlightTime = now;

    const ghostRect = ghost.getBoundingClientRect();
    const grid = document.getElementById('pageGrid');
    const gridRect = grid.getBoundingClientRect();

    const cellWidth = (gridRect.right - gridRect.left) / gridState.gridCols;
    const cellHeight = (gridRect.bottom - gridRect.top) / gridState.gridRows;

    // Используем ЛЕВЫЙ ВЕРХНИЙ угол призрака, а не центр
    const ghostLeft = ghostRect.left - gridRect.left;
    const ghostTop = ghostRect.top - gridRect.top;

    // Вычисляем целевую ячейку по левому верхнему углу
    let targetCol = Math.floor(ghostLeft / cellWidth);
    let targetRow = Math.floor(ghostTop / cellHeight);

    const rowSpan = gridState.draggedWidget.rowSpan;
    const colSpan = gridState.draggedWidget.colSpan;

    // Корректируем позицию, чтобы виджет не выходил за границы
    targetCol = Math.max(0, Math.min(targetCol, gridState.gridCols - colSpan));
    targetRow = Math.max(0, Math.min(targetRow, gridState.gridRows - rowSpan));

    // Проверяем, помещается ли виджет в вычисленную позицию
    if (isPositionValid(targetRow, targetCol)) {
        gridState.dropTargetRow = targetRow;
        gridState.dropTargetCol = targetCol;
        highlightDropZoneOptimized(targetRow, targetCol, rowSpan, colSpan);
        return;
    }

    // Если позиция занята, ищем ближайшую свободную
    const bestMatch = findNearestFreePositionOptimized(targetRow, targetCol, rowSpan, colSpan);
    if (bestMatch) {
        gridState.dropTargetRow = bestMatch.row;
        gridState.dropTargetCol = bestMatch.col;
        highlightDropZoneOptimized(bestMatch.row, bestMatch.col, rowSpan, colSpan);
        return;
    }

    gridState.dropTargetRow = -1;
    gridState.dropTargetCol = -1;
    clearHighlightsOptimized();
}

// ===== ПОИСК БЛИЖАЙШЕЙ СВОБОДНОЙ ПОЗИЦИИ =====
function findNearestFreePositionOptimized(startRow, startCol, rowSpan, colSpan) {
    // Проверяем все позиции вокруг по спирали
    const maxRadius = 3;

    for (let radius = 0; radius <= maxRadius; radius++) {
        for (let dr = -radius; dr <= radius; dr++) {
            for (let dc = -radius; dc <= radius; dc++) {
                // Проверяем только крайние точки спирали
                if (Math.abs(dr) !== radius && Math.abs(dc) !== radius) continue;

                const row = startRow + dr;
                const col = startCol + dc;

                // Проверяем границы
                if (row < 0 || col < 0 || row + rowSpan > gridState.gridRows || col + colSpan > gridState.gridCols) {
                    continue;
                }

                // Проверяем, не занято ли место
                if (isPositionValid(row, col)) {
                    return { row, col };
                }
            }
        }
    }

    return null;
}

function isPositionValid(row, col) {
    const rowSpan = gridState.draggedWidget.rowSpan;
    const colSpan = gridState.draggedWidget.colSpan;

    // Проверяем границы
    if (row < 0 || col < 0 || row + rowSpan > gridState.gridRows || col + colSpan > gridState.gridCols) {
        return false;
    }

    // Проверяем, не занято ли место другими виджетами
    for (const w of gridState.widgets) {
        if (w.id === gridState.draggedWidget.id) continue;
        // Проверка пересечения прямоугольников
        if (row < w.row + w.rowSpan &&
            row + rowSpan > w.row &&
            col < w.col + w.colSpan &&
            col + colSpan > w.col) {
            return false;
        }
    }

    return true;
}

function handleDragEnd(e) {
    const widget = gridState.draggedWidget?.element;
    if (widget) {
        widget.style.opacity = '1';
    }

    const ghost = document.getElementById('drag-ghost');
    if (ghost) ghost.remove();

    const overlay = document.getElementById('drag-overlay');
    if (overlay) overlay.remove();

    gridState.dragGhost = null;
    gridState.dragOverlay = null;

    clearHighlightsOptimized();

    if (gridState.draggedWidget && gridState.dropTargetRow >= 0 && gridState.dropTargetCol >= 0) {
        const currentRow = gridState.draggedWidget.row;
        const currentCol = gridState.draggedWidget.col;

        if (currentRow !== gridState.dropTargetRow || currentCol !== gridState.dropTargetCol) {
            moveWidgetToPosition(
                gridState.draggedWidget.id,
                gridState.dropTargetRow,
                gridState.dropTargetCol
            );
        }
    }

    gridState.draggedWidget = null;
    gridState.dropTargetRow = -1;
    gridState.dropTargetCol = -1;
    dragCounter = Math.max(0, dragCounter - 1);
}

function handleDrop(e) {
    e.preventDefault();
}

function handleDropOnEmpty(e) {
    e.preventDefault();
}

// ===== ПОДСВЕТКА =====
function highlightDropZoneOptimized(row, col, rowSpan, colSpan) {
    clearHighlightsOptimized();

    const cells = document.querySelectorAll('.grid-empty-cell');
    for (const cell of cells) {
        const cellRow = parseInt(cell.dataset.row);
        const cellCol = parseInt(cell.dataset.col);

        if (cellRow >= row && cellRow < row + rowSpan &&
            cellCol >= col && cellCol < col + colSpan) {
            cell.style.background = 'rgba(76, 175, 80, 0.35)';
            cell.style.borderColor = 'rgba(76, 175, 80, 0.7)';
            cell.style.boxShadow = 'inset 0 0 30px rgba(76, 175, 80, 0.2)';
            cell.style.transform = 'scale(1.02)';
            gridState.highlightCells.push(cell);
        }
    }
}

function clearHighlightsOptimized() {
    for (const cell of gridState.highlightCells) {
        if (cell && cell.style) {
            cell.style.background = 'rgba(255,255,255,0.02)';
            cell.style.borderColor = 'rgba(255,255,255,0.06)';
            cell.style.boxShadow = 'none';
            cell.style.transform = 'scale(1)';
        }
    }
    gridState.highlightCells = [];
}

// ===== ПЕРЕМЕЩЕНИЕ ВИДЖЕТА =====
async function moveWidgetToPosition(widgetId, newRow, newCol) {
    try {
        const widget = gridState.widgets.find(w => w.id === widgetId);
        if (!widget) return;

        const rowSpan = widget.rowSpan;
        const colSpan = widget.colSpan;

        if (newRow < 0) newRow = 0;
        if (newCol < 0) newCol = 0;
        if (newRow + rowSpan > gridState.gridRows) newRow = gridState.gridRows - rowSpan;
        if (newCol + colSpan > gridState.gridCols) newCol = gridState.gridCols - colSpan;

        const response = await fetch(`/api/pages/${currentPageId}/layout/widget/position`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                widgetId: widgetId,
                row: newRow,
                col: newCol
            })
        });

        if (response.ok) {
            await loadGridData();
            showToast('✅ Виджет перемещен');
        }
    } catch (error) {
        console.error('Error moving widget:', error);
        showToast('❌ Ошибка перемещения виджета');
    }
}

// ===== RESIZE =====
function startResize(e) {
    e.preventDefault();
    e.stopPropagation();

    const widget = e.target.closest('.widget');
    if (!widget) return;

    const rect = widget.getBoundingClientRect();

    gridState.isResizing = true;
    gridState.resizeTarget = widget.dataset.widgetId;
    gridState.resizeStartRow = parseInt(widget.dataset.row);
    gridState.resizeStartCol = parseInt(widget.dataset.col);
    gridState.resizeStartRowSpan = parseInt(widget.dataset.rowSpan);
    gridState.resizeStartColSpan = parseInt(widget.dataset.colSpan);
    gridState.resizeCurrentRowSpan = gridState.resizeStartRowSpan;
    gridState.resizeCurrentColSpan = gridState.resizeStartColSpan;
    gridState.resizeStartX = e.clientX || e.touches?.[0]?.clientX || 0;
    gridState.resizeStartY = e.clientY || e.touches?.[0]?.clientY || 0;

    const ghost = document.createElement('div');
    ghost.style.cssText = `
        position: fixed;
        pointer-events: none;
        z-index: 9998;
        opacity: 0.6;
        border: 3px solid rgba(76, 175, 80, 0.6);
        border-radius: 16px;
        background: rgba(76, 175, 80, 0.1);
        backdrop-filter: blur(4px);
        transition: none;
        left: ${rect.left}px;
        top: ${rect.top}px;
        width: ${rect.width}px;
        height: ${rect.height}px;
        box-shadow: 0 0 30px rgba(76, 175, 80, 0.1);
    `;
    document.body.appendChild(ghost);
    gridState.resizeGhost = ghost;

    highlightDropZoneOptimized(gridState.resizeStartRow, gridState.resizeStartCol,
        gridState.resizeStartRowSpan, gridState.resizeStartColSpan);

    document.addEventListener('mousemove', onResize);
    document.addEventListener('mouseup', stopResize);
    document.addEventListener('touchmove', onResize);
    document.addEventListener('touchend', stopResize);
}

function onResize(e) {
    if (!gridState.isResizing) return;

    const clientX = e.clientX || e.touches?.[0]?.clientX || 0;
    const clientY = e.clientY || e.touches?.[0]?.clientY || 0;

    const diffX = clientX - gridState.resizeStartX;
    const diffY = clientY - gridState.resizeStartY;

    const grid = document.getElementById('pageGrid');
    const gridRect = grid.getBoundingClientRect();
    const cellWidth = gridRect.width / gridState.gridCols;
    const cellHeight = gridRect.height / gridState.gridRows;

    let newColSpan = Math.max(1, Math.min(4, gridState.resizeStartColSpan + Math.round(diffX / cellWidth)));
    let newRowSpan = Math.max(1, Math.min(4, gridState.resizeStartRowSpan + Math.round(diffY / cellHeight)));

    const maxColSpan = gridState.gridCols - gridState.resizeStartCol;
    const maxRowSpan = gridState.gridRows - gridState.resizeStartRow;
    newColSpan = Math.min(newColSpan, maxColSpan);
    newRowSpan = Math.min(newRowSpan, maxRowSpan);

    newColSpan = Math.max(1, newColSpan);
    newRowSpan = Math.max(1, newRowSpan);

    gridState.resizeCurrentRowSpan = newRowSpan;
    gridState.resizeCurrentColSpan = newColSpan;

    if (gridState.resizeGhost) {
        const widget = document.querySelector(`.widget[data-widget-id="${gridState.resizeTarget}"]`);
        if (widget) {
            const rect = widget.getBoundingClientRect();
            const newWidth = rect.width + (newColSpan - gridState.resizeStartColSpan) * cellWidth;
            const newHeight = rect.height + (newRowSpan - gridState.resizeStartRowSpan) * cellHeight;
            gridState.resizeGhost.style.width = Math.max(50, newWidth) + 'px';
            gridState.resizeGhost.style.height = Math.max(50, newHeight) + 'px';
        }
    }

    highlightDropZoneOptimized(gridState.resizeStartRow, gridState.resizeStartCol, newRowSpan, newColSpan);
}

function stopResize() {
    gridState.isResizing = false;

    if (gridState.resizeGhost) {
        gridState.resizeGhost.remove();
        gridState.resizeGhost = null;
    }

    clearHighlightsOptimized();

    document.removeEventListener('mousemove', onResize);
    document.removeEventListener('mouseup', stopResize);
    document.removeEventListener('touchmove', onResize);
    document.removeEventListener('touchend', stopResize);

    if (gridState.resizeTarget &&
        (gridState.resizeCurrentRowSpan !== gridState.resizeStartRowSpan ||
            gridState.resizeCurrentColSpan !== gridState.resizeStartColSpan)) {
        resizeWidgetTo(gridState.resizeTarget, gridState.resizeCurrentRowSpan, gridState.resizeCurrentColSpan);
    }

    gridState.resizeTarget = null;
}

async function resizeWidgetTo(widgetId, rowSpan, colSpan) {
    try {
        const response = await fetch(`/api/pages/${currentPageId}/layout/widget/resize`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                widgetId: widgetId,
                rowSpan: rowSpan,
                colSpan: colSpan
            })
        });

        if (response.ok) {
            await loadGridData();
            showToast('✅ Размер виджета изменен');
        }
    } catch (error) {
        console.error('Error resizing widget:', error);
        showToast('❌ Ошибка изменения размера');
    }
}

function resizeWidget(widgetId) {
    const widget = gridState.widgets.find(w => w.id === widgetId);
    if (!widget) return;

    const sizes = [
        {row: 1, col: 1},
        {row: 1, col: 2},
        {row: 2, col: 1},
        {row: 2, col: 2},
        {row: 2, col: 3},
        {row: 3, col: 2},
        {row: 3, col: 3},
        {row: 4, col: 4}
    ];

    let currentIndex = sizes.findIndex(s => s.row === widget.rowSpan && s.col === widget.colSpan);
    let nextIndex = (currentIndex + 1) % sizes.length;

    resizeWidgetTo(widgetId, sizes[nextIndex].row, sizes[nextIndex].col);
}

// ===== УДАЛЕНИЕ ВИДЖЕТА =====
async function removeWidget(widgetId) {
    if (!confirm('Удалить этот виджет?')) return;

    try {
        const response = await fetch(`/api/pages/${currentPageId}/layout/widget/${widgetId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            await loadGridData();
            showToast('✅ Виджет удален');
        }
    } catch (error) {
        console.error('Error removing widget:', error);
        showToast('❌ Ошибка удаления виджета');
    }
}

// ===== ПЕРЕКЛЮЧЕНИЕ РЕЖИМА РЕДАКТИРОВАНИЯ =====
async function toggleEditMode() {
    try {
        const response = await fetch(`/api/pages/${currentPageId}/layout/toggle-edit`, {
            method: 'POST'
        });

        if (response.ok) {
            await loadGridData();
            showToast(gridState.isEditing ? '✏️ Режим редактирования включен' : '✅ Режим редактирования выключен');
        }
    } catch (error) {
        console.error('Error toggling edit mode:', error);
        showToast('❌ Ошибка переключения режима');
    }
}

// ===== ДОБАВЛЕНИЕ ВИДЖЕТА =====
async function addWidget(type, rowSpan, colSpan) {
    console.log('addWidget called with:', { type, rowSpan, colSpan });
    try {
        const response = await fetch(`/api/pages/${currentPageId}/layout/widget`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: type,
                title: type,
                rowSpan: rowSpan || null,
                colSpan: colSpan || null
            })
        });

        if (response.ok) {
            await loadGridData();
            showToast('✅ Виджет добавлен');
        }
    } catch (error) {
        console.error('Error adding widget:', error);
        showToast('❌ Ошибка добавления виджета');
    }
}

// ===== ДИАЛОГ ДОБАВЛЕНИЯ ВИДЖЕТА =====
function addWidgetDialog() {
    const types = [
        {type: 'LINK', name: '🔗 Ссылки (2×2)'},
        {type: 'CLOCK', name: '🕐 Часы (1×1)'},
        {type: 'WEATHER', name: '🌤️ Погода (1×1)'},
        {type: 'NOTE', name: '📝 Заметки (1×1)'},
        {type: 'TODO', name: '✅ Список дел (1×1)'},
        {type: 'NEXTCLOUD', name: '☁️ Nextcloud (2×2)'}
    ];

    let message = 'Выберите тип виджета:\n';
    types.forEach((t, i) => {
        message += `${i+1}. ${t.name}\n`;
    });

    const choice = prompt(message);
    if (!choice) return;

    const index = parseInt(choice) - 1;
    if (index < 0 || index >= types.length) {
        showToast('❌ Неверный выбор');
        return;
    }

    addWidget(types[index].type);
}

// ===== ОБМЕН ВИДЖЕТОВ МЕСТАМИ =====
async function swapWidgets(widgetId1, widgetId2) {
    try {
        const response = await fetch(`/api/pages/${currentPageId}/layout/swap`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ widgetId1, widgetId2 })
        });

        if (response.ok) {
            await loadGridData();
            showToast('✅ Виджеты перемещены');
        }
    } catch (error) {
        console.error('Error swapping widgets:', error);
        showToast('❌ Ошибка перемещения виджетов');
    }
}

// ===== ГЛОБАЛЬНЫЕ ПРИВЯЗКИ =====
window.addWidget = addWidget;
window.addWidgetDialog = addWidgetDialog;
window.removeWidget = removeWidget;
window.resizeWidget = resizeWidget;
window.toggleEditMode = toggleEditMode;
window.loadGridData = loadGridData;
window.renderGrid = renderGrid;
window.gridState = gridState;
window.initGrid = initGrid;
window.moveWidgetToPosition = moveWidgetToPosition;
window.resizeWidgetTo = resizeWidgetTo;
window.swapWidgets = swapWidgets;