/**
 * FILE-MANAGER.JS - Файловый менеджер
 * Фаза 1: листинг, навигация, breadcrumb, sidebar, create/rename/delete/upload/download
 * Фаза 2: copy/cut/paste, properties toggle, мультискачивание (zip + FS Access API)
 */

// ============================================================
// СОСТОЯНИЕ
// ============================================================
const fileManagerState = {}; // moduleId → { currentPath, entries, sidebarPath, selected, mode, clipboard, showProperties, ... }

const FM_ICON_FOLDER = '📁';
const FM_ICON_SYMLINK = '🔗';

// ============================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================
async function initFileManagerModule(moduleElement, moduleId) {
    const numericId = parseInt(moduleId);
    if (isNaN(numericId)) return;

    // Получаем lastPath из настроек модуля
    let initialPath = '/home/alsa';
    try {
        const resp = await fetch(`/api/modules/${numericId}/data`);
        if (resp.ok) {
            const data = await resp.json();
            const content = data.content || {};
            if (content.lastPath) initialPath = content.lastPath;
        }
    } catch (e) { /* fallback */ }

    fileManagerState[numericId] = {
        currentPath: initialPath,
        entries: [],
        selected: new Set(),         // Set путей
        mode: 'normal',              // 'normal' | 'copy' | 'cut' | 'delete' | 'download'
        clipboard: null,             // { action: 'copy'|'cut', paths: [] }
        showProperties: false,       // toggle: клик по элементу → модалка свойств
        renameMode: false,           // toggle: клик по элементу → модалка переименования
        sidebarPath: '/home/alsa',   // для дерева
        sidebarOpen: {},             // Set раскрытых путей в дереве
        sortBy: 'name',              // 'name' | 'size' | 'modified'
        sortAsc: true
    };

    moduleElement.dataset.moduleId = numericId;
    renderFileManagerShell(moduleElement, numericId);
    await loadDirectory(moduleElement, numericId, initialPath);
}

// ============================================================
// КАРКАС ВИДЖЕТА
// ============================================================
function renderFileManagerShell(moduleElement, moduleId) {
    const state = fileManagerState[moduleId];
    const container = moduleElement.querySelector('.widget-content') ||
        moduleElement.querySelector('.widget-content-wrapper') ||
        moduleElement;

    const colSpan = parseInt(moduleElement.dataset.colSpan || '2');
    const showSidebar = colSpan >= 2;

    container.innerHTML = `
        <div class="fm-root" data-fm-id="${moduleId}">
            <!-- Header: breadcrumb -->
            <div class="fm-header">
                <div class="fm-breadcrumb" id="fm-breadcrumb-${moduleId}"></div>
            </div>

            <!-- Toolbar -->
            <div class="fm-toolbar" id="fm-toolbar-${moduleId}"></div>

            <!-- Main: sidebar + list -->
            <div class="fm-main">
                ${showSidebar ? `<div class="fm-sidebar" id="fm-sidebar-${moduleId}"></div>` : ''}
                <div class="fm-list-container">
                    <div class="fm-list" id="fm-list-${moduleId}"></div>
                </div>
            </div>

            <!-- Status bar -->
            <div class="fm-status" id="fm-status-${moduleId}"></div>
        </div>
    `;

    renderToolbar(moduleElement, moduleId);
    if (showSidebar) renderSidebar(moduleElement, moduleId);

    // ResizeObserver — перестроить при изменении colSpan (если можно динамически менять размер)
    // Пока пропускаем: размер меняется только в edit-режиме.
}

