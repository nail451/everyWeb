/**
 * CLOCK-MODULE.JS - Логика модуля часов
 */

console.log('Clock module loaded!');

// ===== КЭШ ДЛЯ ДАННЫХ =====
const clockCache = {};
let clockSettingsCache = {};

// ===== ИНИЦИАЛИЗАЦИЯ МОДУЛЯ ЧАСОВ =====
function initClockModule(moduleElement, moduleId) {
    console.log('Initializing clock module:', moduleId);

    if (window.clockIntervals && window.clockIntervals[moduleId]) {
        clearInterval(window.clockIntervals[moduleId]);
        delete window.clockIntervals[moduleId];
    }

    loadClockData(moduleElement, moduleId);
    startClockUpdater(moduleId);
}

// ===== ЗАГРУЗКА ДАННЫХ ЧАСОВ =====
async function loadClockData(moduleElement, moduleId) {
    try {
        console.log(`Loading clock data for module ${moduleId}`);
        const response = await fetch(`/api/modules/${moduleId}/data`);
        if (response.ok) {
            const data = await response.json();
            console.log('Clock data loaded:', data);
            clockCache[moduleId] = data;

            if (data.content && data.content.clockData) {
                clockSettingsCache[moduleId] = data.content.clockData;
            }

            renderClockDisplay(moduleElement, data);
        } else {
            console.error(`Failed to load clock data for module ${moduleId}:`, response.status);
            if (clockCache[moduleId]) {
                renderClockDisplay(moduleElement, clockCache[moduleId]);
            }
        }
    } catch (error) {
        console.error('Error loading clock data:', error);
        if (clockCache[moduleId]) {
            renderClockDisplay(moduleElement, clockCache[moduleId]);
        }
    }
}

// ===== РЕНДЕРИНГ ОТОБРАЖЕНИЯ ЧАСОВ =====
function renderClockDisplay(moduleElement, data) {
    const clockDisplay = moduleElement.querySelector('.clock-display');
    if (!clockDisplay) return;

    const content = data.content || {};
    const currentTimes = content.currentTime || [];

    if (!currentTimes || currentTimes.length === 0) {
        clockDisplay.innerHTML = `
            <div style="text-align:center; opacity:0.5; padding:10px;">
                ⏳ Нет данных
            </div>
        `;
        return;
    }

    let html = '';
    currentTimes.forEach((time, index) => {
        const isMain = index === 0;
        const displayName = time.name || '';
        const showName = displayName && !isMain;

        html += `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:4px 0; ${isMain ? 'font-size:1.4em; font-weight:500;' : 'font-size:1em; opacity:0.8;'}">
                ${showName ? `<span style="font-size:0.7em; opacity:0.5; margin-right:12px;">${displayName}</span>` : ''}
                <span style="font-family:monospace; letter-spacing:1px;">${time.time || '--:--'}</span>
            </div>
        `;
    });

    clockDisplay.innerHTML = html;
}

// ===== ЗАПУСК ОБНОВЛЕНИЯ ВРЕМЕНИ =====
function startClockUpdater(moduleId) {
    if (window.clockIntervals && window.clockIntervals[moduleId]) {
        clearInterval(window.clockIntervals[moduleId]);
        delete window.clockIntervals[moduleId];
    }

    if (!window.clockIntervals) {
        window.clockIntervals = {};
    }

    console.log(`Starting clock updater for module ${moduleId}`);

    window.clockIntervals[moduleId] = setInterval(() => {
        updateClockTime(moduleId);
    }, 1000);
}

// ===== ОБНОВЛЕНИЕ ВРЕМЕНИ =====
async function updateClockTime(moduleId) {
    try {
        const settings = clockSettingsCache[moduleId];
        if (!settings) {
            const settingsResponse = await fetch(`/api/modules/${moduleId}/settings`);
            if (settingsResponse.ok) {
                const settingsData = await settingsResponse.json();
                if (settingsData.content && settingsData.content.clockData) {
                    clockSettingsCache[moduleId] = settingsData.content.clockData;
                }
            }
            return;
        }

        const showSeconds = settings.showSeconds || false;
        const format = settings.format || '24h';
        const timezone = settings.timezone || 'UTC';
        const faces = settings.faces || [];

        const now = new Date();
        const currentTimes = [];

        const mainTime = formatTime(now, timezone, format, showSeconds);
        currentTimes.push({
            name: '',
            time: mainTime,
            timezone: timezone
        });

        faces.forEach(face => {
            try {
                const faceTime = formatTime(now, face.timezone, format, showSeconds);
                currentTimes.push({
                    name: face.name,
                    time: faceTime,
                    timezone: face.timezone
                });
            } catch (e) {
                console.warn('Invalid timezone:', face.timezone);
            }
        });

        const moduleElement = document.querySelector(`.module[data-module-id="${moduleId}"]`);
        if (moduleElement) {
            const clockDisplay = moduleElement.querySelector('.clock-display');
            if (clockDisplay) {
                let html = '';
                currentTimes.forEach((time, index) => {
                    const isMain = index === 0;
                    const displayName = time.name || '';
                    const showName = displayName && !isMain;

                    html += `
                        <div style="display:flex; justify-content:space-between; align-items:center; padding:4px 0; ${isMain ? 'font-size:1.4em; font-weight:500;' : 'font-size:1em; opacity:0.8;'}">
                            ${showName ? `<span style="font-size:0.7em; opacity:0.5; margin-right:12px;">${displayName}</span>` : ''}
                            <span style="font-family:monospace; letter-spacing:1px;">${time.time || '--:--'}</span>
                        </div>
                    `;
                });
                clockDisplay.innerHTML = html;
            }
        }
    } catch (error) {
        // Игнорируем ошибки обновления
    }
}

