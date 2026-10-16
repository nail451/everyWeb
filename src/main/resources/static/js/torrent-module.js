/**
 * TORRENT-MODULE.JS - Виджет торрент-клиента qBittorrent
 *
 * Вкладки: Основное, Файлы, Трекеры, Пиры
 * Адаптив: normal (2×2, 3×3), tall (N×1), wide (1×N)
 */

// ============================================================
// СОСТОЯНИЕ
// ============================================================
const torrentState = {}; // moduleId → { torrents, selectedHash, activeTab, layout, ... }
// ============================================================
// ОПРЕДЕЛЕНИЕ LAYOUT
// ============================================================
function detectTorrentLayout(moduleElement) {
    const colSpan = parseInt(moduleElement.dataset.colSpan || '2');
    const rowSpan = parseInt(moduleElement.dataset.rowSpan || '2');

    // wide: 1×2, 1×3, 1×4 — colSpan >= rowSpan * 2
    if (colSpan >= rowSpan * 2) return 'wide';
    // tall: 2×1, 3×1, 4×1 — rowSpan > colSpan
    if (rowSpan > colSpan) return 'tall';
    // normal: 2×2, 3×3
    return 'normal';
}

// ============================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================
async function initTorrentModule(moduleElement, moduleId) {
    const numericId = parseInt(moduleId);
    if (isNaN(numericId)) return;

    const layout = detectTorrentLayout(moduleElement);

    torrentState[numericId] = {
        moduleId: numericId,
        layout: layout,
        torrents: [],
        transferInfo: null,
        speedLimitsMode: 0,       // 0 = безлимит, 1 = медленный
        connected: false,
        version: null,
        selectedHash: null,       // выбранный торрент (для вкладок)
        activeTab: 'main',        // 'main' | 'files' | 'trackers' | 'peers'
        pollTimer: null,
        pollInterval: 3000,
        // Кэш данных вкладок (для выбранного торрента)
        filesCache: {},           // hash → List<TorrentFileDTO>
        trackersCache: {},        // hash → List<TorrentTrackerDTO>
        peersCache: {}            // hash → List<TorrentPeerDTO>
    };

    moduleElement.dataset.moduleId = numericId;

    renderTorrentShell(moduleElement, numericId);
    await loadTorrentData(moduleElement, numericId);
    startTorrentPolling(moduleElement, numericId);
}

// ============================================================
// КАРКАС ВИДЖЕТА
// ============================================================
function renderTorrentShell(moduleElement, moduleId) {
    const state = torrentState[moduleId];
    const container = moduleElement.querySelector('.widget-content') ||
        moduleElement.querySelector('.widget-content-wrapper') ||
        moduleElement;

    container.innerHTML = `
        <div class="torrent-root layout-${state.layout}" data-torrent-id="${moduleId}">

            <!-- Шапка: статус + кнопки действий -->
            <div class="torrent-header">
                <div class="torrent-status" id="torrent-status-${moduleId}">
                    <span class="torrent-conn-dot"></span>
                    <span class="torrent-conn-text">Подключение...</span>
                </div>
                <div class="torrent-header-actions">
                    <button class="torrent-btn" data-action="add-magnet" title="Добавить magnet-ссылку">🧲</button>
                    <button class="torrent-btn" data-action="add-file" title="Загрузить .torrent файл">📁</button>
                    <button class="torrent-btn" data-action="toggle-speed" title="Переключить лимит скорости">🚀</button>
                    <button class="torrent-btn" data-action="refresh" title="Обновить">🔄</button>
                </div>
            </div>

            <!-- Основной блок: список + вкладки -->
            <div class="torrent-body">

                <!-- Список торрентов -->
                <div class="torrent-list-container">
                    <div class="torrent-list" id="torrent-list-${moduleId}">
                        <div class="torrent-loading">⏳ Загрузка...</div>
                    </div>
                </div>

                <!-- Панель вкладок -->
                <div class="torrent-tabs-panel" id="torrent-tabs-${moduleId}">
                    <div class="torrent-tabs-nav">
                        <button class="torrent-tab active" data-tab="main">📊 Основное</button>
                        <button class="torrent-tab" data-tab="files">📄 Файлы</button>
                        <button class="torrent-tab" data-tab="trackers">📡 Трекеры</button>
                        <button class="torrent-tab" data-tab="peers">👥 Пиры</button>
                    </div>
                    <div class="torrent-tab-content" id="torrent-tab-content-${moduleId}">
                        <div class="torrent-empty-tab">Выберите торрент</div>
                    </div>
                </div>

            </div>

        </div>
    `;

    bindTorrentHeaderEvents(moduleElement, moduleId);
    bindTorrentTabEvents(moduleElement, moduleId);
}

// ============================================================
// ОБРАБОТЧИКИ ШАПКИ
// ============================================================
function bindTorrentHeaderEvents(moduleElement, moduleId) {
    const header = moduleElement.querySelector('.torrent-header-actions');
    if (!header) return;

    header.querySelectorAll('.torrent-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleTorrentHeaderAction(moduleElement, moduleId, btn.dataset.action);
        });
    });
}

async function handleTorrentHeaderAction(moduleElement, moduleId, action) {
    const state = torrentState[moduleId];

    switch (action) {
        case 'add-magnet':
            openAddMagnetModal(moduleElement, moduleId);
            break;

        case 'add-file':
            openAddFileModal(moduleElement, moduleId);
            break;

        case 'toggle-speed':
            await toggleSpeedLimit(moduleElement, moduleId);
            break;

        case 'refresh':
            await loadTorrentData(moduleElement, moduleId);
            break;
    }
}

// ============================================================
// ОБРАБОТЧИКИ ВКЛАДОК
// ============================================================
function bindTorrentTabEvents(moduleElement, moduleId) {
    const nav = moduleElement.querySelector('.torrent-tabs-nav');
    if (!nav) return;

    nav.querySelectorAll('.torrent-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.stopPropagation();
            switchTorrentTab(moduleElement, moduleId, tab.dataset.tab);
        });
    });
}

async function switchTorrentTab(moduleElement, moduleId, tab) {
    const state = torrentState[moduleId];
    state.activeTab = tab;

    // Переключаем активный класс
    moduleElement.querySelectorAll('.torrent-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === tab);
    });

    await renderActiveTab(moduleElement, moduleId);
}

// ============================================================
// ЗАГРУЗКА ДАННЫХ
// ============================================================
async function loadTorrentData(moduleElement, moduleId) {
    const state = torrentState[moduleId];

    try {
        const resp = await fetch(`/api/torrents/${moduleId}/list`);
        if (!resp.ok) {
            throw new Error('Load failed');
        }
        const data = await resp.json();

        state.torrentData = data.torrentData || {};
        state.connected = data.connected || false;
        state.version = data.version || null;
        state.torrents = data.torrents || [];
        state.transferInfo = data.transferInfo || null;
        state.speedLimitsMode = data.speedLimitsMode != null ? data.speedLimitsMode : 0;

        renderTorrentStatus(moduleElement, moduleId);
        renderTorrentList(moduleElement, moduleId);
        await renderActiveTab(moduleElement, moduleId);

        // Обновляем иконку скорости
        updateSpeedToggleIcon(moduleElement, moduleId);

    } catch (e) {
        const listEl = moduleElement.querySelector(`#torrent-list-${moduleId}`);
        if (listEl) {
            listEl.innerHTML = `<div class="torrent-error">❌ Не удалось загрузить торренты</div>`;
        }
    }
}