// ============================================================
// TOOLBAR
// ============================================================
function renderToolbar(moduleElement, moduleId) {
    const state = fileManagerState[moduleId];
    const el = moduleElement.querySelector(`#fm-toolbar-${moduleId}`);
    if (!el) return;

    const inSelectionMode = ['copy', 'cut', 'delete', 'download'].includes(state.mode);
    const hasClipboard = state.clipboard && state.clipboard.paths.length > 0;

    const buttons = [
        { id: 'create',  icon: '📄', title: 'Создать файл',       active: false },
        { id: 'mkdir',   icon: '📁', title: 'Создать папку',      active: false },
        { id: 'copy',    icon: '📋', title: 'Копировать',         active: state.mode === 'copy' },
        { id: 'cut',     icon: '✂️', title: 'Вырезать',           active: state.mode === 'cut' },
        { id: 'paste',   icon: '📥', title: 'Вставить',           disabled: !hasClipboard },
        { id: 'rename',  icon: '✏️', title: 'Переименовать',      active: state.renameMode },
        { id: 'delete',  icon: '🗑️', title: 'Удалить',            active: state.mode === 'delete' },
        { id: 'props',   icon: 'ℹ️', title: 'Свойства',           active: state.showProperties },
        { id: 'upload',  icon: '⬆️', title: 'Загрузить',          active: false },
        { id: 'download',icon: '⬇️', title: 'Скачать',            active: state.mode === 'download' },
        { id: 'cancel',  icon: '✕', title: 'Отменить выделение',  visible: inSelectionMode }
    ];

    let html = '';
    buttons.forEach(b => {
        if (b.visible === false) return;
        const cls = ['fm-btn'];
        if (b.active) cls.push('active');
        if (b.disabled) cls.push('disabled');
        html += `<button class="${cls.join(' ')}" data-action="${b.id}" title="${b.title}" ${b.disabled ? 'disabled' : ''}>
            <span class="fm-btn-icon">${b.icon}</span>
        </button>`;
    });
    el.innerHTML = html;

    el.querySelectorAll('.fm-btn').forEach(btn => {
        if (btn.disabled) return;
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleToolbarClick(moduleElement, moduleId, btn.dataset.action);
        });
    });
}

// ============================================================
// SIDEBAR (дерево папок)
// ============================================================
async function renderSidebar(moduleElement, moduleId) {
    const state = fileManagerState[moduleId];
    const el = moduleElement.querySelector(`#fm-sidebar-${moduleId}`);
    if (!el) return;

    el.innerHTML = `<div class="fm-tree-loading">⏳ Загрузка...</div>`;

    try {
        const tree = await fetchTree('/home/alsa');
        el.innerHTML = '';
        el.appendChild(buildTreeNode('/home/alsa', 'alsa', tree, moduleId, 0));
    } catch (e) {
        el.innerHTML = `<div class="fm-tree-error">❌ Ошибка загрузки дерева</div>`;
    }
}

function buildTreeNode(path, name, children, moduleId, depth) {
    const state = fileManagerState[moduleId];
    const isOpen = state.sidebarOpen[path] === true;
    const isCurrent = state.currentPath === path;

    const wrapper = document.createElement('div');
    wrapper.className = 'fm-tree-node';
    wrapper.dataset.path = path;

    const row = document.createElement('div');
    row.className = 'fm-tree-row';
    if (isCurrent) row.classList.add('current');
    row.style.paddingLeft = (8 + depth * 14) + 'px';

    const hasChildren = children && children.length > 0;
    row.innerHTML = `
        <span class="fm-tree-toggle">${hasChildren ? (isOpen ? '▾' : '▸') : ' '}</span>
        <span class="fm-tree-icon">${FM_ICON_FOLDER}</span>
        <span class="fm-tree-name">${escapeHtml(name)}</span>
    `;

    // Клик по toggle — раскрыть/закрыть
    row.querySelector('.fm-tree-toggle').addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!hasChildren) return;
        state.sidebarOpen[path] = !state.sidebarOpen[path];
        await renderSidebar(moduleElement, moduleId);
    });

    // Клик по имени — переход
    row.addEventListener('click', async (e) => {
        e.stopPropagation();
        await navigateTo(moduleElement, moduleId, path);
    });

    wrapper.appendChild(row);

    if (isOpen && hasChildren) {
        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'fm-tree-children';
        for (const child of children) {
            // Ленивая загрузка: если не знаем hasChildren — подгружаем при клике на toggle
            childrenContainer.appendChild(buildTreeNode(
                child.path, child.name, child.hasChildren ? null : [], moduleId, depth + 1
            ));
        }
        wrapper.appendChild(childrenContainer);
    }

    return wrapper;
}

async function fetchTree(path) {
    const resp = await fetch(`/api/files/tree?path=${encodeURIComponent(path)}`);
    if (!resp.ok) throw new Error('Tree load failed');
    return await resp.json();
}