// ===== ФОРМАТИРОВАНИЕ ВРЕМЕНИ =====
function formatTime(date, timezone, format, showSeconds) {
    try {
        const options = {
            timeZone: timezone,
            hour: '2-digit',
            minute: '2-digit',
            hour12: format === '12h'
        };

        if (showSeconds) {
            options.second = '2-digit';
        }

        return date.toLocaleTimeString('ru-RU', options);
    } catch (e) {
        return '--:--';
    }
}

// ===== РЕНДЕРИНГ НАСТРОЕК ЧАСОВ =====
function renderClockSettings(data) {
    console.log('Rendering clock settings with data:', data);

    const content = data.content || {};
    const clockData = content.clockData || {};
    const timezones = content.timezoneList || [];

    if (!clockData || Object.keys(clockData).length === 0) {
        return `
            <div style="text-align:center; opacity:0.5; padding:10px; font-size:13px;">
                ⏳ Загрузка настроек часов...
            </div>
        `;
    }

    const format = clockData.format || '24h';
    const showSeconds = clockData.showSeconds || false;
    const timezone = clockData.timezone || 'UTC';
    const faces = clockData.faces || [];

    let html = `
        <div style="display:flex; flex-direction:column; gap:12px; padding:4px 0;">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <div>
                    <label style="font-size:12px; opacity:0.6; display:block; margin-bottom:4px;">Формат</label>
                    <select class="clock-format" style="width:100%; padding:6px 10px; border-radius:6px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.08); color:white; font-size:12px;">
                        <option value="24h" ${format === '24h' ? 'selected' : ''}>24 часа</option>
                        <option value="12h" ${format === '12h' ? 'selected' : ''}>12 часов</option>
                    </select>
                </div>
                <div>
                    <label style="font-size:12px; opacity:0.6; display:block; margin-bottom:4px;">Часовой пояс</label>
                    <select class="clock-timezone" style="width:100%; padding:6px 10px; border-radius:6px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.08); color:white; font-size:12px;">
                        ${timezones.map(tz => `
                            <option value="${tz.value}" ${timezone === tz.value ? 'selected' : ''}>
                                ${tz.label}
                            </option>
                        `).join('')}
                    </select>
                </div>
            </div>
            
            <div style="display:flex; align-items:center; gap:8px;">
                <input type="checkbox" class="clock-seconds" ${showSeconds ? 'checked' : ''}>
                <label style="font-size:12px; opacity:0.7;">Показывать секунды</label>
            </div>
            
            <div style="margin-top:4px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <span style="font-size:12px; opacity:0.6;">Дополнительные циферблаты</span>
                    <button class="clock-add-face-btn" style="padding:2px 12px; border-radius:4px; background:rgba(76,175,80,0.2); border:1px solid rgba(76,175,80,0.3); color:white; cursor:pointer; font-size:11px;">+ Добавить</button>
                </div>
                
                <div class="clock-faces-list" style="display:flex; flex-direction:column; gap:4px;">
                    ${faces.map((face, index) => {
        return `
                            <div class="clock-face-item" style="display:flex; align-items:center; gap:8px; padding:4px 8px; background:rgba(255,255,255,0.03); border-radius:6px; font-size:12px;">
                                <span>🕐</span>
                                <span class="clock-face-name" style="flex:1;">${face.name || 'Циферблат'}</span>
                                <span style="opacity:0.5; font-size:11px;">${face.timezone || 'UTC'}</span>
                                <button class="clock-remove-face" data-index="${index}" style="background:rgba(244,67,54,0.2); border:none; color:rgba(255,255,255,0.5); border-radius:50%; width:20px; height:20px; cursor:pointer; font-size:12px;">×</button>
                            </div>
                        `;
    }).join('')}
                    ${faces.length === 0 ? `
                        <div style="text-align:center; opacity:0.3; padding:8px; font-size:12px;">
                            Нет дополнительных циферблатов
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;

    return html;
}

