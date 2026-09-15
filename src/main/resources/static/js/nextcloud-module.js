/**
 * NEXTCLOUD-MODULE.JS - Логика модуля Nextcloud
 */

const NEXTCLOUD_CACHE_TTL_MS = 5 * 60 * 1000;
const nextcloudCache = {};        // moduleId -> { data, timestamp }
const nextcloudPath = {};         // moduleId -> текущий открытый путь

function initNextcloudModule(moduleElement, moduleId) {
    loadNextcloudData(moduleElement, moduleId);
}

async function loadNextcloudData(moduleElement, moduleId, forceReload = false) {
    try {
        const numericId = parseInt(moduleId);

        // Кэш
        if (!forceReload) {
            const cached = nextcloudCache[numericId];
            if (cached && (Date.now() - cached.timestamp) < NEXTCLOUD_CACHE_TTL_MS) {
                renderNextcloudDisplay(moduleElement, cached.data);
                return;
            }
        }

        const response = await fetch(`/api/modules/${moduleId}/data`);
        if (response.ok) {
            const data = await response.json();
            nextcloudCache[numericId] = { data, timestamp: Date.now() };
            renderNextcloudDisplay(moduleElement, data);
        }
    } catch (error) {
        console.error('Nextcloud load error:', error);
    }
}

function invalidateNextcloudCache(moduleId) {
    delete nextcloudCache[moduleId];
    delete nextcloudPath[moduleId];
}

// ===== ЗАГРУЗКА КОНКРЕТНОЙ ПАПКИ =====
async function navigateToFolder(moduleId, path) {
    const moduleElement = document.querySelector(`.widget[data-widget-id="${moduleId}"]`);
    if (!moduleElement) return;

    nextcloudPath[moduleId] = path;

    const display = moduleElement.querySelector('.nextcloud-display');
    if (display) {
        display.innerHTML = `<div style="text-align:center; opacity:0.5; padding:10px;">⏳ Загрузка...</div>`;
    }

    try {
        const response = await fetch(`/api/modules/${moduleId}/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'listPath',
                params: { path: path }
            })
        });

        if (response.ok) {
            const data = await response.json();
            // data — это ModuleData с content
            renderNextcloudDisplay(moduleElement, data, true);
        } else {
            showToast('❌ Ошибка загрузки папки');
        }
    } catch (e) {
        showToast('❌ Ошибка загрузки папки');
    }
}

// ===== РЕНДЕР =====
function renderNextcloudDisplay(moduleElement, data, isSubfolder = false) {
    const display = moduleElement.querySelector('.nextcloud-display');
    if (!display) return;

    // ===== ГАРАНТИРУЕМ FLEX-КОЛОНКУ =====
    display.style.display = 'flex';
    display.style.flexDirection = 'column';
    display.style.flexWrap = 'nowrap';
    display.style.width = '100%';
    display.style.height = '100%';
    display.style.minHeight = '0';
    display.style.overflow = 'hidden';
    display.style.height = '100%';

    const content = data.content || {};
    const nextcloudData = content.nextcloudData || {};
    const files = content.files || {};
    const storage = content.storage || {};
    const error = content.error || null;

    // Сохраняем базовый путь при первом рендере
    const moduleId = moduleElement.dataset.widgetId;
    if (!nextcloudPath[moduleId]) {
        nextcloudPath[moduleId] = nextcloudData.path || '/';
    }
    const currentPath = nextcloudPath[moduleId];

    if (error) {
        display.innerHTML = `
            <div style="text-align:center; padding:10px; color:#ff6b6b;">
                <div style="font-size:32px;">⚠️</div>
                <div style="font-size:13px; margin-top:8px;">${escapeHtml(error)}</div>
                <div style="font-size:11px; opacity:0.5; margin-top:4px;">Нажмите ⚙️ для настройки</div>
            </div>
        `;
        return;
    }

    let html = '';

    // ===== ХРАНИЛИЩЕ (только в корне) =====
    if (storage && storage.used !== undefined && !isSubfolder) {
        const usedPercent = storage.usedPercent || 0;
        const unlimited = storage.unlimited || false;
        const color = usedPercent > 90 ? '#ff6b6b' : usedPercent > 70 ? '#ffd93d' : '#6bcb77';

        if (unlimited) {
            html += `
                <div style="font-size:11px; opacity:0.5; margin-bottom:8px;">
                    📊 Использовано: ${storage.usedFormatted || '—'} (безлимит)
                </div>
            `;
        } else {
            html += `
                <div style="margin-bottom:10px;">
                    <div style="display:flex; justify-content:space-between; font-size:11px; opacity:0.6;">
                        <span>📊 ${storage.usedFormatted || '—'} / ${storage.totalFormatted || '—'}</span>
                        <span>${usedPercent}%</span>
                    </div>
                    <div style="width:100%; height:4px; background:rgba(255,255,255,0.1); border-radius:2px; overflow:hidden; margin-top:3px;">
                        <div style="width:${usedPercent}%; height:100%; background:${color}; border-radius:2px; transition:width 0.3s;"></div>
                    </div>
                </div>
            `;
        }
    }

    // ===== ХЛЕБНЫЕ КРОШКИ =====
    html += renderBreadcrumbs(moduleId, currentPath);

    // ===== СПИСОК ФАЙЛОВ =====
    if (files && files.files && files.files.length > 0) {
        html += `<div class="nc-file-list" style="display:flex; flex-direction:column; gap:2px; flex: 1; min-height: 0; overflow-y: auto; max-height: 100%;">`;
        html += files.files.map(file => {
            const safePath = escapeHtml(file.path || '');
            const safeName = escapeHtml(file.name || '');
            const clickable = file.isDirectory
                ? `onclick="navigateToFolder(${moduleId}, '${safePath.replace(/'/g, "\\'")}')"`
                : `onclick="downloadNextcloudFile(${moduleId}, '${safePath.replace(/'/g, "\\'")}')"`;

            return `
                <div class="nc-file-row" 
                     style="display:flex; align-items:center; gap:6px; padding:3px 6px; 
                            border-radius:4px; font-size:12px; cursor:pointer;
                            transition:background 0.15s;"
                     onmouseover="this.style.background='rgba(255,255,255,0.06)'"
                     onmouseout="this.style.background='transparent'"
                     ${clickable}>
                    <span style="font-size:14px; flex-shrink:0;">${file.icon || '📄'}</span>
                    <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"
                          title="${safeName}">${safeName}</span>
                    <span style="font-size:10px; opacity:0.3; flex-shrink:0;">${file.size || ''}</span>
                </div>
            `;
        }).join('');
        html += `</div>`;
    } else if (files && !files.error) {
        html += `
            <div style="text-align:center; opacity:0.3; padding:12px; font-size:12px;">
                📂 Папка пуста
            </div>
        `;
    }

    if (files && files.error) {
        html += `
            <div style="padding:6px 10px; border-radius:4px; background:rgba(244,67,54,0.1); 
                        border:1px solid rgba(244,67,54,0.2); font-size:11px; color:#ff6b6b; margin-top:6px;">
                ⚠️ ${escapeHtml(files.error)}
            </div>
        `;
    }

    display.innerHTML = html;
}