// ============================================================
// BREADCRUMB
// ============================================================
function renderBreadcrumb(moduleElement, moduleId) {
    const state = fileManagerState[moduleId];
    const el = moduleElement.querySelector(`#fm-breadcrumb-${moduleId}`);
    if (!el) return;

    const path = state.currentPath;
    const segments = path.split('/').filter(s => s.length > 0);

    let html = '';
    // Корень
    const rootPath = '/';
    html += `<span class="fm-crumb" data-path="${rootPath}">🏠 /</span>`;

    let accumulated = '';
    segments.forEach((seg, idx) => {
        accumulated += '/' + seg;
        html += `<span class="fm-crumb-sep">›</span>`;
        html += `<span class="fm-crumb" data-path="${escapeHtml(accumulated)}">${escapeHtml(seg)}</span>`;
    });

    el.innerHTML = html;

    el.querySelectorAll('.fm-crumb').forEach(crumb => {
        crumb.addEventListener('click', async (e) => {
            e.stopPropagation();
            await navigateTo(moduleElement, moduleId, crumb.dataset.path);
        });
    });
}

// ============================================================
// НАВИГАЦИЯ
// ============================================================
async function navigateTo(moduleElement, moduleId, path) {
    const state = fileManagerState[moduleId];
    state.selected.clear();
    state.mode = 'normal';
    await loadDirectory(moduleElement, moduleId, path);
    // Сохраняем lastPath на сервере
    saveLastPath(moduleId, path);
}

async function saveLastPath(moduleId, path) {
    try {
        await fetch(`/api/modules/${moduleId}/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'updateSettings',
                params: { lastPath: path }
            })
        });
    } catch (e) { /* тихо */ }
}

// ============================================================
// ЗАГРУЗКА ДИРЕКТОРИИ
// ============================================================
async function loadDirectory(moduleElement, moduleId, path) {
    const state = fileManagerState[moduleId];
    const listEl = moduleElement.querySelector(`#fm-list-${moduleId}`);
    if (listEl) listEl.innerHTML = `<div class="fm-loading">⏳ Загрузка...</div>`;

    try {
        const resp = await fetch(`/api/files/list?path=${encodeURIComponent(path)}`);
        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err.error || 'Load failed');
        }
        const data = await resp.json();

        state.currentPath = data.path;
        state.entries = data.entries || [];

        renderBreadcrumb(moduleElement, moduleId);
        renderFileList(moduleElement, moduleId);
        renderToolbar(moduleElement, moduleId);
        renderStatus(moduleElement, moduleId);
    } catch (e) {
        if (listEl) listEl.innerHTML = `<div class="fm-error">❌ ${escapeHtml(e.message)}</div>`;
    }
}

// ============================================================
// СПИСОК ФАЙЛОВ
// ============================================================
function renderFileList(moduleElement, moduleId) {
    const state = fileManagerState[moduleId];
    const el = moduleElement.querySelector(`#fm-list-${moduleId}`);
    if (!el) return;

    let entries = [...state.entries];
    entries.sort((a, b) => {
        if (a.directory !== b.directory) return a.directory ? -1 : 1;
        let cmp = 0;
        switch (state.sortBy) {
            case 'size': cmp = (a.size || 0) - (b.size || 0); break;
            case 'modified':
                cmp = (a.lastModified || '').localeCompare(b.lastModified || '');
                break;
            default: cmp = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
        }
        return state.sortAsc ? cmp : -cmp;
    });

    if (entries.length === 0) {
        el.innerHTML = `<div class="fm-empty">📂 Папка пуста</div>`;
        return;
    }

    let html = '';
    for (const entry of entries) {
        const isSelected = state.selected.has(entry.path);
        const classes = ['fm-entry'];
        if (entry.directory) classes.push('fm-entry-dir');
        if (entry.symlink) classes.push('fm-entry-symlink');
        if (entry.hidden) classes.push('fm-entry-hidden');
        if (isSelected) classes.push('fm-entry-selected');

        const sizeCol = entry.directory ? '—' : (entry.sizeFormatted || '—');
        const dateCol = entry.lastModified ? formatDate(entry.lastModified) : '—';

        html += `
            <div class="${classes.join(' ')}" data-path="${escapeHtml(entry.path)}" data-name="${escapeHtml(entry.name)}" data-dir="${entry.directory}">
                <div class="fm-entry-check">
                    <input type="checkbox" ${isSelected ? 'checked' : ''} tabindex="-1">
                </div>
                <div class="fm-entry-icon">${entry.icon || '📄'}</div>
                <div class="fm-entry-name" title="${escapeHtml(entry.name)}">${escapeHtml(entry.name)}</div>
                <div class="fm-entry-size">${sizeCol}</div>
                <div class="fm-entry-date">${dateCol}</div>
            </div>
        `;
    }
    el.innerHTML = html;

    el.querySelectorAll('.fm-entry').forEach(row => {
        row.addEventListener('click', (e) => handleEntryClick(moduleElement, moduleId, row, e));
        row.addEventListener('dblclick', (e) => handleEntryDblClick(moduleElement, moduleId, row, e));
    });

    renderListHeader(moduleElement, moduleId);
}