// ============================================================
// ПОЛЛИНГ
// ============================================================
function startTorrentPolling(moduleElement, moduleId) {
    const state = torrentState[moduleId];
    if (state.pollTimer) clearInterval(state.pollTimer);

    state.pollTimer = setInterval(async () => {
        if (!document.body.contains(moduleElement)) {
            clearInterval(state.pollTimer);
            state.pollTimer = null;
            return;
        }
        await loadTorrentData(moduleElement, moduleId);
    }, state.pollInterval);
}

// ============================================================
// СТАТУС
// ============================================================
function renderTorrentStatus(moduleElement, moduleId) {
    const state = torrentState[moduleId];
    const el = moduleElement.querySelector(`#torrent-status-${moduleId}`);
    if (!el) return;

    const dot = el.querySelector('.torrent-conn-dot');
    const text = el.querySelector('.torrent-conn-text');

    if (state.connected) {
        dot.className = 'torrent-conn-dot connected';
        const info = state.transferInfo || {};
        const dl = formatSpeed(info.dl_info_speed || 0);
        const up = formatSpeed(info.up_info_speed || 0);
        text.textContent = `↓${dl} ↑${up}`;
    } else {
        dot.className = 'torrent-conn-dot disconnected';
        text.textContent = 'Нет подключения';
    }
}

// ============================================================
// ИКОНКА СКОРОСТИ
// ============================================================
function updateSpeedToggleIcon(moduleElement, moduleId) {
    const state = torrentState[moduleId];
    const btn = moduleElement.querySelector('.torrent-btn[data-action="toggle-speed"]');
    if (!btn) return;

    if (state.speedLimitsMode === 1) {
        btn.textContent = '🐢';
        btn.title = 'Медленный режим (нажмите для безлимита)';
        btn.classList.add('active');
    } else {
        btn.textContent = '🚀';
        btn.title = 'Безлимит (нажмите для медленного режима)';
        btn.classList.remove('active');
    }
}

async function toggleSpeedLimit(moduleElement, moduleId) {
    const state = torrentState[moduleId];
    const newSlow = state.speedLimitsMode !== 1;  // если сейчас безлимит → медленный

    try {
        const resp = await fetch(`/api/torrents/${moduleId}/speed-limits-mode?slow=${newSlow}`, {
            method: 'POST'
        });
        if (resp.ok) {
            const data = await resp.json();
            state.speedLimitsMode = data.speedLimitsMode;
            updateSpeedToggleIcon(moduleElement, moduleId);
            showToast(newSlow ? '🐢 Медленный режим' : '🚀 Безлимит');
        }
    } catch (e) {
        showToast('❌ Ошибка переключения режима');
    }
}

// ============================================================
// УТИЛИТЫ
// ============================================================
function formatSpeed(bytesPerSec) {
    if (!bytesPerSec || bytesPerSec <= 0) return '0 B/s';
    const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    let v = bytesPerSec;
    let i = 0;
    while (v >= 1024 && i < units.length - 1) {
        v /= 1024;
        i++;
    }
    return v.toFixed(v < 10 ? 1 : 0) + ' ' + units[i];
}

function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let v = bytes;
    let i = 0;
    while (v >= 1024 && i < units.length - 1) {
        v /= 1024;
        i++;
    }
    return v.toFixed(v < 10 ? 1 : 0) + ' ' + units[i];
}

function formatEta(seconds) {
    if (!seconds || seconds <= 0 || seconds >= 8640000) return '∞';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}ч ${m}м`;
    if (m > 0) return `${m}м ${s}с`;
    return `${s}с`;
}

function formatPercent(v) {
    return (v * 100).toFixed(1) + '%';
}

// ============================================================
// СПИСОК ТОРРЕНТОВ
// ============================================================
function renderTorrentList(moduleElement, moduleId) {
    const state = torrentState[moduleId];
    const el = moduleElement.querySelector(`#torrent-list-${moduleId}`);
    if (!el) return;

    if (!state.connected) {
        el.innerHTML = `<div class="torrent-error">❌ Нет подключения к qBittorrent</div>`;
        return;
    }

    if (!state.torrents || state.torrents.length === 0) {
        el.innerHTML = `<div class="torrent-empty">📭 Нет торрентов</div>`;
        return;
    }

    let html = '';
    for (const t of state.torrents) {
        html += renderTorrentRow(t, state.selectedHash === t.hash);
    }
    el.innerHTML = html;

    // Привязка событий
    el.querySelectorAll('.torrent-row').forEach(row => {
        const hash = row.dataset.hash;

        // Клик по строке — выбор торрента
        row.addEventListener('click', (e) => {
            // Игнорируем клики по кнопкам действий
            if (e.target.closest('.torrent-row-actions')) return;
            selectTorrent(moduleElement, moduleId, hash);
        });

        // Кнопки действий
        row.querySelectorAll('.torrent-row-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                await handleTorrentRowAction(moduleElement, moduleId, hash, action);
            });
        });
    });
}

function renderTorrentRow(t, isSelected) {
    const stateClass = getTorrentStateClass(t.state);
    const stateIcon = getTorrentStateIcon(t.state);
    const progress = Math.max(0, Math.min(100, t.progress * 100));
    const isPaused = isTorrentPaused(t.state);

    const classes = ['torrent-row'];
    if (isSelected) classes.push('selected');
    classes.push('state-' + stateClass);

    return `
        <div class="${classes.join(' ')}" data-hash="${t.hash}">
            <div class="torrent-row-icon">${stateIcon}</div>
            <div class="torrent-row-main">
                <div class="torrent-row-name" title="${escapeHtml(t.name)}">${escapeHtml(t.name)}</div>
                <div class="torrent-row-progress-bar">
                    <div class="torrent-row-progress-fill" style="width:${progress}%"></div>
                </div>
                <div class="torrent-row-meta">
                    <span class="torrent-row-percent">${progress.toFixed(1)}%</span>
                    <span class="torrent-row-speed">↓${formatSpeed(t.downloadSpeed)} ↑${formatSpeed(t.uploadSpeed)}</span>
                    <span class="torrent-row-eta">ETA: ${formatEta(t.eta)}</span>
                    <span class="torrent-row-size">${formatBytes(t.downloaded)} / ${formatBytes(t.size)}</span>
                </div>
            </div>
            <div class="torrent-row-actions">
                <button class="torrent-row-btn" data-action="${isPaused ? 'resume' : 'pause'}"
                        title="${isPaused ? 'Продолжить' : 'Пауза'}">${isPaused ? '▶' : '⏸'}</button>
                <button class="torrent-row-btn" data-action="files" title="Файлы">📄</button>
                <button class="torrent-row-btn danger" data-action="delete" title="Удалить">🗑️</button>
            </div>
        </div>
    `;
}

// ============================================================
// СТАТУСЫ ТОРРЕНТА
// ============================================================
function getTorrentStateClass(state) {
    if (!state) return 'unknown';
    if (state.startsWith('error') || state === 'missingFiles') return 'error';
    if (state === 'pausedDL' || state === 'pausedUP' || state === 'stoppedDL' || state === 'stoppedUP') return 'paused';
    if (state === 'uploading' || state === 'stalledUP' || state === 'forcedUP' || state === 'queuedUP') return 'seeding';
    if (state === 'downloading' || state === 'stalledDL' || state === 'metaDL'
        || state === 'forcedDL' || state === 'queuedDL' || state === 'checkingDL'
        || state === 'allocating') return 'downloading';
    if (state === 'checkingUP' || state === 'checkingResumeData') return 'checking';
    return 'unknown';
}

