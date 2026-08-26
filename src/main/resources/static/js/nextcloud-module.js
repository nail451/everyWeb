/**
 * NEXTCLOUD-MODULE.JS - Логика модуля Nextcloud
 */

console.log('Nextcloud module loaded!');

function initNextcloudModule(moduleElement, moduleId) {
    console.log('Initializing Nextcloud module:', moduleId);
    loadNextcloudData(moduleElement, moduleId);
}

async function loadNextcloudData(moduleElement, moduleId) {
    try {
        const response = await fetch(`/api/modules/${moduleId}/data`);
        if (response.ok) {
            const data = await response.json();
            console.log('Nextcloud data loaded:', data);
            renderNextcloudDisplay(moduleElement, data);
        }
    } catch (error) {
        console.error('Error loading Nextcloud data:', error);
    }
}

function renderNextcloudDisplay(moduleElement, data) {
    const display = moduleElement.querySelector('.nextcloud-display');
    if (!display) return;

    const content = data.content || {};
    const nextcloudData = content.nextcloudData || {};
    const files = content.files || {};
    const storage = content.storage || {};
    const error = content.error || null;

    if (error) {
        display.innerHTML = `
            <div style="text-align:center; padding:10px; color:#ff6b6b;">
                <div style="font-size:32px;">⚠️</div>
                <div style="font-size:14px; margin-top:8px;">${error}</div>
                <div style="font-size:12px; opacity:0.5; margin-top:4px;">
                    Нажмите ⚙️ для настройки подключения
                </div>
            </div>
        `;
        return;
    }

    let html = '';

    if (storage && storage.total) {
        const usedPercent = storage.usedPercent || 0;
        const color = usedPercent > 90 ? '#ff6b6b' : usedPercent > 70 ? '#ffd93d' : '#6bcb77';

        html += `
            <div style="margin-bottom:12px;">
                <div style="display:flex; justify-content:space-between; font-size:12px; opacity:0.6;">
                    <span>📊 Хранилище</span>
                    <span>${storage.usedFormatted || '—'} / ${storage.totalFormatted || '—'}</span>
                </div>
                <div style="width:100%; height:6px; background:rgba(255,255,255,0.1); border-radius:3px; overflow:hidden; margin-top:4px;">
                    <div style="width:${usedPercent}%; height:100%; background:${color}; border-radius:3px; transition:width 0.5s;"></div>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:10px; opacity:0.3; margin-top:2px;">
                    <span>Свободно: ${storage.freeFormatted || '—'}</span>
                    <span>${usedPercent}%</span>
                </div>
            </div>
        `;
    }

    if (files && files.files && files.files.length > 0) {
        html += `
            <div style="font-size:12px; opacity:0.5; margin-bottom:8px;">
                📁 Последние файлы (${files.count || 0})
            </div>
            <div style="display:flex; flex-direction:column; gap:4px;">
                ${files.files.map(file => `
                    <div style="display:flex; align-items:center; gap:8px; padding:4px 8px; 
                                background:rgba(255,255,255,0.03); border-radius:6px; font-size:12px;
                                transition:background 0.2s; cursor:pointer;"
                         onmouseover="this.style.background='rgba(255,255,255,0.06)'"
                         onmouseout="this.style.background='rgba(255,255,255,0.03)'">
                        <span style="font-size:16px;">${file.icon || '📄'}</span>
                        <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                            ${file.name}
                        </span>
                        <span style="font-size:10px; opacity:0.3;">${file.size || '—'}</span>
                        <span style="font-size:10px; opacity:0.2;">${file.mtime || '—'}</span>
                    </div>
                `).join('')}
            </div>
        `;
    } else if (files && !files.error) {
        html += `
            <div style="text-align:center; opacity:0.3; padding:10px; font-size:13px;">
                📂 Нет файлов в папке ${nextcloudData.path || '/'}
            </div>
        `;
    }

    if (files && files.error) {
        html += `
            <div style="padding:8px 12px; border-radius:6px; background:rgba(244,67,54,0.1); 
                        border:1px solid rgba(244,67,54,0.2); font-size:12px; color:#ff6b6b; margin-top:8px;">
                ⚠️ ${files.error}
            </div>
        `;
    }

    display.innerHTML = html;
}