function renderListHeader(moduleElement, moduleId) {
    const state = fileManagerState[moduleId];
    const listEl = moduleElement.querySelector(`#fm-list-${moduleId}`);
    if (!listEl) return;

    // Проверяем, есть ли уже заголовок
    let header = listEl.querySelector('.fm-list-header');
    if (!header) {
        header = document.createElement('div');
        header.className = 'fm-list-header';
        listEl.insertBefore(header, listEl.firstChild);
    }

    const arrow = (col) => state.sortBy === col ? (state.sortAsc ? ' ▲' : ' ▼') : '';

    header.innerHTML = `
        <div class="fm-entry-check"></div>
        <div class="fm-entry-icon"></div>
        <div class="fm-entry-name fm-sortable" data-sort="name">Имя${arrow('name')}</div>
        <div class="fm-entry-size fm-sortable" data-sort="size">Размер${arrow('size')}</div>
        <div class="fm-entry-date fm-sortable" data-sort="modified">Изменён${arrow('modified')}</div>
    `;

    header.querySelectorAll('.fm-sortable').forEach(el => {
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            const col = el.dataset.sort;
            if (state.sortBy === col) state.sortAsc = !state.sortAsc;
            else { state.sortBy = col; state.sortAsc = true; }
            renderFileList(moduleElement, moduleId);
        });
    });
}

function formatDate(isoStr) {
    try {
        const d = new Date(isoStr);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yy = d.getFullYear();
        const hh = String(d.getHours()).padStart(2, '0');
        const mi = String(d.getMinutes()).padStart(2, '0');
        return `${dd}.${mm}.${yy} ${hh}:${mi}`;
    } catch (e) { return '—'; }
}

// ============================================================
// КЛИКИ ПО ЭЛЕМЕНТАМ
// ============================================================
async function handleEntryClick(moduleElement, moduleId, row, e) {
    const state = fileManagerState[moduleId];
    const path = row.dataset.path;
    const isDir = row.dataset.dir === 'true';

    // Режим выделения (copy/cut/delete/download)
    if (['copy', 'cut', 'delete', 'download'].includes(state.mode)) {
        toggleSelection(moduleId, path);
        renderFileList(moduleElement, moduleId);
        renderStatus(moduleElement, moduleId);
        return;
    }

    // Toggle: rename
    if (state.renameMode) {
        openRenameModal(moduleElement, moduleId, path, row.dataset.name);
        return;
    }

    // Toggle: properties
    if (state.showProperties) {
        openPropertiesModal(moduleId, path);
        return;
    }

    // Обычный клик — выделение одного
    state.selected.clear();
    state.selected.add(path);
    renderFileList(moduleElement, moduleId);
    renderStatus(moduleElement, moduleId);
}

async function handleEntryDblClick(moduleElement, moduleId, row, e) {
    e.stopPropagation();
    const path = row.dataset.path;
    const isDir = row.dataset.dir === 'true';
    if (isDir) {
        await navigateTo(moduleElement, moduleId, path);
    } else {
        downloadSingle(path);
    }
}

function toggleSelection(moduleId, path) {
    const state = fileManagerState[moduleId];
    if (state.selected.has(path)) state.selected.delete(path);
    else state.selected.add(path);
}