function getTorrentStateIcon(state) {
    const cls = getTorrentStateClass(state);
    switch (cls) {
        case 'downloading': return '⬇️';
        case 'seeding':     return '⬆️';
        case 'paused':      return '⏸';
        case 'error':       return '⚠️';
        case 'checking':    return '🔍';
        default:            return '❔';
    }
}

function isTorrentPaused(state) {
    if (!state) return false;
    return ['pausedDL', 'pausedUP', 'stoppedDL', 'stoppedUP'].includes(state);
}

// ============================================================
// ВЫБОР ТОРРЕНТА
// ============================================================
async function selectTorrent(moduleElement, moduleId, hash) {
    const state = torrentState[moduleId];
    state.selectedHash = hash;

    // Обновляем подсветку в списке
    moduleElement.querySelectorAll('.torrent-row').forEach(row => {
        row.classList.toggle('selected', row.dataset.hash === hash);
    });

    // Рендерим активную вкладку
    await renderActiveTab(moduleElement, moduleId);
}

// ============================================================
// ДЕЙСТВИЯ НА СТРОКЕ
// ============================================================
async function handleTorrentRowAction(moduleElement, moduleId, hash, action) {
    const state = torrentState[moduleId];
    const torrent = state.torrents.find(t => t.hash === hash);
    if (!torrent) return;

    switch (action) {
        case 'pause':
            await torrentPauseResume(moduleElement, moduleId, hash, true);
            break;

        case 'resume':
            await torrentPauseResume(moduleElement, moduleId, hash, false);
            break;

        case 'files':
            // Выбираем торрент и переключаем на вкладку «Файлы»
            state.selectedHash = hash;
            await switchTorrentTab(moduleElement, moduleId, 'files');
            break;

        case 'delete':
            openDeleteModal(moduleElement, moduleId, hash, torrent.name);
            break;
    }
}

async function torrentPauseResume(moduleElement, moduleId, hash, pause) {
    const endpoint = pause ? 'pause' : 'resume';
    try {
        const resp = await fetch(`/api/torrents/${moduleId}/${hash}/${endpoint}`, {
            method: 'POST'
        });
        if (resp.ok) {
            showToast(pause ? '⏸ Пауза' : '▶ Продолжено');
            await loadTorrentData(moduleElement, moduleId);
        } else {
            showToast('❌ Ошибка');
        }
    } catch (e) {
        showToast('❌ ' + e.message);
    }
}

// ============================================================
// МОДАЛКА УДАЛЕНИЯ (вариант А)
// ============================================================
function openDeleteModal(moduleElement, moduleId, hash, name) {
    // Убираем старые модалки
    document.querySelectorAll('.torrent-modal-overlay').forEach(el => el.remove());

    const overlay = document.createElement('div');
    overlay.className = 'torrent-modal-overlay';
    overlay.innerHTML = `
        <div class="torrent-modal">
            <div class="torrent-modal-header">
                <span>🗑️ Удалить торрент?</span>
                <button class="torrent-modal-close">✕</button>
            </div>
            <div class="torrent-modal-body">
                <p style="margin:0 0 12px 0;">Торрент:</p>
                <div class="torrent-modal-name">${escapeHtml(name)}</div>
                <label class="torrent-modal-check">
                    <input type="checkbox" id="torrent-delete-files-${moduleId}">
                    <span>Удалить скачанные файлы</span>
                </label>
            </div>
            <div class="torrent-modal-footer">
                <button class="torrent-modal-btn cancel">Отмена</button>
                <button class="torrent-modal-btn danger">Удалить</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    const close = () => overlay.remove();

    overlay.querySelector('.torrent-modal-close').addEventListener('click', close);
    overlay.querySelector('.torrent-modal-btn.cancel').addEventListener('click', close);
    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });

    overlay.querySelector('.torrent-modal-btn.danger').addEventListener('click', async () => {
        const deleteFiles = document.getElementById(`torrent-delete-files-${moduleId}`).checked;
        try {
            const resp = await fetch(
                `/api/torrents/${moduleId}/${hash}/delete?deleteFiles=${deleteFiles}`,
                { method: 'POST' }
            );
            if (resp.ok) {
                showToast(deleteFiles ? '🗑️ Удалено с файлами' : '🗑️ Удалено');
                close();
                if (torrentState[moduleId].selectedHash === hash) {
                    torrentState[moduleId].selectedHash = null;
                }
                await loadTorrentData(moduleElement, moduleId);
            } else {
                showToast('❌ Ошибка удаления');
            }
        } catch (e) {
            showToast('❌ ' + e.message);
        }
    });
}

// ============================================================
// РЕНДЕР АКТИВНОЙ ВКЛАДКИ
// ============================================================
async function renderActiveTab(moduleElement, moduleId) {
    const state = torrentState[moduleId];
    const el = moduleElement.querySelector(`#torrent-tab-content-${moduleId}`);
    if (!el) return;

    if (!state.selectedHash) {
        el.innerHTML = `<div class="torrent-empty-tab">Выберите торрент в списке</div>`;
        return;
    }

    const torrent = state.torrents.find(t => t.hash === state.selectedHash);
    if (!torrent) {
        el.innerHTML = `<div class="torrent-empty-tab">Торрент не найден</div>`;
        return;
    }

    switch (state.activeTab) {
        case 'main':
            renderMainTab(el, torrent);
            break;
        case 'files':
            await renderFilesTab(moduleElement, moduleId, el, torrent);
            break;
        case 'trackers':
            await renderTrackersTab(moduleElement, moduleId, el, torrent);
            break;
        case 'peers':
            await renderPeersTab(moduleElement, moduleId, el, torrent);
            break;
    }
}

// ============================================================
// ВКЛАДКА «ОСНОВНОЕ» — детали торрента
// ============================================================
function renderMainTab(el, t) {
    const stateIcon = getTorrentStateIcon(t.state);
    const stateText = getTorrentStateText(t.state);
    const progress = Math.max(0, Math.min(100, t.progress * 100));

    el.innerHTML = `
        <div class="torrent-main-tab">
            <div class="torrent-main-name" title="${escapeHtml(t.name)}">${escapeHtml(t.name)}</div>

            <div class="torrent-main-progress">
                <div class="torrent-main-progress-bar">
                    <div class="torrent-main-progress-fill" style="width:${progress}%"></div>
                </div>
                <span class="torrent-main-progress-text">${progress.toFixed(1)}%</span>
            </div>

            <div class="torrent-main-grid">
                <div class="torrent-main-item">
                    <span class="tm-key">Состояние</span>
                    <span class="tm-val">${stateIcon} ${stateText}</span>
                </div>
                <div class="torrent-main-item">
                    <span class="tm-key">Скорость</span>
                    <span class="tm-val">↓${formatSpeed(t.downloadSpeed)} ↑${formatSpeed(t.uploadSpeed)}</span>
                </div>
                <div class="torrent-main-item">
                    <span class="tm-key">ETA</span>
                    <span class="tm-val">${formatEta(t.eta)}</span>
                </div>
                <div class="torrent-main-item">
                    <span class="tm-key">Размер</span>
                    <span class="tm-val">${formatBytes(t.downloaded)} / ${formatBytes(t.size)}</span>
                </div>
                <div class="torrent-main-item">
                    <span class="tm-key">Сиды / Пиры</span>
                    <span class="tm-val">${t.numSeeds} / ${t.numLeechs}</span>
                </div>
                <div class="torrent-main-item">
                    <span class="tm-key">Отдано</span>
                    <span class="tm-val">${formatBytes(t.uploaded)}</span>
                </div>
                <div class="torrent-main-item">
                    <span class="tm-key">Добавлен</span>
                    <span class="tm-val">${formatTorrentDate(t.addedOn)}</span>
                </div>
                <div class="torrent-main-item">
                    <span class="tm-key">Завершён</span>
                    <span class="tm-val">${t.completionOn > 0 ? formatTorrentDate(t.completionOn) : '—'}</span>
                </div>
                <div class="torrent-main-item tm-full">
                    <span class="tm-key">Путь</span>
                    <span class="tm-val tm-path" title="${escapeHtml(t.savePath || '')}">${escapeHtml(t.savePath || '—')}</span>
                </div>
                <div class="torrent-main-item tm-full">
                    <span class="tm-key">Хэш</span>
                    <span class="tm-val tm-hash">${escapeHtml(t.hash)}</span>
                </div>
            </div>

            <div class="torrent-main-toggles">
                <label class="torrent-toggle" title="Последовательная закачка (для стриминга)">
                    <input type="checkbox" ${t.sequentialDownload ? 'checked' : ''}
                           onchange="torrentToggleSequential(${t.hash ? `'${t.hash}'` : 'null'}, this.checked)">
                    <span>📶 Последовательная закачка</span>
                </label>
                <label class="torrent-toggle" title="Скачивать крайние части файла (для быстрого старта видео)">
                    <input type="checkbox" ${t.firstLastPiecePrio ? 'checked' : ''}
                           onchange="torrentToggleFirstLast('${t.hash}', this.checked)">
                    <span>🎬 Крайние части</span>
                </label>
            </div>
        </div>
    `;
}