// ===== НАСТРОЙКИ МОДУЛЯ NEXTCLOUD =====
function renderNextcloudSettings(data) {
    console.log('Rendering Nextcloud settings with data:', data);

    // Проверяем наличие данных
    if (!data || !data.content) {
        return `
            <div style="text-align:center; opacity:0.5; padding:10px; font-size:13px;">
                ⏳ Загрузка настроек...
            </div>
        `;
    }

    const content = data.content || {};
    const nextcloudData = content.nextcloudData || {};
    const storage = content.storage || {};

    const serverUrl = nextcloudData.serverUrl || '';
    const username = nextcloudData.username || '';
    const password = nextcloudData.password || '';
    const path = nextcloudData.path || '/';
    const maxFiles = nextcloudData.maxFiles || 10;
    const showStorage = nextcloudData.showStorage !== undefined ? nextcloudData.showStorage : true;
    const showRecentFiles = nextcloudData.showRecentFiles !== undefined ? nextcloudData.showRecentFiles : true;

    let html = `
        <div style="display:flex; flex-direction:column; gap:12px; padding:4px 0;">
            <div>
                <label style="font-size:12px; opacity:0.6; display:block; margin-bottom:4px;">Сервер</label>
                <input type="text" class="nc-server" value="${serverUrl}" 
                       placeholder="http://localhost:8090"
                       style="width:100%; padding:6px 10px; border-radius:6px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.08); color:white; font-size:12px;">
                <div style="font-size:11px; opacity:0.3; margin-top:4px;">
                    URL вашего Nextcloud сервера (например: http://localhost:8090)
                </div>
            </div>
            
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <div>
                    <label style="font-size:12px; opacity:0.6; display:block; margin-bottom:4px;">Пользователь</label>
                    <input type="text" class="nc-username" value="${username}" 
                           placeholder="admin"
                           style="width:100%; padding:6px 10px; border-radius:6px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.08); color:white; font-size:12px;">
                </div>
                <div>
                    <label style="font-size:12px; opacity:0.6; display:block; margin-bottom:4px;">Пароль</label>
                    <input type="password" class="nc-password" value="${password}" 
                           placeholder="••••••••"
                           style="width:100%; padding:6px 10px; border-radius:6px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.08); color:white; font-size:12px;">
                </div>
            </div>
            
            <div>
                <label style="font-size:12px; opacity:0.6; display:block; margin-bottom:4px;">Путь</label>
                <input type="text" class="nc-path" value="${path}" 
                       placeholder="/"
                       style="width:100%; padding:6px 10px; border-radius:6px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.08); color:white; font-size:12px;">
                <div style="font-size:11px; opacity:0.3; margin-top:4px;">
                    Путь к папке на сервере (например: /Documents или /Photos)
                </div>
            </div>
            
            <div>
                <label style="font-size:12px; opacity:0.6; display:block; margin-bottom:4px;">Максимум файлов</label>
                <input type="number" class="nc-max-files" value="${maxFiles}" min="1" max="50"
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
                    🔌 Проверить подключение
                </button>
                <button class="nc-update-btn" style="flex:1; padding:6px 16px; border-radius:6px; background:rgba(76,175,80,0.2); border:1px solid rgba(76,175,80,0.3); color:white; cursor:pointer; font-size:12px;">
                    💾 Сохранить
                </button>
            </div>
            
            ${storage && storage.total ? `
                <div style="padding:8px 12px; border-radius:6px; background:rgba(76,175,80,0.1); border:1px solid rgba(76,175,80,0.2); font-size:11px; color:#81C784; display:flex; justify-content:space-between; flex-wrap:wrap;">
                    <span>📊 ${storage.usedFormatted || '—'} / ${storage.totalFormatted || '—'}</span>
                    <span>${storage.usedPercent || 0}% использовано</span>
                    <span>✅ Подключено</span>
                </div>
            ` : (serverUrl && username ? `
                <div style="padding:8px 12px; border-radius:6px; background:rgba(255,193,7,0.1); border:1px solid rgba(255,193,7,0.2); font-size:11px; color:#ffd93d;">
                    ⏳ Нажмите "Проверить подключение"
                </div>
            ` : '')}
        </div>
    `;

    return html;
}