// ===== ИНИЦИАЛИЗАЦИЯ СОБЫТИЙ НАСТРОЕК ЧАСОВ =====
function initClockSettingsEvents(moduleId, settingsContainer) {
    const formatSelect = settingsContainer.querySelector('.clock-format');
    if (formatSelect) {
        formatSelect.addEventListener('change', function() {
            updateClockSetting(moduleId, 'format', this.value);
        });
    }

    const timezoneSelect = settingsContainer.querySelector('.clock-timezone');
    if (timezoneSelect) {
        timezoneSelect.addEventListener('change', function() {
            updateClockSetting(moduleId, 'timezone', this.value);
        });
    }

    const secondsCheckbox = settingsContainer.querySelector('.clock-seconds');
    if (secondsCheckbox) {
        secondsCheckbox.addEventListener('change', function() {
            updateClockSetting(moduleId, 'showSeconds', this.checked);
        });
    }

    const addFaceBtn = settingsContainer.querySelector('.clock-add-face-btn');
    if (addFaceBtn) {
        addFaceBtn.addEventListener('click', function() {
            showAddClockFaceModal(moduleId);
        });
    }

    const removeFaceBtns = settingsContainer.querySelectorAll('.clock-remove-face');
    removeFaceBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const index = parseInt(this.dataset.index);
            console.log('Removing face at index:', index);
            removeClockFace(moduleId, index);
        });
    });
}

// ===== УДАЛЕНИЕ ЦИФЕРБЛАТА =====
async function removeClockFace(moduleId, index) {
    if (!confirm('Удалить этот циферблат?')) return;

    try {
        const response = await fetch(`/api/modules/${moduleId}/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'removeFace',
                params: { index: index }
            })
        });

        if (response.ok) {
            const data = await response.json();

            if (data.error) {
                showToast('❌ ' + data.error);
                return;
            }

            // Сохраняем состояние секунд
            const currentSettings = clockSettingsCache[moduleId] || {};
            const showSeconds = currentSettings.showSeconds || false;

            // Применяем состояние к полученным данным
            if (data.content && data.content.clockData) {
                data.content.clockData.showSeconds = showSeconds;
                clockSettingsCache[moduleId] = data.content.clockData;
            }

            const moduleElement = document.querySelector(`.module[data-module-id="${moduleId}"]`);
            if (moduleElement) {
                renderClockDisplay(moduleElement, data);

                const settingsDiv = moduleElement.querySelector('.module-settings');
                if (settingsDiv && settingsDiv.style.display !== 'none') {
                    const settingsResponse = await fetch(`/api/modules/${moduleId}/settings`);
                    if (settingsResponse.ok) {
                        const settingsData = await settingsResponse.json();
                        if (settingsData.content && settingsData.content.clockData) {
                            settingsData.content.clockData.showSeconds = showSeconds;
                            clockSettingsCache[moduleId] = settingsData.content.clockData;
                        }
                        settingsDiv.innerHTML = renderClockSettings(settingsData);
                        initClockSettingsEvents(moduleId, settingsDiv);
                    }
                }
            }
            showToast('✅ Циферблат удален');
        } else {
            const error = await response.text();
            showToast('❌ Ошибка: ' + error);
        }
    } catch (error) {
        console.error('Error removing clock face:', error);
        showToast('❌ Ошибка удаления циферблата');
    }
}

// ===== ОБНОВЛЕНИЕ НАСТРОЙКИ ЧАСОВ =====
async function updateClockSetting(moduleId, key, value) {
    try {
        const response = await fetch(`/api/modules/${moduleId}/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'updateSettings',
                params: { [key]: value }
            })
        });

        if (response.ok) {
            const data = await response.json();

            if (data.content && data.content.clockData) {
                clockSettingsCache[moduleId] = data.content.clockData;
            }

            const moduleElement = document.querySelector(`.module[data-module-id="${moduleId}"]`);
            if (moduleElement) {
                renderClockDisplay(moduleElement, data);

                const settingsDiv = moduleElement.querySelector('.module-settings');
                if (settingsDiv && settingsDiv.style.display !== 'none') {
                    settingsDiv.innerHTML = renderClockSettings(data);
                    initClockSettingsEvents(moduleId, settingsDiv);
                }
            }
            showToast('✅ Настройки часов обновлены');
        }
    } catch (error) {
        console.error('Error updating clock settings:', error);
        showToast('❌ Ошибка обновления настроек');
    }
}