// ============================================================
// TOOLBAR — ОБРАБОТЧИКИ
// ============================================================
async function handleToolbarClick(moduleElement, moduleId, action) {
    const state = fileManagerState[moduleId];

    switch (action) {
        case 'create':   openCreateModal(moduleElement, moduleId, false); break;
        case 'mkdir':    openCreateModal(moduleElement, moduleId, true); break;

        case 'copy':
            if (state.mode === 'copy') {
                // Подтверждение — в буфер
                if (state.selected.size === 0) {
                    showToast('❌ Ничего не выбрано');
                    return;
                }
                state.clipboard = { action: 'copy', paths: [...state.selected] };
                state.selected.clear();
                state.mode = 'normal';
                showToast(`📋 Скопировано: ${state.clipboard.paths.length}`);
                renderToolbar(moduleElement, moduleId);
                renderFileList(moduleElement, moduleId);
                renderStatus(moduleElement, moduleId);
            } else {
                state.mode = 'copy';
                state.selected.clear();
                renderToolbar(moduleElement, moduleId);
                renderFileList(moduleElement, moduleId);
                renderStatus(moduleElement, moduleId);
            }
            break;

        case 'cut':
            if (state.mode === 'cut') {
                if (state.selected.size === 0) {
                    showToast('❌ Ничего не выбрано');
                    return;
                }
                state.clipboard = { action: 'cut', paths: [...state.selected] };
                state.selected.clear();
                state.mode = 'normal';
                showToast(`✂️ Вырезано: ${state.clipboard.paths.length}`);
                renderToolbar(moduleElement, moduleId);
                renderFileList(moduleElement, moduleId);
                renderStatus(moduleElement, moduleId);
            } else {
                state.mode = 'cut';
                state.selected.clear();
                renderToolbar(moduleElement, moduleId);
                renderFileList(moduleElement, moduleId);
                renderStatus(moduleElement, moduleId);
            }
            break;

        case 'paste':
            await pasteFromClipboard(moduleElement, moduleId);
            break;

        case 'rename':
            state.renameMode = !state.renameMode;
            renderToolbar(moduleElement, moduleId);
            showToast(state.renameMode ? '✏️ Режим переименования включён' : '✏️ Режим переименования выключен');
            break;

        case 'delete':
            if (state.mode === 'delete') {
                if (state.selected.size === 0) {
                    showToast('❌ Ничего не выбрано');
                    return;
                }
                await confirmDelete(moduleElement, moduleId);
            } else {
                state.mode = 'delete';
                state.selected.clear();
                renderToolbar(moduleElement, moduleId);
                renderFileList(moduleElement, moduleId);
                renderStatus(moduleElement, moduleId);
            }
            break;

        case 'props':
            state.showProperties = !state.showProperties;
            renderToolbar(moduleElement, moduleId);
            showToast(state.showProperties ? 'ℹ️ Режим свойств включён' : 'ℹ️ Режим свойств выключен');
            break;

        case 'upload':
            openUploadModal(moduleElement, moduleId);
            break;

        case 'download':
            if (state.mode === 'download') {
                if (state.selected.size === 0) {
                    showToast('❌ Ничего не выбрано');
                    return;
                }
                await downloadSelected(moduleElement, moduleId);
            } else {
                state.mode = 'download';
                state.selected.clear();
                renderToolbar(moduleElement, moduleId);
                renderFileList(moduleElement, moduleId);
                renderStatus(moduleElement, moduleId);
            }
            break;

        case 'cancel':
            state.mode = 'normal';
            state.selected.clear();
            renderToolbar(moduleElement, moduleId);
            renderFileList(moduleElement, moduleId);
            renderStatus(moduleElement, moduleId);
            break;
    }
}

// ============================================================
// STATUS BAR
// ============================================================
function renderStatus(moduleElement, moduleId) {
    const state = fileManagerState[moduleId];
    const el = moduleElement.querySelector(`#fm-status-${moduleId}`);
    if (!el) return;

    if (['copy', 'cut', 'delete', 'download'].includes(state.mode)) {
        const labels = { copy: 'копирование', cut: 'вырезание', delete: 'удаление', download: 'скачивание' };
        el.textContent = `Выбрано: ${state.selected.size} · Режим: ${labels[state.mode]} · Повторное нажатие кнопки подтвердит`;
        el.classList.add('fm-status-active');
    } else if (state.clipboard) {
        const a = state.clipboard.action === 'copy' ? '📋' : '✂️';
        el.textContent = `${a} Буфер: ${state.clipboard.paths.length} элемент(ов)`;
        el.classList.add('fm-status-active');
    } else {
        el.textContent = `Элементов: ${state.entries.length}`;
        el.classList.remove('fm-status-active');
    }
}