// ===== ХЛЕБНЫЕ КРОШКИ =====
function renderBreadcrumbs(moduleId, currentPath) {
    const basePath = nextcloudCache[moduleId]?.data?.content?.nextcloudData?.path || '/';

    // Нормализуем
    const base = basePath.endsWith('/') && basePath !== '/'
        ? basePath.substring(0, basePath.length - 1)
        : basePath;
    const current = currentPath.endsWith('/') && currentPath !== '/'
        ? currentPath.substring(0, currentPath.length - 1)
        : currentPath;

    // Относительный путь от базы
    let relative = current;
    if (current.startsWith(base)) {
        relative = current.substring(base.length);
    }
    if (!relative.startsWith('/')) relative = '/' + relative;

    const segments = relative.split('/').filter(s => s.length > 0);

    let html = `<div class="nc-breadcrumbs" style="display:flex; align-items:center; gap:4px; 
                font-size:11px; opacity:0.6; margin-bottom:6px; flex-wrap:wrap; flex-shrink: 0">`;

    // Кнопка "вверх" (если не в корне)
    if (segments.length > 0) {
        const parentPath = base + (segments.length > 1 ? '/' + segments.slice(0, -1).join('/') : '');
        html += `
            <span style="cursor:pointer; padding:1px 4px; border-radius:3px;" 
                  onmouseover="this.style.background='rgba(255,255,255,0.1)'"
                  onmouseout="this.style.background='transparent'"
                  onclick="navigateToFolder(${moduleId}, '${parentPath.replace(/'/g, "\\'")}')"
                  title="Вверх">⬆️</span>
        `;
    }

    // Корень
    html += `
        <span style="cursor:pointer; padding:1px 4px; border-radius:3px;"
              onmouseover="this.style.background='rgba(255,255,255,0.1)'"
              onmouseout="this.style.background='transparent'"
              onclick="navigateToFolder(${moduleId}, '${base.replace(/'/g, "\\'")}')"
              title="Корень">🏠</span>
    `;

    // Сегменты
    segments.forEach((seg, idx) => {
        const path = base + '/' + segments.slice(0, idx + 1).join('/');
        html += `<span style="opacity:0.3;">/</span>`;
        const isLast = idx === segments.length - 1;
        html += `
            <span style="cursor:pointer; padding:1px 4px; border-radius:3px; ${isLast ? 'opacity:0.9; font-weight:500;' : ''}"
                  onmouseover="this.style.background='rgba(255,255,255,0.1)'"
                  onmouseout="this.style.background='transparent'"
                  onclick="navigateToFolder(${moduleId}, '${path.replace(/'/g, "\\'")}')"
                  title="${escapeHtml(seg)}">${escapeHtml(seg)}</span>
        `;
    });

    html += `</div>`;
    return html;
}