function getTorrentStateText(state) {
    if (!state) return '—';
    const map = {
        'error': 'Ошибка',
        'missingFiles': 'Файлы отсутствуют',
        'uploading': 'Раздаётся',
        'pausedUP': 'Пауза (раздача)',
        'pausedDL': 'Пауза',
        'stoppedUP': 'Остановлен (раздача)',
        'stoppedDL': 'Остановлен',
        'queuedUP': 'В очереди (раздача)',
        'queuedDL': 'В очереди',
        'stalledUP': 'Раздача (нет пиров)',
        'stalledDL': 'Загрузка (нет пиров)',
        'checkingUP': 'Проверка (раздача)',
        'checkingDL': 'Проверка',
        'checkingResumeData': 'Проверка данных',
        'metaDL': 'Получение метаданных',
        'forcedUP': 'Принудительная раздача',
        'forcedDL': 'Принудительная загрузка',
        'allocating': 'Выделение места',
        'downloading': 'Загрузка'
    };
    return map[state] || state;
}

function formatTorrentDate(epochSeconds) {
    if (!epochSeconds || epochSeconds <= 0) return '—';
    const d = new Date(epochSeconds * 1000);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${dd}.${mm}.${yy} ${hh}:${mi}`;
}

// Глобальные функции для inline-обработчиков
window.torrentToggleSequential = async function(hash, checked) {
    // Найдём moduleId по data-torrent-id
    const root = document.querySelector('.torrent-root[data-torrent-id]');
    if (!root) return;
    const moduleId = root.dataset.torrentId;
    try {
        const resp = await fetch(`/api/torrents/${moduleId}/${hash}/toggle-sequential`, { method: 'POST' });
        if (resp.ok) {
            showToast(checked ? '📶 Последовательная закачка вкл.' : '📶 Последовательная закачка выкл.');
            await loadTorrentData(root.closest('.widget'), parseInt(moduleId));
        }
    } catch (e) { showToast('❌ ' + e.message); }
};

window.torrentToggleFirstLast = async function(hash, checked) {
    const root = document.querySelector('.torrent-root[data-torrent-id]');
    if (!root) return;
    const moduleId = root.dataset.torrentId;
    try {
        const resp = await fetch(`/api/torrents/${moduleId}/${hash}/toggle-first-last`, { method: 'POST' });
        if (resp.ok) {
            showToast(checked ? '🎬 Крайние части вкл.' : '🎬 Крайние части выкл.');
            await loadTorrentData(root.closest('.widget'), parseInt(moduleId));
        }
    } catch (e) { showToast('❌ ' + e.message); }
};

// ============================================================
// ВКЛАДКА «ФАЙЛЫ»
// ============================================================
async function renderFilesTab(moduleElement, moduleId, el, torrent) {
    const state = torrentState[moduleId];
    const hash = torrent.hash;

    // Кэш
    if (!state.filesCache[hash]) {
        el.innerHTML = `<div class="torrent-tab-loading">⏳ Загрузка файлов...</div>`;
        try {
            const resp = await fetch(`/api/torrents/${moduleId}/${hash}/files`);
            if (!resp.ok) throw new Error('Load failed');
            state.filesCache[hash] = await resp.json();
        } catch (e) {
            el.innerHTML = `<div class="torrent-error">❌ Не удалось загрузить файлы</div>`;
            return;
        }
    }

    const files = state.filesCache[hash] || [];
    if (files.length === 0) {
        el.innerHTML = `<div class="torrent-empty-tab">📭 Файлов нет</div>`;
        return;
    }

    let html = `<div class="torrent-files">`;

    // Заголовок
    html += `
        <div class="torrent-files-header">
            <div class="tf-col-name">Имя</div>
            <div class="tf-col-size">Размер</div>
            <div class="tf-col-progress">Прогресс</div>
            <div class="tf-col-prio">Приоритет</div>
            <div class="tf-col-actions">Действия</div>
        </div>
    `;

    // Строки
    for (const f of files) {
        html += renderFileRow(f, hash, moduleId);
    }

    html += `</div>`;
    el.innerHTML = html;

    // Привязка событий
    el.querySelectorAll('.tf-row').forEach(row => {
        const fileIndex = parseInt(row.dataset.index);

        // Dropdown приоритета
        const select = row.querySelector('.tf-prio-select');
        if (select) {
            select.addEventListener('change', async (e) => {
                e.stopPropagation();
                await setFilePriority(moduleElement, moduleId, hash, fileIndex, parseInt(select.value));
            });
        }

        // Кнопка стриминга
        const streamBtn = row.querySelector('.tf-btn-stream');
        if (streamBtn) {
            streamBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openStreamModal(moduleId, hash, fileIndex, row.dataset.name);
            });
        }

        // Кнопка удалить файл + приоритет 0
        const delBtn = row.querySelector('.tf-btn-del');
        if (delBtn) {
            delBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                await deleteFileAndSetZero(moduleElement, moduleId, hash, fileIndex, row.dataset.name);
            });
        }
    });
}

function renderFileRow(f, hash, moduleId) {
    const progress = Math.max(0, Math.min(100, f.progress * 100));
    const isStreamable = isVideoFile(f.name);
    const isZeroPrio = f.priority === 0;

    const classes = ['tf-row'];
    if (isZeroPrio) classes.push('tf-zero-prio');

    // Опции приоритета
    const prioOptions = [
        { v: 0, t: 'Не загружать' },
        { v: 1, t: 'Низкий' },
        { v: 6, t: 'Нормальный' },
        { v: 7, t: 'Высокий' }
    ];

    let prioHtml = `<select class="tf-prio-select">`;
    for (const o of prioOptions) {
        prioHtml += `<option value="${o.v}" ${f.priority === o.v ? 'selected' : ''}>${o.t}</option>`;
    }
    prioHtml += `</select>`;

    return `
        <div class="${classes.join(' ')}" data-index="${f.index}" data-name="${escapeHtml(f.name)}">
            <div class="tf-col-name" title="${escapeHtml(f.name)}">
                <span class="tf-file-icon">${getFileIcon(f.name)}</span>
                <span class="tf-file-name">${escapeHtml(f.name)}</span>
            </div>
            <div class="tf-col-size">${formatBytes(f.size)}</div>
            <div class="tf-col-progress">
                <div class="tf-progress-bar">
                    <div class="tf-progress-fill" style="width:${progress}%"></div>
                </div>
                <span class="tf-progress-text">${progress.toFixed(0)}%</span>
            </div>
            <div class="tf-col-prio">${prioHtml}</div>
            <div class="tf-col-actions">
                ${isStreamable ? `<button class="tf-btn tf-btn-stream" title="Воспроизвести">▶️</button>` : ''}
                <button class="tf-btn tf-btn-del" title="Удалить файл и не загружать">🗑️</button>
            </div>
        </div>
    `;
}

async function setFilePriority(moduleElement, moduleId, hash, fileIndex, priority) {
    try {
        const resp = await fetch(`/api/torrents/${moduleId}/file-priority`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                hash: hash,
                fileIds: [fileIndex],
                priority: priority
            })
        });
        if (resp.ok) {
            showToast('✅ Приоритет изменён');
            // Инвалидируем кэш файлов
            delete torrentState[moduleId].filesCache[hash];
            await renderActiveTab(moduleElement, moduleId);
        } else {
            showToast('❌ Ошибка');
        }
    } catch (e) {
        showToast('❌ ' + e.message);
    }
}

async function deleteFileAndSetZero(moduleElement, moduleId, hash, fileIndex, fileName) {
    const state = torrentState[moduleId];
    const torrent = state.torrents.find(t => t.hash === hash);
    if (!torrent) return;

    // Полный путь в контейнере
    const savePath = torrent.savePath || '';
    const containerPath = savePath.endsWith('/')
        ? savePath + fileName
        : savePath + '/' + fileName;

    // Преобразуем в путь хоста
    const hostPath = torrentMapToHostPath(containerPath);

    document.querySelectorAll('.torrent-modal-overlay').forEach(el => el.remove());

    const overlay = document.createElement('div');
    overlay.className = 'torrent-modal-overlay';
    overlay.innerHTML = `
        <div class="torrent-modal">
            <div class="torrent-modal-header">
                <span>🗑️ Удалить файл?</span>
                <button class="torrent-modal-close">✕</button>
            </div>
            <div class="torrent-modal-body">
                <p style="margin:0 0 10px 0;">Файл:</p>
                <div class="torrent-modal-name">${escapeHtml(fileName)}</div>
                <p style="margin:12px 0 0 0; font-size:12px; opacity:0.7;">
                    Файл будет удалён с диска и помечен как «не загружать».
                </p>
                <label class="torrent-modal-check" style="margin-top:12px;">
                    <input type="checkbox" id="torrent-del-prio-${moduleId}" checked>
                    <span>Также выставить приоритет «Не загружать»</span>
                </label>
            </div>
            <div class="torrent-modal-footer">
                <button class="torrent-modal-btn cancel">Отмена</button>
                <button class="torrent-modal-btn danger">Удалить</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.querySelector('.torrent-modal-close').addEventListener('click', close);
    overlay.querySelector('.torrent-modal-btn.cancel').addEventListener('click', close);
    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });

    overlay.querySelector('.torrent-modal-btn.danger').addEventListener('click', async () => {
        const alsoSetZero = document.getElementById(`torrent-del-prio-${moduleId}`).checked;
        close();

        if (alsoSetZero) {
            try {
                await fetch(`/api/torrents/${moduleId}/file-priority`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ hash, fileIds: [fileIndex], priority: 0 })
                });
            } catch (e) { /* ignore */ }
        }

        try {
            const resp = await fetch('/api/files/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paths: [hostPath] })
            });
            if (resp.ok) {
                showToast('🗑️ Файл удалён' + (alsoSetZero ? ' + приоритет 0' : ''));
            } else {
                const err = await resp.json().catch(() => ({}));
                showToast('⚠️ Приоритет 0 выставлен, но файл не удалён: ' + (err.error || 'ошибка'));
            }
        } catch (e) {
            showToast('⚠️ ' + e.message);
        }

        delete state.filesCache[hash];
        await loadTorrentData(moduleElement, moduleId);
    });
}