// ============================================================
// МОДАЛКА — СОЗДАНИЕ
// ============================================================
function openCreateModal(moduleElement, moduleId, isFolder) {
    const state = fileManagerState[moduleId];
    const title = isFolder ? '📁 Создать папку' : '📄 Создать файл';
    const placeholder = isFolder ? 'имя папки или a/b/c' : 'имя файла';

    showFMModal({
        title,
        body: `
            <label class="fm-form-label">Имя ${isFolder ? '(можно с вложенностью a/b/c)' : ''}</label>
            <input type="text" class="fm-input" id="fm-create-name" placeholder="${placeholder}" autofocus>
        `,
        buttons: [
            { text: 'Отмена', cls: 'cancel', onClick: (close) => close() },
            { text: 'Создать', cls: 'primary', onClick: async (close) => {
                    const nameEl = document.getElementById('fm-create-name');
                    const name = nameEl.value.trim();
                    if (!name) { showToast('❌ Введите имя'); return; }
                    try {
                        const resp = await fetch('/api/files/create', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ path: state.currentPath, name, isFolder })
                        });
                        if (resp.ok) {
                            showToast('✅ Создано');
                            close();
                            await loadDirectory(moduleElement, moduleId, state.currentPath);
                        } else {
                            const err = await resp.json().catch(() => ({}));
                            showToast('❌ ' + (err.error || 'Ошибка'));
                        }
                    } catch (e) { showToast('❌ ' + e.message); }
                }}
        ]
    });
}

// ============================================================
// МОДАЛКА — ПЕРЕИМЕНОВАНИЕ
// ============================================================
function openRenameModal(moduleElement, moduleId, path, currentName) {
    const state = fileManagerState[moduleId];
    showFMModal({
        title: '✏️ Переименовать',
        body: `
            <label class="fm-form-label">Новое имя</label>
            <input type="text" class="fm-input" id="fm-rename-name" value="${escapeHtml(currentName)}" autofocus>
        `,
        buttons: [
            { text: 'Отмена', cls: 'cancel', onClick: (close) => close() },
            { text: 'Переименовать', cls: 'primary', onClick: async (close) => {
                    const nameEl = document.getElementById('fm-rename-name');
                    const newName = nameEl.value.trim();
                    if (!newName) { showToast('❌ Введите имя'); return; }
                    if (newName === currentName) { close(); return; }
                    try {
                        const resp = await fetch('/api/files/rename', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ path, newName })
                        });
                        if (resp.ok) {
                            showToast('✅ Переименовано');
                            close();
                            await loadDirectory(moduleElement, moduleId, state.currentPath);
                        } else {
                            const err = await resp.json().catch(() => ({}));
                            showToast('❌ ' + (err.error || 'Ошибка'));
                        }
                    } catch (e) { showToast('❌ ' + e.message); }
                }}
        ]
    });
}

// ============================================================
// МОДАЛКА — УДАЛЕНИЕ
// ============================================================
async function confirmDelete(moduleElement, moduleId) {
    const state = fileManagerState[moduleId];
    const paths = [...state.selected];
    const names = paths.map(p => p.split('/').pop()).join(', ');

    showFMModal({
        title: '🗑️ Удалить?',
        body: `
            <p style="margin:0 0 8px 0;">Будут удалены (${paths.length}):</p>
            <div class="fm-delete-list">${escapeHtml(names)}</div>
        `,
        buttons: [
            { text: 'Отмена', cls: 'cancel', onClick: (close) => close() },
            { text: 'Удалить', cls: 'danger', onClick: async (close) => {
                    try {
                        const resp = await fetch('/api/files/delete', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ paths })
                        });
                        if (resp.ok) {
                            showToast('✅ Удалено');
                            close();
                            state.selected.clear();
                            state.mode = 'normal';
                            await loadDirectory(moduleElement, moduleId, state.currentPath);
                        } else {
                            const err = await resp.json().catch(() => ({}));
                            showToast('❌ ' + (err.error || 'Ошибка'));
                        }
                    } catch (e) { showToast('❌ ' + e.message); }
                }}
        ]
    });
}