// ===== СКАЧИВАНИЕ =====
function downloadNextcloudFile(moduleId, filePath) {
    const url = `/api/nextcloud/${moduleId}/download?path=${encodeURIComponent(filePath)}`;
    window.open(url, '_blank');
}

// ===== НАСТРОЙКИ (без изменений по структуре) =====
function renderNextcloudSettings(data) {
    if (!data || !data.content) {
        return `<div style="text-align:center; opacity:0.5; padding:10px; font-size:13px;">⏳ Загрузка...</div>`;
    }

    const content = data.content || {};
    const nextcloudData = content.nextcloudData || {};
    const storage = content.storage || {};

    const serverUrl = nextcloudData.serverUrl || '';
    const username = nextcloudData.username || '';
    const password = nextcloudData.password || '';
    const path = nextcloudData.path || '/';
    const maxFiles = nextcloudData.maxFiles || 50;
    const showStorage = nextcloudData.showStorage !== undefined ? nextcloudData.showStorage : true;
    const showRecentFiles = nextcloudData.showRecentFiles !== undefined ? nextcloudData.showRecentFiles : true;

    let html = `
        <div style="display:flex; flex-direction:column; gap:12px; padding:4px 0;">
            <div>
                <label style="font-size:12px; opacity:0.6; display:block; margin-bottom:4px;">Сервер</label>
                <input type="text" class="nc-server" value="${escapeHtml(serverUrl)}" 
                       placeholder="http://localhost:8090"
                       style="width:100%; padding:6px 10px; border-radius:6px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.08); color:white; font-size:12px;">
            </div>
            
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <div>
                    <label style="font-size:12px; opacity:0.6; display:block; margin-bottom:4px;">Пользователь</label>
                    <input type="text" class="nc-username" value="${escapeHtml(username)}" 
                           placeholder="admin"
                           style="width:100%; padding:6px 10px; border-radius:6px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.08); color:white; font-size:12px;">
                </div>
                <div>
                    <label style="font-size:12px; opacity:0.6; display:block; margin-bottom:4px;">Пароль</label>
                    <input type="password" class="nc-password" value="${escapeHtml(password)}" 
                           placeholder="••••••••"
                           style="width:100%; padding:6px 10px; border-radius:6px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.08); color:white; font-size:12px;">
                </div>
            </div>
            
            <div>
                <label style="font-size:12px; opacity:0.6; display:block; margin-bottom:4px;">Стартовая папка</label>
                <input type="text" class="nc-path" value="${escapeHtml(path)}" 
                       placeholder="/"
                       style="width:100%; padding:6px 10px; border-radius:6px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.08); color:white; font-size:12px;">
            </div>
            
            <div>
                <label style="font-size:12px; opacity:0.6; display:block; margin-bottom:4px;">Максимум элементов</label>
                <input type="number" class="nc-max-files" value="${maxFiles}" min="1" max="100"
                       style="width:100%; padding:6px 10px; border-radius:6px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.08); color:white; font-size:12px;">
            </div>
            
            <div style="display:flex; flex-wrap:wrap; gap:12px;">
                <label style="display:flex; align-items:center; gap:6px; font-size:12px; opacity:0.7; cursor:pointer;">
                    <input type="checkbox" class="nc-show-storage" ${showStorage ? 'checked' : ''}>
                    📊 Показывать хранилище
                </label>
                <label style="display:flex; align-items:center; gap:6px; font-size:12px; opacity:0.7; cursor:pointer;">
                    <input type="checkbox" class="nc-show-files" ${showRecentFiles ? 'checked' : ''}>
                    📁 Показывать файлы
                </label>
            </div>
            
            <div style="display:flex; gap:8px;">
                <button class="nc-test-btn" style="flex:1; padding:6px 16px; border-radius:6px; background:rgba(33,150,243,0.2); border:1px solid rgba(33,150,243,0.3); color:white; cursor:pointer; font-size:12px;">
                    🔌 Проверить
                </button>
                <button class="nc-update-btn" style="flex:1; padding:6px 16px; border-radius:6px; background:rgba(76,175,80,0.2); border:1px solid rgba(76,175,80,0.3); color:white; cursor:pointer; font-size:12px;">
                    💾 Сохранить
                </button>
            </div>
    `;

    if (storage && storage.used !== undefined) {
        html += `
            <div style="padding:6px 10px; border-radius:6px; background:rgba(76,175,80,0.1); border:1px solid rgba(76,175,80,0.2); font-size:11px; color:#81C784;">
                ✅ Подключено — ${storage.usedFormatted || '—'} использовано
            </div>
        `;
    }

    html += `</div>`;
    return html;
}