// ============================================================
// ВКЛАДКА «ТРЕКЕРЫ»
// ============================================================
async function renderTrackersTab(moduleElement, moduleId, el, torrent) {
    const state = torrentState[moduleId];
    const hash = torrent.hash;

    if (!state.trackersCache[hash]) {
        el.innerHTML = `<div class="torrent-tab-loading">⏳ Загрузка трекеров...</div>`;
        try {
            const resp = await fetch(`/api/torrents/${moduleId}/${hash}/trackers`);
            if (!resp.ok) throw new Error('Load failed');
            state.trackersCache[hash] = await resp.json();
        } catch (e) {
            el.innerHTML = `<div class="torrent-error">❌ Не удалось загрузить трекеры</div>`;
            return;
        }
    }

    const trackers = state.trackersCache[hash] || [];
    if (trackers.length === 0) {
        el.innerHTML = `<div class="torrent-empty-tab">📭 Трекеров нет</div>`;
        return;
    }

    let html = `
        <div class="torrent-trackers">
            <div class="torrent-trackers-toolbar">
                <button class="torrent-tracker-reannounce" id="torrent-reannounce-${moduleId}">
                    📢 Оповестить трекеры
                </button>
            </div>
            <div class="torrent-trackers-list">
                <div class="tt-header">
                    <div class="tt-col-status"></div>
                    <div class="tt-col-url">URL</div>
                    <div class="tt-col-tier">Tier</div>
                    <div class="tt-col-peers">S/L/P</div>
                    <div class="tt-col-msg">Сообщение</div>
                </div>
    `;

    for (const t of trackers) {
        html += renderTrackerRow(t);
    }

    html += `</div></div>`;
    el.innerHTML = html;

    // Кнопка «Оповестить»
    const reBtn = el.querySelector(`#torrent-reannounce-${moduleId}`);
    if (reBtn) {
        reBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await reannounceTrackers(moduleElement, moduleId, hash);
        });
    }
}

function renderTrackerRow(t) {
    const statusIcon = getTrackerStatusIcon(t.status);
    const statusText = getTrackerStatusText(t.status);
    const isPseudo = t.pseudo || (t.url && t.url.startsWith('**'));

    const classes = ['tt-row'];
    if (isPseudo) classes.push('tt-pseudo');
    if (t.status === 4) classes.push('tt-error');

    const peers = isPseudo ? '—' : `${t.numSeeds}/${t.numLeechs}/${t.numPeers}`;
    const tierText = isPseudo ? '—' : (t.tier >= 0 ? t.tier : '—');

    return `
        <div class="${classes.join(' ')}" title="${escapeHtml(statusText)}">
            <div class="tt-col-status">${statusIcon}</div>
            <div class="tt-col-url" title="${escapeHtml(t.url)}">${escapeHtml(t.url)}</div>
            <div class="tt-col-tier">${tierText}</div>
            <div class="tt-col-peers">${peers}</div>
            <div class="tt-col-msg" title="${escapeHtml(t.msg || '')}">${escapeHtml(t.msg || '')}</div>
        </div>
    `;
}

function getTrackerStatusIcon(status) {
    switch (status) {
        case 0: return '⏸';   // disabled
        case 1: return '⏳';   // not contacted
        case 2: return '✅';   // working
        case 3: return '🔄';   // updating
        case 4: return '❌';   // not working
        default: return '❔';
    }
}

function getTrackerStatusText(status) {
    switch (status) {
        case 0: return 'Отключён';
        case 1: return 'Не контактировал';
        case 2: return 'Работает';
        case 3: return 'Обновляется';
        case 4: return 'Не работает';
        default: return 'Неизвестно';
    }
}