// ============================================================
// МОДАЛКА — СВОЙСТВА
// ============================================================
async function openPropertiesModal(moduleId, path) {
    let props;
    try {
        const resp = await fetch(`/api/files/properties?path=${encodeURIComponent(path)}`);
        if (!resp.ok) throw new Error('load failed');
        props = await resp.json();
    } catch (e) {
        showToast('❌ Не удалось загрузить свойства');
        return;
    }

    const sizeBlock = props.directory
        ? `<div class="fm-prop-row"><span class="fm-prop-key">Размер:</span><span class="fm-prop-val" id="fm-prop-size">
              <span class="fm-prop-size-loading">— (${props.childCount >= 0 ? props.childCount + ' элементов' : 'вычислить?'})</span>
              <button class="fm-size-calc-btn" onclick="fmCalcFolderSize('${escapeHtml(path)}')">Вычислить</button>
           </span></div>`
        : `<div class="fm-prop-row"><span class="fm-prop-key">Размер:</span><span class="fm-prop-val">${props.sizeFormatted}</span></div>`;

    showFMModal({
        title: 'ℹ️ Свойства',
        wide: true,
        body: `
            <div class="fm-props">
                <div class="fm-prop-row"><span class="fm-prop-key">Имя:</span><span class="fm-prop-val">${escapeHtml(props.name)}</span></div>
                <div class="fm-prop-row"><span class="fm-prop-key">Путь:</span><span class="fm-prop-val fm-prop-path">${escapeHtml(props.path)}</span></div>
                <div class="fm-prop-row"><span class="fm-prop-key">Тип:</span><span class="fm-prop-val">${props.directory ? 'Папка' : 'Файл'}${props.symlink ? ' (символическая ссылка)' : ''}</span></div>
                ${props.symlinkTarget ? `<div class="fm-prop-row"><span class="fm-prop-key">→ Цель:</span><span class="fm-prop-val">${escapeHtml(props.symlinkTarget)}</span></div>` : ''}
                ${sizeBlock}
                <div class="fm-prop-row"><span class="fm-prop-key">Создан:</span><span class="fm-prop-val">${formatDate(props.created)}</span></div>
                <div class="fm-prop-row"><span class="fm-prop-key">Изменён:</span><span class="fm-prop-val">${formatDate(props.lastModified)}</span></div>
                <div class="fm-prop-row"><span class="fm-prop-key">Открыт:</span><span class="fm-prop-val">${formatDate(props.lastAccessed)}</span></div>
                <div class="fm-prop-row"><span class="fm-prop-key">Владелец:</span><span class="fm-prop-val">${escapeHtml(props.owner)} : ${escapeHtml(props.group)}</span></div>
                <div class="fm-prop-row"><span class="fm-prop-key">Права:</span><span class="fm-prop-val">${escapeHtml(props.permissions)} (${escapeHtml(props.permissionsOctal)})</span></div>
            </div>
        `,
        buttons: [
            { text: 'Закрыть', cls: 'cancel', onClick: (close) => close() }
        ]
    });
}

async function fmCalcFolderSize(path) {
    const el = document.getElementById('fm-prop-size');
    if (!el) return;
    el.innerHTML = `<span class="fm-prop-size-loading">⏳ Вычисление...</span>`;
    try {
        const resp = await fetch(`/api/files/folder-size?path=${encodeURIComponent(path)}`);
        if (resp.ok) {
            const data = await resp.json();
            el.innerHTML = data.sizeFormatted;
        } else {
            el.innerHTML = '❌ Ошибка';
        }
    } catch (e) {
        el.innerHTML = '❌ Ошибка';
    }
}