// ===== ИНИЦИАЛИЗАЦИЯ СОБЫТИЙ НАСТРОЕК =====
function initNextcloudSettingsEvents(moduleId, settingsContainer) {
    // Проверка подключения
    const testBtn = settingsContainer.querySelector('.nc-test-btn');
    if (testBtn) {
        testBtn.addEventListener('click', function() {
            testNextcloudConnection(moduleId, settingsContainer);
        });
    }

    // Сохранение настроек
    const updateBtn = settingsContainer.querySelector('.nc-update-btn');
    if (updateBtn) {
        updateBtn.addEventListener('click', function() {
            updateNextcloudSettings(moduleId, settingsContainer);
        });
    }
}

// ===== ПРОВЕРКА ПОДКЛЮЧЕНИЯ =====
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
        showToast('⏳ Проверка подключения...');

        const response = await fetch(`/api/modules/${moduleId}/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'testConnection',
                params: {
                    serverUrl: serverUrl,
                    username: username,
                    password: password
                }
            })
        });

        if (response.ok) {
            const result = await response.json();
            console.log('Connection test result:', result);

            if (result.connected) {
                showToast('✅ Подключение успешно!');
                // Автоматически сохраняем настройки
                await updateNextcloudSettings(moduleId, settingsContainer, true);
            } else {
                showToast('❌ Ошибка подключения: ' + (result.message || 'Проверьте данные'));
            }
        } else {
            const error = await response.text();
            showToast('❌ Ошибка: ' + error);
        }
    } catch (error) {
        console.error('Error testing connection:', error);
        showToast('❌ Ошибка проверки подключения');
    }
}

// ===== ОБНОВЛЕНИЕ НАСТРОЕК =====
async function updateNextcloudSettings(moduleId, settingsContainer, silent = false) {
    const serverInput = settingsContainer.querySelector('.nc-server');
    const usernameInput = settingsContainer.querySelector('.nc-username');
    const passwordInput = settingsContainer.querySelector('.nc-password');
    const pathInput = settingsContainer.querySelector('.nc-path');
    const maxFilesInput = settingsContainer.querySelector('.nc-max-files');
    const showStorageCheck = settingsContainer.querySelector('.nc-show-storage');
    const showFilesCheck = settingsContainer.querySelector('.nc-show-files');

    const serverUrl = serverInput ? serverInput.value.trim() : '';
    const username = usernameInput ? usernameInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';
    const path = pathInput ? pathInput.value.trim() : '/';
    const maxFiles = maxFilesInput ? parseInt(maxFilesInput.value) || 10 : 10;
    const showStorage = showStorageCheck ? showStorageCheck.checked : true;
    const showRecentFiles = showFilesCheck ? showFilesCheck.checked : true;

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
                params: {
                    serverUrl: serverUrl,
                    username: username,
                    password: password,
                    path: path,
                    maxFiles: maxFiles,
                    showStorage: showStorage,
                    showRecentFiles: showRecentFiles
                }
            })
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Nextcloud settings updated:', data);

            const moduleElement = document.querySelector(`.module[data-module-id="${moduleId}"]`);
            if (moduleElement) {
                renderNextcloudDisplay(moduleElement, data);
            }

            if (settingsContainer) {
                settingsContainer.innerHTML = renderNextcloudSettings(data);
                initNextcloudSettingsEvents(moduleId, settingsContainer);
            }

            if (!silent) showToast('✅ Настройки сохранены');
        } else {
            const error = await response.text();
            if (!silent) showToast('❌ Ошибка: ' + error);
        }
    } catch (error) {
        console.error('Error updating nextcloud settings:', error);
        if (!silent) showToast('❌ Ошибка сохранения настроек');
    }
}