async function reannounceTrackers(moduleElement, moduleId, hash) {
    try {
        const resp = await fetch(`/api/torrents/${moduleId}/${hash}/reannounce`, { method: 'POST' });
        if (resp.ok) {
            showToast('📢 Трекеры оповещены');
            // Сброс кэша трекеров
            delete torrentState[moduleId].trackersCache[hash];
            setTimeout(async () => {
                await renderActiveTab(moduleElement, moduleId);
            }, 1000);
        } else {
            showToast('❌ Ошибка оповещения');
        }
    } catch (e) {
        showToast('❌ ' + e.message);
    }
}

// ============================================================
// ВКЛАДКА «ПИРЫ»
// ============================================================
async function renderPeersTab(moduleElement, moduleId, el, torrent) {
    const state = torrentState[moduleId];
    const hash = torrent.hash;

    el.innerHTML = `<div class="torrent-tab-loading">⏳ Загрузка пиров...</div>`;

    try {
        const resp = await fetch(`/api/torrents/${moduleId}/${hash}/peers`);
        if (!resp.ok) throw new Error('Load failed');
        const data = await resp.json();
        const peers = data.peers || [];

        if (peers.length === 0) {
            el.innerHTML = `<div class="torrent-empty-tab">👥 Пиров нет</div>`;
            return;
        }

        let html = `
            <div class="torrent-peers">
                <div class="tp-header">
                    <div class="tp-col-ip">IP : порт</div>
                    <div class="tp-col-client">Клиент</div>
                    <div class="tp-col-progress">Прогресс</div>
                    <div class="tp-col-speed">↓ / ↑</div>
                    <div class="tp-col-flags">Флаги</div>
                    <div class="tp-col-country">Страна</div>
                </div>
        `;

        for (const p of peers) {
            html += renderPeerRow(p);
        }

        html += `</div>`;
        el.innerHTML = html;

    } catch (e) {
        el.innerHTML = `<div class="torrent-error">❌ Не удалось загрузить пиров</div>`;
    }
}

function renderPeerRow(p) {
    const progress = Math.max(0, Math.min(100, p.progress * 100));
    const flagsDesc = (p.flagsDesc || '').replace(/"/g, '&quot;').replace(/\n/g, '&#10;');
    const country = p.countryCode
        ? `<span class="tp-country-flag">${getCountryFlag(p.countryCode)}</span> ${escapeHtml(p.country || p.countryCode)}`
        : (p.country ? escapeHtml(p.country) : '—');

    return `
        <div class="tp-row">
            <div class="tp-col-ip" title="${escapeHtml(p.ip + ':' + p.port)}">
                ${escapeHtml(p.ip)}:${p.port}
            </div>
            <div class="tp-col-client" title="${escapeHtml(p.client || '')}">
                ${escapeHtml(p.client || '—')}
            </div>
            <div class="tp-col-progress">
                <div class="tp-progress-bar">
                    <div class="tp-progress-fill" style="width:${progress}%"></div>
                </div>
                <span class="tp-progress-text">${progress.toFixed(0)}%</span>
            </div>
            <div class="tp-col-speed">
                <span class="tp-dl">↓${formatSpeed(p.dlSpeed)}</span>
                <span class="tp-up">↑${formatSpeed(p.upSpeed)}</span>
            </div>
            <div class="tp-col-flags" title="${escapeHtml(flagsDesc || p.flags || '')}">
                ${escapeHtml(p.flags || '—')}
            </div>
            <div class="tp-col-country">${country}</div>
        </div>
    `;
}

function getCountryFlag(code) {
    if (!code || code.length !== 2) return '🏴';
    const codePoints = code.toUpperCase().split('').map(c => 127397 + c.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
}

// ============================================================
// ВСПОМОГАТЕЛЬНЫЕ
// ============================================================
function isVideoFile(name) {
    if (!name) return false;
    const lower = name.toLowerCase();
    return /\.(mp4|m4v|mkv|webm|avi|mov|flv|wmv|mpg|mpeg|ts|m2ts)$/.test(lower);
}

function getFileIcon(name) {
    if (!name) return '📄';
    const lower = name.toLowerCase();
    if (/\.(mp4|m4v|mkv|webm|avi|mov|flv|wmv|mpg|mpeg|ts|m2ts)$/.test(lower)) return '🎬';
    if (/\.(mp3|flac|wav|ogg|m4a|aac|wma|opus)$/.test(lower)) return '🎵';
    if (/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/.test(lower)) return '🖼️';
    if (/\.(zip|rar|7z|tar|gz|bz2|xz)$/.test(lower)) return '📦';
    if (/\.(pdf)$/.test(lower)) return '📄';
    if (/\.(doc|docx|odt|rtf)$/.test(lower)) return '📝';
    if (/\.(xls|xlsx|ods|csv)$/.test(lower)) return '📊';
    if (/\.(ppt|pptx|odp)$/.test(lower)) return '📽️';
    if (/\.(txt|md|log|nfo)$/.test(lower)) return '📃';
    if (/\.(iso|img|dmg)$/.test(lower)) return '💿';
    if (/\.(exe|msi|deb|rpm|apk)$/.test(lower)) return '⚙️';
    if (/\.(srt|sub|ass|vtt)$/.test(lower)) return '💬';
    return '📄';
}

// ============================================================
// МОДАЛКА СТРИМИНГА
// ============================================================
function openStreamModal(moduleId, hash, fileIndex, fileName) {
    document.querySelectorAll('.torrent-modal-overlay').forEach(el => el.remove());

    const streamUrl = `/api/torrents/${moduleId}/${hash}/stream?fileIndex=${fileIndex}`;
    const playable = isBrowserPlayable(fileName);

    const overlay = document.createElement('div');
    overlay.className = 'torrent-modal-overlay';

    const playerHtml = playable
        ? `<video id="ts-video-${moduleId}" controls autoplay class="torrent-stream-video" src="${streamUrl}"></video>`
        : `<avbridge-video id="ts-video-${moduleId}" src="${streamUrl}" autoplay class="torrent-stream-video"></avbridge-video>
           <div class="torrent-stream-controls">
               <button data-act="play-pause">⏸</button>
               <input type="range" data-act="seek" min="0" max="100" value="0" step="0.1">
               <span class="ts-time">00:00 / 00:00</span>
               <input type="range" data-act="volume" min="0" max="1" value="1" step="0.01" style="width:80px;">
               <button data-act="fullscreen">⛶</button>
           </div>`;

    overlay.innerHTML = `
        <div class="torrent-modal torrent-modal-wide">
            <div class="torrent-modal-header">
                <span>🎬 ${escapeHtml(fileName)}</span>
                <button class="torrent-modal-close">✕</button>
            </div>
            <div class="torrent-modal-body torrent-stream-body">
                ${playerHtml}
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    // === Controls ===
    const v = overlay.querySelector(`#ts-video-${moduleId}`);
    const controls = overlay.querySelector('.torrent-stream-controls');

    if (v && controls) {
        const playBtn = controls.querySelector('[data-act="play-pause"]');
        const seekEl = controls.querySelector('[data-act="seek"]');
        const volEl = controls.querySelector('[data-act="volume"]');
        const timeEl = controls.querySelector('.ts-time');
        const fsBtn = controls.querySelector('[data-act="fullscreen"]');

        playBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (v.paused) v.play();
            else v.pause();
        });

        seekEl.addEventListener('input', () => {
            if (v.duration) v.currentTime = (v.duration * parseFloat(seekEl.value)) / 100;
        });

        volEl.addEventListener('input', () => {
            v.volume = parseFloat(volEl.value);
        });

        fsBtn.addEventListener('click', () => {
            if (v.requestFullscreen) v.requestFullscreen();
            else if (v.webkitRequestFullscreen) v.webkitRequestFullscreen();
        });

        const interval = setInterval(() => {
            if (!document.body.contains(overlay)) {
                clearInterval(interval);
                return;
            }
            if (v.duration && !isNaN(v.duration)) {
                seekEl.value = (v.currentTime / v.duration) * 100;
                if (timeEl) timeEl.textContent = fmtTime(v.currentTime) + ' / ' + fmtTime(v.duration);
            }
            playBtn.textContent = v.paused ? '▶' : '⏸';
        }, 500);
    }

    // === Close ===
    const close = () => {
        const vid = overlay.querySelector('video, avbridge-video');
        if (vid && vid.pause) vid.pause();
        overlay.remove();
    };

    overlay.querySelector('.torrent-modal-close').addEventListener('click', close);
    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });
}