function initNextcloudSettingsEvents(moduleId, settingsContainer) {
    const testBtn = settingsContainer.querySelector('.nc-test-btn');
    if (testBtn) {
        testBtn.addEventListener('click', () => testNextcloudConnection(moduleId, settingsContainer));
    }

    const updateBtn = settingsContainer.querySelector('.nc-update-btn');
    if (updateBtn) {
        updateBtn.addEventListener('click', () => updateNextcloudSettings(moduleId, settingsContainer));
    }
}

async function testNextcloudConnection(moduleId, settingsContainer) {
    const serverInput = settingsContainer.querySelector('.nc-server');
    const usernameInput = settingsContainer.querySelector('.nc-username');
    const passwordInput = settingsContainer.querySelector('.nc-password');

    const serverUrl = serverInput ? serverInput.value.trim() : '';
    const username = usernameInput ? usernameInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';

    if (!serverUrl || !username || !password) {
        showToast('❌ Заполните все поля');
        return;
    }

    try {
        showToast('⏳ Проверка...');

        const response = await fetch(`/api/modules/${moduleId}/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'testConnection',
                params: { serverUrl, username, password }
            })
        });

        if (response.ok) {
            const result = await response.json();
            const content = result.content || result;   // ← на случай обеих форм
            if (content.connected) {
                showToast('✅ Подключение успешно!');
            } else {
                showToast('❌ ' + (content.message || 'Проверьте данные'));
            }
        }
    } catch (error) {
        showToast('❌ Ошибка проверки');
    }
}

async function updateNextcloudSettings(moduleId, settingsContainer, silent = false) {
    const serverUrl = settingsContainer.querySelector('.nc-server')?.value.trim() || '';
    const username = settingsContainer.querySelector('.nc-username')?.value.trim() || '';
    const password = settingsContainer.querySelector('.nc-password')?.value || '';
    const path = settingsContainer.querySelector('.nc-path')?.value.trim() || '/';
    const maxFiles = parseInt(settingsContainer.querySelector('.nc-max-files')?.value) || 10;
    const showStorage = settingsContainer.querySelector('.nc-show-storage')?.checked ?? true;
    const showRecentFiles = settingsContainer.querySelector('.nc-show-files')?.checked ?? true;

    if (!serverUrl || !username) {
        if (!silent) showToast('❌ Заполните сервер и пользователя');
        return;
    }

    try {
        const response = await fetch(`/api/modules/${moduleId}/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'updateSettings',
                params: { serverUrl, username, password, path, maxFiles, showStorage, showRecentFiles }
            })
        });

        if (response.ok) {
            const data = await response.json();

            // Сбрасываем кэш и путь
            invalidateNextcloudCache(moduleId);

            const moduleElement = document.querySelector(`.widget[data-widget-id="${moduleId}"]`);
            if (moduleElement) {
                renderNextcloudDisplay(moduleElement, data);
            }

            if (typeof WidgetSettingsPopup !== 'undefined' && WidgetSettingsPopup.isOpenFor(moduleId)) {
                WidgetSettingsPopup.refresh();
            }

            if (!silent) showToast('✅ Настройки сохранены');
        } else {
            if (!silent) showToast('❌ Ошибка сохранения');
        }
    } catch (error) {
        if (!silent) showToast('❌ Ошибка сохранения');
    }
}

// ===== ЭКСПОРТ =====
window.initNextcloudModule = initNextcloudModule;
window.renderNextcloudSettings = renderNextcloudSettings;
window.initNextcloudSettingsEvents = initNextcloudSettingsEvents;
window.updateNextcloudSettings = updateNextcloudSettings;
window.navigateToFolder = navigateToFolder;
window.downloadNextcloudFile = downloadNextcloudFile;
window.invalidateNextcloudCache = invalidateNextcloudCache;