// ===== ДОБАВЛЕНИЕ ЦИФЕРБЛАТА =====
async function addClockFace(moduleId, name, timezone) {
    try {
        const response = await fetch(`/api/modules/${moduleId}/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'addFace',
                params: { name: name, timezone: timezone }
            })
        });

        if (response.ok) {
            const data = await response.json();

            // Сохраняем состояние секунд
            const currentSettings = clockSettingsCache[moduleId] || {};
            const showSeconds = currentSettings.showSeconds || false;

            // Применяем состояние к полученным данным
            if (data.content && data.content.clockData) {
                data.content.clockData.showSeconds = showSeconds;
                clockSettingsCache[moduleId] = data.content.clockData;
            }

            const moduleElement = document.querySelector(`.module[data-module-id="${moduleId}"]`);
            if (moduleElement) {
                renderClockDisplay(moduleElement, data);

                const settingsDiv = moduleElement.querySelector('.module-settings');
                if (settingsDiv && settingsDiv.style.display !== 'none') {
                    const settingsResponse = await fetch(`/api/modules/${moduleId}/settings`);
                    if (settingsResponse.ok) {
                        const settingsData = await settingsResponse.json();
                        if (settingsData.content && settingsData.content.clockData) {
                            settingsData.content.clockData.showSeconds = showSeconds;
                            clockSettingsCache[moduleId] = settingsData.content.clockData;
                        }
                        settingsDiv.innerHTML = renderClockSettings(settingsData);
                        initClockSettingsEvents(moduleId, settingsDiv);
                    }
                }
            }
            showToast('✅ Циферблат добавлен');
        }
    } catch (error) {
        console.error('Error adding clock face:', error);
        showToast('❌ Ошибка добавления циферблата');
    }
}

// ===== МОДАЛЬНОЕ ОКНО ДЛЯ ДОБАВЛЕНИЯ ЦИФЕРБЛАТА =====
function showAddClockFaceModal(moduleId) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.6);
        backdrop-filter: blur(4px);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
        background: rgba(30,30,50,0.95);
        backdrop-filter: blur(20px);
        border-radius: 16px;
        padding: 24px;
        max-width: 400px;
        width: 100%;
        color: white;
        border: 1px solid rgba(255,255,255,0.06);
    `;

    modal.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <h3 style="margin:0; font-size:18px;">➕ Добавить циферблат</h3>
            <button onclick="this.closest('.clock-modal-overlay').remove()" 
                    style="background:none; border:none; color:rgba(255,255,255,0.4); font-size:20px; cursor:pointer;">
                ✕
            </button>
        </div>
        <div style="display:flex; flex-direction:column; gap:12px;">
            <div>
                <label style="font-size:12px; opacity:0.6; display:block; margin-bottom:4px;">Название</label>
                <input id="clockFaceName" type="text" placeholder="Нью-Йорк" 
                       style="width:100%; padding:8px 12px; border-radius:8px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.08); color:white; font-size:13px;">
            </div>
            <div>
                <label style="font-size:12px; opacity:0.6; display:block; margin-bottom:4px;">Часовой пояс</label>
                <input id="clockFaceTimezone" type="text" placeholder="America/New_York" 
                       style="width:100%; padding:8px 12px; border-radius:8px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.08); color:white; font-size:13px;">
                <div style="font-size:11px; opacity:0.3; margin-top:4px;">
                    Например: Europe/Moscow, America/New_York, Asia/Tokyo
                </div>
            </div>
            <div style="display:flex; gap:8px; margin-top:8px;">
                <button onclick="this.closest('.clock-modal-overlay').remove()" 
                        style="flex:1; padding:10px; border-radius:8px; background:rgba(255,255,255,0.06); border:none; color:rgba(255,255,255,0.5); cursor:pointer;">
                    Отмена
                </button>
                <button onclick="addClockFaceFromModal(${moduleId})" 
                        style="flex:1; padding:10px; border-radius:8px; background:rgba(76,175,80,0.3); border:1px solid rgba(76,175,80,0.3); color:white; cursor:pointer;">
                    Добавить
                </button>
            </div>
        </div>
    `;

    overlay.className = 'clock-modal-overlay';
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    setTimeout(() => {
        document.getElementById('clockFaceName').focus();
    }, 100);
}

// ===== ДОБАВЛЕНИЕ ЦИФЕРБЛАТА ИЗ МОДАЛЬНОГО ОКНА =====
function addClockFaceFromModal(moduleId) {
    const nameInput = document.getElementById('clockFaceName');
    const timezoneInput = document.getElementById('clockFaceTimezone');

    const name = nameInput ? nameInput.value.trim() : '';
    const timezone = timezoneInput ? timezoneInput.value.trim() : '';

    if (!name) {
        showToast('❌ Введите название циферблата');
        nameInput.focus();
        return;
    }

    if (!timezone) {
        showToast('❌ Введите часовой пояс');
        timezoneInput.focus();
        return;
    }

    const overlay = document.querySelector('.clock-modal-overlay');
    if (overlay) overlay.remove();

    addClockFace(moduleId, name, timezone);
}