function fmtTime(s) {
    if (!s || isNaN(s)) return '00:00';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

// ============================================================
// МАППИНГ ПУТЕЙ (контейнер → хост)
// ============================================================
const TORRENT_PATH_MAP = {
    '/downloads': '/home/alsa/torrent'
};

/**
 * Преобразовать путь из контейнера в путь на хосте.
 * Пример: /downloads/Киберсталкер/01.m4v → /home/alsa/torrent/Киберсталкер/01.m4v
 */
function torrentMapToHostPath(containerPath) {
    if (!containerPath) return containerPath;
    for (const [containerRoot, hostRoot] of Object.entries(TORRENT_PATH_MAP)) {
        if (containerPath === containerRoot) return hostRoot;
        if (containerPath.startsWith(containerRoot + '/')) {
            return hostRoot + containerPath.substring(containerRoot.length);
        }
    }
    return containerPath;
}

// ============================================================
// МОДАЛКА — ДОБАВЛЕНИЕ MAGNET
// ============================================================
function openAddMagnetModal(moduleElement, moduleId) {
    document.querySelectorAll('.torrent-modal-overlay').forEach(el => el.remove());

    const overlay = document.createElement('div');
    overlay.className = 'torrent-modal-overlay';
    overlay.innerHTML = `
        <div class="torrent-modal">
            <div class="torrent-modal-header">
                <span>🧲 Добавить magnet-ссылку</span>
                <button class="torrent-modal-close">✕</button>
            </div>
            <div class="torrent-modal-body">
                <label class="torrent-modal-label">Magnet-ссылка</label>
                <textarea class="torrent-modal-input torrent-magnet-input"
                          id="torrent-magnet-${moduleId}"
                          placeholder="magnet:?xt=urn:btih:..."
                          rows="4"></textarea>

                <label class="torrent-modal-label" style="margin-top:12px;">Папка (опционально)</label>
                <input type="text" class="torrent-modal-input"
                       id="torrent-savepath-${moduleId}"
                       placeholder="/downloads (по умолчанию)"
                       value="">

                <div class="torrent-modal-toggles">
                    <label class="torrent-modal-check">
                        <input type="checkbox" id="torrent-seq-${moduleId}">
                        <span>📶 Последовательная закачка</span>
                    </label>
                    <label class="torrent-modal-check">
                        <input type="checkbox" id="torrent-firstlast-${moduleId}">
                        <span>🎬 Крайние части</span>
                    </label>
                </div>
            </div>
            <div class="torrent-modal-footer">
                <button class="torrent-modal-btn cancel">Отмена</button>
                <button class="torrent-modal-btn primary">Добавить</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    const v = overlay.querySelector('#ts-video-' + moduleId);
    const controls = overlay.querySelector('.torrent-stream-controls');
    if (v && controls) {
        const playBtn = controls.querySelector('[data-act="play-pause"]');
        playBtn.addEventListener('click', () => {
            if (v.paused) { v.play(); playBtn.textContent = '⏸'; }
            else { v.pause(); playBtn.textContent = '▶'; }
        });

        const seekEl = controls.querySelector('[data-act="seek"]');
        seekEl.addEventListener('input', () => {
            if (v.duration) v.currentTime = (v.duration * seekEl.value) / 100;
        });

        const volEl = controls.querySelector('[data-act="volume"]');
        volEl.addEventListener('input', () => { v.volume = parseFloat(volEl.value); });

        controls.querySelector('[data-act="fullscreen"]').addEventListener('click', () => {
            if (v.requestFullscreen) v.requestFullscreen();
            else if (v.webkitRequestFullscreen) v.webkitRequestFullscreen();
        });

        // Обновление времени
        setInterval(() => {
            if (v.duration && !isNaN(v.duration)) {
                seekEl.value = (v.currentTime / v.duration) * 100;
                const timeEl = controls.querySelector('.ts-time');
                if (timeEl) timeEl.textContent = fmtTime(v.currentTime) + ' / ' + fmtTime(v.duration);
            }
        }, 500);
    }

    function fmtTime(s) {
        if (!s || isNaN(s)) return '00:00';
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
    }

    const close = () => overlay.remove();
    overlay.querySelector('.torrent-modal-close').addEventListener('click', close);
    overlay.querySelector('.torrent-modal-btn.cancel').addEventListener('click', close);
    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });

    setTimeout(() => {
        const ta = document.getElementById(`torrent-magnet-${moduleId}`);
        if (ta) ta.focus();
    }, 50);

    overlay.querySelector('.torrent-modal-btn.primary').addEventListener('click', async () => {
        const url = document.getElementById(`torrent-magnet-${moduleId}`).value.trim();
        const savePath = document.getElementById(`torrent-savepath-${moduleId}`).value.trim();
        const sequential = document.getElementById(`torrent-seq-${moduleId}`).checked;
        const firstLast = document.getElementById(`torrent-firstlast-${moduleId}`).checked;

        if (!url) {
            showToast('❌ Введите magnet-ссылку');
            return;
        }
        if (!url.startsWith('magnet:')) {
            showToast('❌ Ссылка должна начинаться с magnet:');
            return;
        }

        await addTorrent(moduleElement, moduleId, {
            url: url,
            savePath: savePath || null,
            sequentialDownload: sequential,
            firstLastPiecePrio: firstLast
        }, close);
    });
}

// ============================================================
// МОДАЛКА — ЗАГРУЗКА .TORRENT ФАЙЛА
// ============================================================
function openAddFileModal(moduleElement, moduleId) {
    document.querySelectorAll('.torrent-modal-overlay').forEach(el => el.remove());

    const overlay = document.createElement('div');
    overlay.className = 'torrent-modal-overlay';
    overlay.innerHTML = `
        <div class="torrent-modal">
            <div class="torrent-modal-header">
                <span>📁 Загрузить .torrent файл</span>
                <button class="torrent-modal-close">✕</button>
            </div>
            <div class="torrent-modal-body">
                <input type="file" id="torrent-file-${moduleId}"
                       accept=".torrent" class="torrent-modal-file">

                <label class="torrent-modal-label" style="margin-top:12px;">Папка (опционально)</label>
                <input type="text" class="torrent-modal-input"
                       id="torrent-file-savepath-${moduleId}"
                       placeholder="/downloads (по умолчанию)">

                <div class="torrent-modal-toggles">
                    <label class="torrent-modal-check">
                        <input type="checkbox" id="torrent-file-seq-${moduleId}">
                        <span>📶 Последовательная закачка</span>
                    </label>
                    <label class="torrent-modal-check">
                        <input type="checkbox" id="torrent-file-firstlast-${moduleId}">
                        <span>🎬 Крайние части</span>
                    </label>
                </div>
            </div>
            <div class="torrent-modal-footer">
                <button class="torrent-modal-btn cancel">Отмена</button>
                <button class="torrent-modal-btn primary">Загрузить</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.querySelector('.torrent-modal-close').addEventListener('click', close);
    overlay.querySelector('.torrent-modal-btn.cancel').addEventListener('click', close);
    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });

    overlay.querySelector('.torrent-modal-btn.primary').addEventListener('click', async () => {
        const input = document.getElementById(`torrent-file-${moduleId}`);
        if (!input.files || input.files.length === 0) {
            showToast('❌ Выберите .torrent файл');
            return;
        }

        const savePath = document.getElementById(`torrent-file-savepath-${moduleId}`).value.trim();
        const sequential = document.getElementById(`torrent-file-seq-${moduleId}`).checked;
        const firstLast = document.getElementById(`torrent-file-firstlast-${moduleId}`).checked;

        const formData = new FormData();
        formData.append('file', input.files[0]);
        if (savePath) formData.append('savePath', savePath);
        if (sequential) formData.append('sequentialDownload', 'true');
        if (firstLast) formData.append('firstLastPiecePrio', 'true');

        try {
            const resp = await fetch(`/api/torrents/${moduleId}/add-file`, {
                method: 'POST',
                body: formData
            });
            if (resp.ok) {
                showToast('✅ Торрент добавлен');
                close();
                await loadTorrentData(moduleElement, moduleId);
            } else {
                const err = await resp.json().catch(() => ({}));
                showToast('❌ ' + (err.error || 'Ошибка'));
            }
        } catch (e) {
            showToast('❌ ' + e.message);
        }
    });
}