// ============================================================
// МОДАЛКА — ЗАГРУЗКА
// ============================================================
function openUploadModal(moduleElement, moduleId) {
    const state = fileManagerState[moduleId];
    showFMModal({
        title: '⬆️ Загрузить файлы',
        body: `
            <p style="margin:0 0 12px 0;">В папку: <code>${escapeHtml(state.currentPath)}</code></p>
            <input type="file" multiple id="fm-upload-input" class="fm-input">
            <div id="fm-upload-progress" class="fm-upload-progress"></div>
        `,
        buttons: [
            { text: 'Отмена', cls: 'cancel', onClick: (close) => close() },
            { text: 'Загрузить', cls: 'primary', onClick: async (close) => {
                    const input = document.getElementById('fm-upload-input');
                    if (!input.files || input.files.length === 0) {
                        showToast('❌ Выберите файлы');
                        return;
                    }
                    const formData = new FormData();
                    formData.append('path', state.currentPath);
                    for (const f of input.files) formData.append('files', f);

                    const progress = document.getElementById('fm-upload-progress');
                    progress.textContent = `⏳ Загрузка ${input.files.length} файлов...`;

                    try {
                        const resp = await fetch('/api/files/upload', { method: 'POST', body: formData });
                        if (resp.ok) {
                            const data = await resp.json();
                            showToast(`✅ Загружено: ${data.uploaded}`);
                            close();
                            await loadDirectory(moduleElement, moduleId, state.currentPath);
                        } else {
                            const err = await resp.json().catch(() => ({}));
                            progress.textContent = '❌ ' + (err.error || 'Ошибка');
                        }
                    } catch (e) { progress.textContent = '❌ ' + e.message; }
                }}
        ]
    });
}

// ============================================================
// PASTE (copy/cut)
// ============================================================
async function pasteFromClipboard(moduleElement, moduleId) {
    const state = fileManagerState[moduleId];
    if (!state.clipboard) return;

    showToast('⏳ Копирование...'); // Фаза 2: реально реализуем копирование.
    // Заглушка — Фаза 2.
}

// ============================================================
// СКАЧИВАНИЕ
// ============================================================
function downloadSingle(path) {
    const url = `/api/files/download?path=${encodeURIComponent(path)}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = '';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

async function downloadSelected(moduleElement, moduleId) {
    // Фаза 2: реализуем FS Access API + zip. Пока — скачиваем файлы по одному.
    const state = fileManagerState[moduleId];
    for (const path of state.selected) {
        const entry = state.entries.find(e => e.path === path);
        if (entry && !entry.directory) downloadSingle(path);
    }
    showToast('ℹ️ Скачивание папок — в разработке (Фаза 2)');
}

// ============================================================
// УТИЛИТЫ
// ============================================================
function showFMModal({ title, body, buttons, wide }) {
    // Закрываем старую
    document.querySelectorAll('.fm-modal-overlay').forEach(el => el.remove());

    const overlay = document.createElement('div');
    overlay.className = 'fm-modal-overlay';
    overlay.innerHTML = `
        <div class="fm-modal ${wide ? 'fm-modal-wide' : ''}">
            <div class="fm-modal-header">
                <span>${title}</span>
                <button class="fm-modal-close">✕</button>
            </div>
            <div class="fm-modal-body">${body}</div>
            <div class="fm-modal-footer"></div>
        </div>
    `;
    document.body.appendChild(overlay);

    const close = () => overlay.remove();

    overlay.querySelector('.fm-modal-close').addEventListener('click', close);
    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });

    const footer = overlay.querySelector('.fm-modal-footer');
    buttons.forEach(b => {
        const btn = document.createElement('button');
        btn.className = 'fm-modal-btn ' + (b.cls || '');
        btn.textContent = b.text;
        btn.addEventListener('click', () => b.onClick(close));
        footer.appendChild(btn);
    });

    setTimeout(() => {
        const input = overlay.querySelector('input.fm-input');
        if (input) input.focus();
    }, 50);
}

// Автоинициализация всех виджетов FILES на странице
(function autoInitFileManager() {
    function tryInit() {
        document.querySelectorAll('.widget[data-widget-type="FILES"]').forEach(widget => {
            const id = widget.dataset.widgetId;
            if (!id) return;
            // Не инициализируем дважды
            if (widget.querySelector('.fm-root')) return;
            console.log('[FM] auto-init widget', id);
            try {
                initFileManagerModule(widget, id);
            } catch (e) {
                console.error('[FM] init failed for', id, e);
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(tryInit, 500);
        });
    } else {
        setTimeout(tryInit, 500);
    }
})();

// Глобальная функция (вызывается из inline onclick в модалке свойств)
window.fmCalcFolderSize = fmCalcFolderSize;

window.initFileManagerModule = initFileManagerModule;