// ============================================================
// ОБЩАЯ ФУНКЦИЯ ДОБАВЛЕНИЯ (magnet)
// ============================================================
async function addTorrent(moduleElement, moduleId, payload, closeFn) {
    try {
        const resp = await fetch(`/api/torrents/${moduleId}/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (resp.ok) {
            const data = await resp.json();
            showToast(data.message || '✅ Торрент добавлен');
            if (closeFn) closeFn();
            // Небольшая задержка — qBittorrent не сразу отдаёт новый торрент
            setTimeout(async () => {
                await loadTorrentData(moduleElement, moduleId);
            }, 800);
        } else {
            const err = await resp.json().catch(() => ({}));
            showToast('❌ ' + (err.error || 'Ошибка добавления'));
        }
    } catch (e) {
        showToast('❌ ' + e.message);
    }
}

// ============================================================
// МОДАЛКА — НАСТРОЙКИ ВИДЖЕТА
// ============================================================
function renderTorrentSettings(data) {
    const s = data.torrentData || {};
    return `
        <div class="torrent-settings">
            <label class="ts-label">URL qBittorrent</label>
            <input type="text" class="ts-input" id="ts-baseUrl"
                   value="${escapeHtml(s.baseUrl || 'http://127.0.0.1:8050')}"
                   placeholder="http://127.0.0.1:8050">

            <label class="ts-label">Логин</label>
            <input type="text" class="ts-input" id="ts-username"
                   value="${escapeHtml(s.username || 'admin')}">

            <label class="ts-label">Пароль</label>
            <input type="password" class="ts-input" id="ts-password"
                placeholder="${s.password ? '•••••••• (не менять)' : 'Введите пароль'}"
                value="">

            <label class="ts-label">Папка загрузок (в контейнере)</label>
            <input type="text" class="ts-input" id="ts-downloadPath"
                   value="${escapeHtml(s.downloadPath || '/downloads')}"
                   placeholder="/downloads">

            <label class="ts-label">Интервал обновления (мс)</label>
            <input type="number" class="ts-input" id="ts-pollInterval"
                   value="${s.pollInterval || 3000}" min="1000" step="500">

            <div class="ts-test-row">
                <button type="button" class="ts-test-btn" onclick="torrentTestConnection()">
                    🔌 Проверить подключение
                </button>
                <span class="ts-test-result" id="ts-test-result"></span>
            </div>
        </div>
    `;
}

function initTorrentSettingsEvents(moduleId, container) {
    const fields = ['ts-baseUrl', 'ts-username', 'ts-password', 'ts-downloadPath', 'ts-pollInterval'];
    let saveTimer = null;

    const collectAndSave = async () => {
        const baseUrl = document.getElementById('ts-baseUrl')?.value.trim() || '';
        const username = document.getElementById('ts-username')?.value.trim() || '';
        const passwordInput = document.getElementById('ts-password')?.value || '';
        const downloadPath = document.getElementById('ts-downloadPath')?.value.trim() || '';
        const pollInterval = parseInt(document.getElementById('ts-pollInterval')?.value || '3000');

        if (!baseUrl) {
            showToast('❌ URL qBittorrent не может быть пустым');
            return;
        }

        const params = {
            baseUrl: baseUrl,
            username: username,
            downloadPath: downloadPath,
            pollInterval: pollInterval
        };

        // Пароль отправляем только если пользователь что-то ввёл
        if (passwordInput.trim() !== '') {
            params.password = passwordInput;
        }

        try {
            const resp = await fetch(`/api/modules/${moduleId}/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'updateSettings',
                    params: params
                })
            });
            if (resp.ok) {
                showToast('✅ Настройки сохранены');
                const widget = document.querySelector(`.widget[data-widget-id="${moduleId}"]`);
                if (widget && typeof loadTorrentData === 'function') {
                    await loadTorrentData(widget, moduleId);
                }
            } else {
                showToast('❌ Ошибка сохранения');
            }
        } catch (e) {
            showToast('❌ ' + e.message);
        }
    };

    fields.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('change', () => {
            if (saveTimer) clearTimeout(saveTimer);
            saveTimer = setTimeout(collectAndSave, 500);
        });
    });
}

function isBrowserPlayable(name) {
    if (!name) return false;
    const lower = name.toLowerCase();
    return /\.(mp4|m4v|webm|ogv)$/.test(lower);
}

/**
 * Тест подключения (кнопка в настройках).
 */
window.torrentTestConnection = async function() {
    const baseUrl = document.getElementById('ts-baseUrl')?.value.trim();
    const username = document.getElementById('ts-username')?.value.trim();
    const password = document.getElementById('ts-password')?.value;
    const resultEl = document.getElementById('ts-test-result');
    if (!resultEl) return;

    resultEl.textContent = '⏳ Проверка...';
    resultEl.className = 'ts-test-result';

    // Находим moduleId
    const root = document.querySelector('.torrent-root[data-torrent-id]');
    if (!root) {
        resultEl.textContent = '❌ Виджет не найден';
        return;
    }
    const moduleId = root.dataset.torrentId;

    try {
        const resp = await fetch(`/api/modules/${moduleId}/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'testConnection',
                params: { baseUrl, username, password }
            })
        });
        if (resp.ok) {
            const data = await resp.json();
            const content = data.content || {};
            if (content.connected) {
                resultEl.textContent = content.message || '✅ Подключено';
                resultEl.classList.add('success');
            } else {
                resultEl.textContent = content.message || '❌ Не удалось';
                resultEl.classList.add('error');
            }
        } else {
            resultEl.textContent = '❌ Ошибка запроса';
            resultEl.classList.add('error');
        }
    } catch (e) {
        resultEl.textContent = '❌ ' + e.message;
        resultEl.classList.add('error');
    }
};

window.renderTorrentSettings = renderTorrentSettings;
window.initTorrentSettingsEvents = initTorrentSettingsEvents;

// Глобальная привязка
window.initTorrentModule = initTorrentModule;