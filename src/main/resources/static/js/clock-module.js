/**
 * CLOCK-MODULE.JS - Логика модуля часов с будильниками
 * Версия 2.5 - ИСПРАВЛЕНА РАБОТА PUSH УВЕДОМЛЕНИЙ
 */

// ===== КЭШ =====
const clockCache = {};
let clockSettingsCache = {};

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====
function getNumericId(moduleId) {
    if (typeof moduleId === 'number') return moduleId;
    if (typeof moduleId === 'string') {
        const num = parseInt(moduleId);
        return isNaN(num) ? null : num;
    }
    return null;
}

// ===== ИНИЦИАЛИЗАЦИЯ МОДУЛЯ ЧАСОВ =====
function initClockModule(moduleElement, moduleId) {
    const numericId = getNumericId(moduleId);
    if (numericId === null) {
        console.error('Invalid module ID:', moduleId);
        return;
    }

    if (window.clockIntervals && window.clockIntervals[numericId]) {
        clearInterval(window.clockIntervals[numericId]);
        delete window.clockIntervals[numericId];
    }

    loadClockData(moduleElement, numericId);
    startClockUpdater(numericId);
    startAlarmChecker(numericId);
}

// ===== ЗАГРУЗКА ДАННЫХ ЧАСОВ =====
async function loadClockData(moduleElement, moduleId) {
    const numericId = getNumericId(moduleId);
    if (numericId === null) return;

    try {
        const response = await fetch(`/api/modules/${numericId}/data`);
        if (response.ok) {
            const data = await response.json();
            clockCache[numericId] = data;

            if (data.content && data.content.clockData) {
                clockSettingsCache[numericId] = data.content.clockData;
            }

            renderClockDisplay(moduleElement, data);
        } else {
            console.error(`Failed to load clock data for module ${numericId}:`, response.status);
            if (clockCache[numericId]) {
                renderClockDisplay(moduleElement, clockCache[numericId]);
            }
        }
    } catch (error) {
        console.error('Error loading clock data:', error);
        if (clockCache[numericId]) {
            renderClockDisplay(moduleElement, clockCache[numericId]);
        }
    }
}

// ===== РЕНДЕРИНГ ОТОБРАЖЕНИЯ ЧАСОВ =====
function renderClockDisplay(moduleElement, data) {
    const clockDisplay = moduleElement.querySelector('.clock-display');
    if (!clockDisplay) return;

    const content = data.content || {};
    const currentTimes = content.currentTime || [];
    const clockData = content.clockData || {};
    const alarms = clockData.alarms || [];

    const activeAlarms = alarms.filter(a => a.enabled);

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
                ${showName ? `<span style="font-size:0.7em; opacity:0.5; margin-right:12px;">${escapeHtml(displayName)}</span>` : ''}
                <span style="font-family:monospace; letter-spacing:1px;">${time.time || '--:--'}</span>
            </div>
        `;
    });

    if (activeAlarms.length > 0) {
        html += `
            <div style="margin-top:8px; padding-top:8px; border-top:1px solid rgba(255,255,255,0.06); display:flex; gap:6px; flex-wrap:wrap;">
                ${activeAlarms.slice(0, 3).map(alarm => `
                    <span style="background:rgba(255,255,255,0.08); color:rgba(255,255,255,0.8); padding:2px 8px; border-radius:10px; font-size:10px; display:flex; align-items:center; gap:4px; border:1px solid rgba(255,255,255,0.1);">
                        🔔 ${escapeHtml(alarm.name || 'Будильник')}
                        <span style="font-size:9px; opacity:0.6;">${alarm.time || '--:--'}</span>
                    </span>
                `).join('')}
                ${activeAlarms.length > 3 ? `<span style="font-size:10px; opacity:0.4;">+${activeAlarms.length - 3}</span>` : ''}
            </div>
        `;
    }

    clockDisplay.innerHTML = html;
}

// ===== ЗАПУСК ОБНОВЛЕНИЯ ВРЕМЕНИ =====
function startClockUpdater(moduleId) {
    const numericId = getNumericId(moduleId);
    if (numericId === null) return;

    if (window.clockIntervals && window.clockIntervals[numericId]) {
        clearInterval(window.clockIntervals[numericId]);
        delete window.clockIntervals[numericId];
    }

    if (!window.clockIntervals) {
        window.clockIntervals = {};
    }

    window.clockIntervals[numericId] = setInterval(() => {
        updateClockTime(numericId);
    }, 1000);
}

// ===== ОБНОВЛЕНИЕ ВРЕМЕНИ =====
async function updateClockTime(moduleId) {
    const numericId = getNumericId(moduleId);
    if (numericId === null) return;

    try {
        const response = await fetch(`/api/modules/${numericId}/data`);
        if (!response.ok) {
            console.warn(`Failed to update clock data for ${numericId}:`, response.status);
            return;
        }

        const data = await response.json();

        if (data.content && data.content.clockData) {
            clockSettingsCache[numericId] = data.content.clockData;
        }
        clockCache[numericId] = data;

        const moduleElement = document.querySelector(`.widget[data-widget-id="${moduleId}"]`);
        if (moduleElement) {
            renderClockDisplay(moduleElement, data);
        }
    } catch (error) {
        console.error('Error updating clock time:', error);
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
    const content = data.content || {};
    const clockData = content.clockData || {};
    const timezones = content.timezoneList || [];
    const alarms = clockData.alarms || [];

    const hideBackground = content.settings?.hideBackground || content.hideBackground || false;
    const alignment = content.settings?.alignment || content.alignment || 'center-center';

    const numericId = data.moduleId || 'unknown';
    if (window.widgetSettingsCache && numericId !== 'unknown') {
        if (!window.widgetSettingsCache[numericId]) {
            window.widgetSettingsCache[numericId] = {};
        }
        window.widgetSettingsCache[numericId].hideBackground = hideBackground;
        window.widgetSettingsCache[numericId].alignment = alignment;
    }

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
            
            <div style="margin-top:4px; border-top:1px solid rgba(255,255,255,0.06); padding-top:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <span style="font-size:12px; opacity:0.6;">🌍 Дополнительные циферблаты</span>
                    <button class="clock-add-face-btn" style="padding:2px 12px; border-radius:4px; background:rgba(76,175,80,0.2); border:1px solid rgba(76,175,80,0.3); color:white; cursor:pointer; font-size:11px;">+ Добавить</button>
                </div>
                
                <div class="clock-faces-list" style="display:flex; flex-direction:column; gap:4px;">
                    ${faces.map((face, index) => {
        return `
                            <div class="clock-face-item" style="display:flex; align-items:center; gap:8px; padding:4px 8px; background:rgba(255,255,255,0.03); border-radius:6px; font-size:12px;">
                                <span>🕐</span>
                                <span class="clock-face-name" style="flex:1;">${escapeHtml(face.name || 'Циферблат')}</span>
                                <span style="opacity:0.5; font-size:11px;">${escapeHtml(face.timezone || 'UTC')}</span>
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

            <div style="margin-top:4px; border-top:1px solid rgba(255,255,255,0.06); padding-top:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <span style="font-size:12px; opacity:0.6;">🔔 Будильники</span>
                    <button class="clock-add-alarm-btn" style="padding:2px 12px; border-radius:4px; background:rgba(255,59,48,0.2); border:1px solid rgba(255,59,48,0.3); color:white; cursor:pointer; font-size:11px;">+ Добавить</button>
                </div>
                
                <div class="clock-alarms-list" style="display:flex; flex-direction:column; gap:6px;">
                    ${alarms.map((alarm, index) => {
        const repeatDisplay = alarm.repeatDays && alarm.repeatDays.length > 0
            ? alarm.repeatDays.map(d => {
                const dayMap = {'MONDAY':'ПН','TUESDAY':'ВТ','WEDNESDAY':'СР','THURSDAY':'ЧТ','FRIDAY':'ПТ','SATURDAY':'СБ','SUNDAY':'ВС'};
                return dayMap[d] || d;
            }).join(' ')
            : 'Каждый день';

        const intervalDisplay = (alarm.repeatIntervalHours > 0 || alarm.repeatIntervalMinutes > 0)
            ? `⏱️ каждые ${alarm.repeatIntervalHours > 0 ? alarm.repeatIntervalHours + 'ч ' : ''}${alarm.repeatIntervalMinutes > 0 ? alarm.repeatIntervalMinutes + 'м' : ''}`
            : '';

        return `
                            <div class="clock-alarm-item" style="display:flex; align-items:center; gap:8px; padding:6px 10px; background:rgba(255,255,255,0.03); border-radius:8px; border-left:3px solid ${alarm.enabled ? 'rgba(255,59,48,0.6)' : 'rgba(255,255,255,0.15)'};">
                                <span style="font-size:14px;">${alarm.enabled ? '🔔' : '🔕'}</span>
                                <div style="flex:1; min-width:0;">
                                    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                                        <span style="font-weight:500; font-size:13px;">${escapeHtml(alarm.name || 'Будильник')}</span>
                                        <span style="font-size:14px; font-family:monospace; color:${alarm.enabled ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)'};">${alarm.time || '--:--'}</span>
                                        <span style="font-size:10px; opacity:0.4; background:rgba(255,255,255,0.05); padding:1px 8px; border-radius:10px;">${repeatDisplay}</span>
                                        ${intervalDisplay ? `<span style="font-size:10px; opacity:0.4;">${intervalDisplay}</span>` : ''}
                                    </div>
                                </div>
                                <div style="display:flex; gap:4px;">
                                    <button class="clock-toggle-alarm" data-index="${index}" style="background:${alarm.enabled ? 'rgba(255,59,48,0.15)' : 'rgba(76,175,80,0.15)'}; border:none; color:${alarm.enabled ? 'rgba(255,59,48,0.8)' : 'rgba(76,175,80,0.8)'}; border-radius:4px; padding:2px 6px; cursor:pointer; font-size:11px;">
                                        ${alarm.enabled ? 'Выкл' : 'Вкл'}
                                    </button>
                                    <button class="clock-remove-alarm" data-index="${index}" style="background:rgba(244,67,54,0.15); border:none; color:rgba(244,67,54,0.5); border-radius:4px; padding:2px 6px; cursor:pointer; font-size:11px;">×</button>
                                </div>
                            </div>
                        `;
    }).join('')}
                    ${alarms.length === 0 ? `
                        <div style="text-align:center; opacity:0.3; padding:8px; font-size:12px;">
                            Нет будильников
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
    const numericId = getNumericId(moduleId);
    if (numericId === null) return;

    const formatSelect = settingsContainer.querySelector('.clock-format');
    if (formatSelect) {
        formatSelect.addEventListener('change', function() {
            updateClockSetting(numericId, 'format', this.value);
        });
    }

    const timezoneSelect = settingsContainer.querySelector('.clock-timezone');
    if (timezoneSelect) {
        timezoneSelect.addEventListener('change', function() {
            updateClockSetting(numericId, 'timezone', this.value);
        });
    }

    const secondsCheckbox = settingsContainer.querySelector('.clock-seconds');
    if (secondsCheckbox) {
        secondsCheckbox.addEventListener('change', function() {
            updateClockSetting(numericId, 'showSeconds', this.checked);
        });
    }

    const addFaceBtn = settingsContainer.querySelector('.clock-add-face-btn');
    if (addFaceBtn) {
        addFaceBtn.addEventListener('click', function() {
            showAddClockFaceModal(numericId);
        });
    }

    const removeFaceBtns = settingsContainer.querySelectorAll('.clock-remove-face');
    removeFaceBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const index = parseInt(this.dataset.index);
            removeClockFace(numericId, index);
        });
    });

    const addAlarmBtn = settingsContainer.querySelector('.clock-add-alarm-btn');
    if (addAlarmBtn) {
        addAlarmBtn.addEventListener('click', function() {
            showAddAlarmModal(numericId);
        });
    }

    const removeAlarmBtns = settingsContainer.querySelectorAll('.clock-remove-alarm');
    removeAlarmBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const index = parseInt(this.dataset.index);
            if (!isNaN(index)) {
                removeAlarm(numericId, index);
            }
        });
    });

    const toggleAlarmBtns = settingsContainer.querySelectorAll('.clock-toggle-alarm');
    toggleAlarmBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const index = parseInt(this.dataset.index);
            if (!isNaN(index)) {
                toggleAlarm(numericId, index);
            }
        });
    });
}

// ===== УДАЛЕНИЕ ЦИФЕРБЛАТА =====
async function removeClockFace(moduleId, index) {
    const numericId = getNumericId(moduleId);
    if (numericId === null) return;

    if (!confirm('Удалить этот циферблат?')) return;

    try {
        const response = await fetch(`/api/modules/${numericId}/action`, {
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

            const currentSettings = clockSettingsCache[numericId] || {};
            const showSeconds = currentSettings.showSeconds || false;

            if (data.content && data.content.clockData) {
                data.content.clockData.showSeconds = showSeconds;
                clockSettingsCache[numericId] = data.content.clockData;
            }

            const moduleElement = document.querySelector(`.widget[data-widget-id="${moduleId}"]`);
            if (moduleElement) {
                renderClockDisplay(moduleElement, data);

                const settingsDiv = moduleElement.querySelector('.module-settings');
                if (settingsDiv && settingsDiv.style.display !== 'none') {
                    await refreshSettingsDisplay(numericId, moduleElement);
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
    const numericId = getNumericId(moduleId);
    if (numericId === null) return;

    try {
        const response = await fetch(`/api/modules/${numericId}/action`, {
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
                clockSettingsCache[numericId] = data.content.clockData;
            }

            const moduleElement = document.querySelector(`.widget[data-widget-id="${moduleId}"]`);
            if (moduleElement) {
                renderClockDisplay(moduleElement, data);

                const settingsDiv = moduleElement.querySelector('.module-settings');
                if (settingsDiv && settingsDiv.style.display !== 'none') {
                    await refreshSettingsDisplay(numericId, moduleElement);
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
    const numericId = getNumericId(moduleId);
    if (numericId === null) return;

    try {
        const response = await fetch(`/api/modules/${numericId}/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'addFace',
                params: { name: name, timezone: timezone }
            })
        });

        if (response.ok) {
            const data = await response.json();

            const currentSettings = clockSettingsCache[numericId] || {};
            const showSeconds = currentSettings.showSeconds || false;

            if (data.content && data.content.clockData) {
                data.content.clockData.showSeconds = showSeconds;
                clockSettingsCache[numericId] = data.content.clockData;
            }

            const moduleElement = document.querySelector(`.widget[data-widget-id="${moduleId}"]`);
            if (moduleElement) {
                renderClockDisplay(moduleElement, data);

                const settingsDiv = moduleElement.querySelector('.module-settings');
                if (settingsDiv && settingsDiv.style.display !== 'none') {
                    await refreshSettingsDisplay(numericId, moduleElement);
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
    const numericId = getNumericId(moduleId);
    if (numericId === null) return;

    const existingOverlay = document.querySelector('.clock-modal-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }

    const overlay = document.createElement('div');
    overlay.className = 'clock-modal-overlay';
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
            <h3 style="margin:0; font-size:18px;">🌍 Добавить циферблат</h3>
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
                <button onclick="addClockFaceFromModal(${numericId})" 
                        style="flex:1; padding:10px; border-radius:8px; background:rgba(76,175,80,0.3); border:1px solid rgba(76,175,80,0.3); color:white; cursor:pointer;">
                    Добавить
                </button>
            </div>
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    setTimeout(() => {
        const nameInput = document.getElementById('clockFaceName');
        if (nameInput) nameInput.focus();
    }, 100);
}

function addClockFaceFromModal(moduleId) {
    const numericId = getNumericId(moduleId);
    if (numericId === null) return;

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

    addClockFace(numericId, name, timezone);
}

// ===== ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ ОБНОВЛЕНИЯ НАСТРОЕК =====
async function refreshSettingsDisplay(moduleId, moduleElement) {
    const numericId = getNumericId(moduleId);
    if (numericId === null) return;

    try {
        if (typeof window.loadModuleSettings === 'function') {
            await window.loadModuleSettings(moduleElement);
        } else {
            const response = await fetch(`/api/modules/${numericId}/settings`);
            if (!response.ok) return;

            const data = await response.json();
            const settingsDiv = moduleElement.querySelector('.module-settings');
            if (settingsDiv) {
                settingsDiv.innerHTML = renderClockSettings(data);
                initClockSettingsEvents(numericId, settingsDiv);
            }
        }

        const cachedSettings = window.widgetSettingsCache ? window.widgetSettingsCache[numericId] : {};
        const hideBackground = cachedSettings.hideBackground || false;
        const alignment = cachedSettings.alignment || 'center-center';

        if (typeof window.applyWidgetStyles === 'function') {
            window.applyWidgetStyles(numericId);
        }

        const settingsDiv = moduleElement.querySelector('.module-settings');
        if (settingsDiv) {
            const checkbox = settingsDiv.querySelector('.widget-setting-checkbox[data-setting="hideBackground"]');
            if (checkbox) {
                checkbox.checked = hideBackground;
            }

            const alignmentBtns = settingsDiv.querySelectorAll('.alignment-btn');
            alignmentBtns.forEach(btn => {
                const isActive = btn.dataset.alignment === alignment;
                btn.style.borderColor = isActive ? '#4CAF50' : 'rgba(255,255,255,0.08)';
                btn.style.background = isActive ? 'rgba(76,175,80,0.2)' : 'rgba(255,255,255,0.03)';
                btn.style.color = isActive ? '#81C784' : 'rgba(255,255,255,0.3)';
            });

            const label = settingsDiv.querySelector('.alignment-grid + div');
            if (label) {
                label.textContent = alignment.replace('-', ' → ');
            }
        }
    } catch (error) {

    }
}

// ===== ПРОВЕРКА БУДИЛЬНИКОВ =====
let alarmCheckInterval = null;

function startAlarmChecker(moduleId) {
    const numericId = getNumericId(moduleId);
    if (numericId === null) return;

    if (alarmCheckInterval) {
        clearInterval(alarmCheckInterval);
    }

    alarmCheckInterval = setInterval(() => {
        checkAlarms(numericId);
    }, 5000);
}

async function checkAlarms(moduleId) {
    const numericId = getNumericId(moduleId);
    if (numericId === null) return;

    try {
        const response = await fetch(`/api/modules/${numericId}/data`);
        if (!response.ok) return;

        const data = await response.json();
        const clockData = data.content?.clockData || {};
        const alarms = clockData.alarms || [];

        const now = new Date();
        const currentTime = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
        const currentDay = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][now.getDay()];

        alarms.forEach((alarm, index) => {
            if (!alarm.enabled) return;

            if (alarm.repeatDays && alarm.repeatDays.length > 0) {
                if (!alarm.repeatDays.includes(currentDay)) return;
            }

            if (alarm.time === currentTime) {
                const lastTriggered = localStorage.getItem(`alarm_${moduleId}_${alarm.id || index}_last`);
                const nowStr = now.toISOString().slice(0, 16);

                if (lastTriggered !== nowStr) {
                    localStorage.setItem(`alarm_${moduleId}_${alarm.id || index}_last`, nowStr);
                    triggerAlarm(moduleId, alarm, index);
                }
            }
        });
    } catch (error) {
    }
}

// ===== СРАБАТЫВАНИЕ БУДИЛЬНИКА =====
function triggerAlarm(moduleId, alarm, index) {
    const title = `🔔 ${alarm.name || 'Будильник'}`;
    const body = `Время: ${alarm.time}`;

    // 1. Браузерное уведомление
    if (Notification.permission === 'granted') {
        try {
            const notification = new Notification(title, {
                body: body,
                icon: '🔔',
                tag: `alarm_${moduleId}_${alarm.id || index}`,
                requireInteraction: true,
                silent: false
            });

            notification.onclick = function() {
                window.focus();
                this.close();
            };

            setTimeout(() => {
                notification.close();
            }, 30000);
        } catch (e) {
            console.error('Error showing notification:', e);
        }
    } else {
        showToast(`🔔 ${title} - ${body}`, 10000);
    }

    // 2. Toast на странице
    showToast(`🔔 ${title} - ${body}`, 10000);

    // 3. Звук
    try {
        let audioCtx = null;
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
        }

        if (audioCtx) {
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            gainNode.gain.value = 0.3;

            oscillator.start();

            let count = 0;
            const interval = setInterval(() => {
                if (count >= 3) {
                    clearInterval(interval);
                    try {
                        oscillator.stop();
                        audioCtx.close();
                    } catch (e) {
                        // Игнорируем ошибки закрытия
                    }
                    return;
                }
                gainNode.gain.value = gainNode.gain.value === 0.3 ? 0 : 0.3;
                count++;
            }, 300);

            setTimeout(() => {
                clearInterval(interval);
                try {
                    oscillator.stop();
                    audioCtx.close();
                } catch (e) {
                    // Игнорируем ошибки закрытия
                }
            }, 3000);
        }
    } catch (e) {
    }
}

// ===== МОДАЛЬНОЕ ОКНО ДОБАВЛЕНИЯ БУДИЛЬНИКА =====
function showAddAlarmModal(moduleId) {
    const numericId = getNumericId(moduleId);
    if (numericId === null) return;

    const existingOverlay = document.querySelector('.alarm-modal-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }

    const overlay = document.createElement('div');
    overlay.className = 'alarm-modal-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.7);
        backdrop-filter: blur(6px);
        z-index: 10001;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        overflow-y: auto;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
        background: rgba(30,30,50,0.95);
        backdrop-filter: blur(20px);
        border-radius: 16px;
        padding: 28px 24px;
        max-width: 480px;
        width: 100%;
        color: white;
        border: 1px solid rgba(255,255,255,0.06);
        max-height: 90vh;
        overflow-y: auto;
    `;

    modal.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <h3 style="margin:0; font-size:20px;">🔔 Добавить будильник</h3>
            <button onclick="this.closest('.alarm-modal-overlay').remove()" 
                    style="background:none; border:none; color:rgba(255,255,255,0.4); font-size:22px; cursor:pointer; padding:4px;">
                ✕
            </button>
        </div>

        <div style="display:flex; flex-direction:column; gap:16px;">
            <div>
                <label style="font-size:13px; font-weight:500; opacity:0.7; display:block; margin-bottom:6px;">
                    📝 Название
                </label>
                <input id="alarmName" type="text" placeholder="Например: Встреча" 
                       style="width:100%; padding:10px 14px; border-radius:8px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.08); color:white; font-size:14px;">
            </div>

            <div>
                <label style="font-size:13px; font-weight:500; opacity:0.7; display:block; margin-bottom:6px;">
                    ⏰ Время
                </label>
                <input id="alarmTime" type="time" value="08:00"
                       style="width:100%; padding:10px 14px; border-radius:8px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.08); color:white; font-size:14px;">
            </div>

            <div>
                <label style="font-size:13px; font-weight:500; opacity:0.7; display:block; margin-bottom:6px;">
                    📅 Дни повторения
                </label>
                <div style="display:flex; gap:6px; flex-wrap:wrap;">
                    <button class="alarm-day-btn" data-day="MONDAY" style="padding:4px 10px; border-radius:6px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); color:rgba(255,255,255,0.5); cursor:pointer; font-size:12px;">ПН</button>
                    <button class="alarm-day-btn" data-day="TUESDAY" style="padding:4px 10px; border-radius:6px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); color:rgba(255,255,255,0.5); cursor:pointer; font-size:12px;">ВТ</button>
                    <button class="alarm-day-btn" data-day="WEDNESDAY" style="padding:4px 10px; border-radius:6px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); color:rgba(255,255,255,0.5); cursor:pointer; font-size:12px;">СР</button>
                    <button class="alarm-day-btn" data-day="THURSDAY" style="padding:4px 10px; border-radius:6px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); color:rgba(255,255,255,0.5); cursor:pointer; font-size:12px;">ЧТ</button>
                    <button class="alarm-day-btn" data-day="FRIDAY" style="padding:4px 10px; border-radius:6px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); color:rgba(255,255,255,0.5); cursor:pointer; font-size:12px;">ПТ</button>
                    <button class="alarm-day-btn" data-day="SATURDAY" style="padding:4px 10px; border-radius:6px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); color:rgba(255,255,255,0.5); cursor:pointer; font-size:12px;">СБ</button>
                    <button class="alarm-day-btn" data-day="SUNDAY" style="padding:4px 10px; border-radius:6px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); color:rgba(255,255,255,0.5); cursor:pointer; font-size:12px;">ВС</button>
                </div>
                <div style="font-size:11px; opacity:0.3; margin-top:4px;">
                    👆 Нажмите на день для выбора (оставьте пустым для ежедневного)
                </div>
            </div>

            <div style="border-top:1px solid rgba(255,255,255,0.06); padding-top:12px;">
                <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                    <input type="checkbox" id="alarmIntervalRepeat" 
                           style="width:18px; height:18px; accent-color:#FF3B30; cursor:pointer;">
                    <span style="font-size:13px; font-weight:500; opacity:0.7;">🔄 Повторять в течение дня</span>
                </label>
                
                <div id="alarmIntervalSettings" style="display:none; margin-top:10px; padding:12px; background:rgba(255,255,255,0.03); border-radius:8px;">
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                        <div>
                            <label style="font-size:12px; opacity:0.5; display:block; margin-bottom:4px;">Часы</label>
                            <input id="alarmIntervalHours" type="number" value="0" min="0" max="23"
                                   style="width:100%; padding:8px 12px; border-radius:6px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.08); color:white; font-size:14px;">
                        </div>
                        <div>
                            <label style="font-size:12px; opacity:0.5; display:block; margin-bottom:4px;">Минуты</label>
                            <input id="alarmIntervalMinutes" type="number" value="0" min="0" max="59"
                                   style="width:100%; padding:8px 12px; border-radius:6px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.08); color:white; font-size:14px;">
                        </div>
                    </div>
                    <div style="font-size:11px; opacity:0.3; margin-top:6px;">
                        ⏱️ Будильник будет срабатывать через указанный интервал
                    </div>
                </div>
            </div>

            <div>
                <label style="font-size:13px; font-weight:500; opacity:0.7; display:block; margin-bottom:6px;">
                    🔊 Звук
                </label>
                <select id="alarmSound" style="width:100%; padding:10px 14px; border-radius:8px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.08); color:white; font-size:14px;">
                    <option value="">Стандартный (без звука)</option>
                    <option value="default">🔔 Стандартный</option>
                </select>
            </div>

            <div style="display:flex; gap:10px; margin-top:8px;">
                <button onclick="this.closest('.alarm-modal-overlay').remove()" 
                        style="flex:1; padding:12px; border-radius:10px; background:rgba(255,255,255,0.06); border:none; color:rgba(255,255,255,0.5); cursor:pointer; font-size:14px; font-weight:500;">
                    Отмена
                </button>
                <button onclick="addAlarmFromModal(${numericId})" 
                        style="flex:2; padding:12px; border-radius:10px; background:rgba(255,59,48,0.3); border:1px solid rgba(255,59,48,0.3); color:white; cursor:pointer; font-size:14px; font-weight:500;">
                    🔔 Добавить будильник
                </button>
            </div>
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    setTimeout(() => {
        const dayBtns = modal.querySelectorAll('.alarm-day-btn');
        dayBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                this.classList.toggle('selected');
                if (this.classList.contains('selected')) {
                    this.style.background = 'rgba(255,59,48,0.2)';
                    this.style.borderColor = 'rgba(255,59,48,0.4)';
                    this.style.color = 'rgba(255,255,255,0.9)';
                } else {
                    this.style.background = 'rgba(255,255,255,0.05)';
                    this.style.borderColor = 'rgba(255,255,255,0.08)';
                    this.style.color = 'rgba(255,255,255,0.5)';
                }
            });
        });

        const intervalCheckbox = modal.querySelector('#alarmIntervalRepeat');
        const intervalSettings = modal.querySelector('#alarmIntervalSettings');
        if (intervalCheckbox && intervalSettings) {
            intervalCheckbox.addEventListener('change', function() {
                intervalSettings.style.display = this.checked ? 'block' : 'none';
            });
        }

        const nameInput = modal.querySelector('#alarmName');
        if (nameInput) nameInput.focus();
    }, 100);
}

function addAlarmFromModal(moduleId) {
    const numericId = getNumericId(moduleId);
    if (numericId === null) return;

    const overlay = document.querySelector('.alarm-modal-overlay');

    const nameInput = document.getElementById('alarmName');
    const timeInput = document.getElementById('alarmTime');
    const dayBtns = document.querySelectorAll('.alarm-day-btn.selected');
    const intervalCheckbox = document.getElementById('alarmIntervalRepeat');
    const intervalHours = document.getElementById('alarmIntervalHours');
    const intervalMinutes = document.getElementById('alarmIntervalMinutes');
    const soundSelect = document.getElementById('alarmSound');

    const name = nameInput ? nameInput.value.trim() : '';
    const time = timeInput ? timeInput.value : '08:00';
    const repeatDays = Array.from(dayBtns).map(btn => btn.dataset.day);
    const isIntervalRepeat = intervalCheckbox ? intervalCheckbox.checked : false;
    const hours = intervalHours ? parseInt(intervalHours.value) || 0 : 0;
    const minutes = intervalMinutes ? parseInt(intervalMinutes.value) || 0 : 0;
    const sound = soundSelect ? soundSelect.value : '';

    if (!time) {
        showToast('❌ Выберите время');
        return;
    }

    if (isIntervalRepeat && hours === 0 && minutes === 0) {
        showToast('❌ Укажите интервал повторения');
        return;
    }

    const params = {
        name: name || 'Будильник',
        time: time,
        repeatDays: repeatDays,
        enabled: true,
        repeatIntervalHours: isIntervalRepeat ? hours : null,
        repeatIntervalMinutes: isIntervalRepeat ? minutes : null,
        sound: sound
    };

    addAlarm(numericId, params);

    if (overlay) overlay.remove();
}

// ===== ДОБАВЛЕНИЕ БУДИЛЬНИКА =====
async function addAlarm(moduleId, params) {
    const numericId = getNumericId(moduleId);
    if (numericId === null) return;

    try {
        const response = await fetch(`/api/modules/${numericId}/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'addAlarm',
                params: params
            })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.content && data.content.clockData) {
                clockSettingsCache[numericId] = data.content.clockData;
            }
            clockCache[numericId] = data;

            const moduleElement = document.querySelector(`.widget[data-widget-id="${moduleId}"]`);
            if (moduleElement) {
                renderClockDisplay(moduleElement, data);

                const settingsDiv = moduleElement.querySelector('.module-settings');
                if (settingsDiv && settingsDiv.style.display !== 'none') {
                    await refreshSettingsDisplay(numericId, moduleElement);
                }
            }
            showToast('✅ Будильник добавлен');
        } else {
            const error = await response.text();
            showToast('❌ Ошибка: ' + error);
        }
    } catch (error) {
        console.error('Error adding alarm:', error);
        showToast('❌ Ошибка добавления будильника');
    }
}

// ===== УДАЛЕНИЕ БУДИЛЬНИКА =====
async function removeAlarm(moduleId, index) {
    const numericId = getNumericId(moduleId);
    if (numericId === null) return;

    if (!confirm('Удалить этот будильник?')) return;

    try {
        const response = await fetch(`/api/modules/${numericId}/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'removeAlarm',
                params: { index: index }
            })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.content && data.content.clockData) {
                clockSettingsCache[numericId] = data.content.clockData;
            }
            clockCache[numericId] = data;

            const currentHideBackground = window.widgetSettingsCache?.[numericId]?.hideBackground || false;
            const currentAlignment = window.widgetSettingsCache?.[numericId]?.alignment || 'center-center';

            const moduleElement = document.querySelector(`.widget[data-widget-id="${moduleId}"]`);
            if (moduleElement) {
                renderClockDisplay(moduleElement, data);

                const settingsDiv = moduleElement.querySelector('.module-settings');
                if (settingsDiv && settingsDiv.style.display !== 'none') {
                    await refreshSettingsDisplay(numericId, moduleElement);
                }

                if (typeof window.applyWidgetStyles === 'function') {
                    if (!window.widgetSettingsCache[numericId]) {
                        window.widgetSettingsCache[numericId] = {};
                    }
                    window.widgetSettingsCache[numericId].hideBackground = currentHideBackground;
                    window.widgetSettingsCache[numericId].alignment = currentAlignment;
                    window.applyWidgetStyles(numericId);
                }
            }
            showToast('✅ Будильник удален');
        }
    } catch (error) {
        console.error('Error removing alarm:', error);
        showToast('❌ Ошибка удаления будильника');
    }
}

// ===== ПЕРЕКЛЮЧЕНИЕ БУДИЛЬНИКА =====
async function toggleAlarm(moduleId, index) {
    const numericId = getNumericId(moduleId);
    if (numericId === null) return;

    try {
        const response = await fetch(`/api/modules/${numericId}/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'toggleAlarm',
                params: { index: index }
            })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.content && data.content.clockData) {
                clockSettingsCache[numericId] = data.content.clockData;
            }
            clockCache[numericId] = data;

            const currentHideBackground = window.widgetSettingsCache?.[numericId]?.hideBackground || false;
            const currentAlignment = window.widgetSettingsCache?.[numericId]?.alignment || 'center-center';

            const moduleElement = document.querySelector(`.widget[data-widget-id="${moduleId}"]`);
            if (moduleElement) {
                renderClockDisplay(moduleElement, data);

                const settingsDiv = moduleElement.querySelector('.module-settings');
                if (settingsDiv && settingsDiv.style.display !== 'none') {
                    await refreshSettingsDisplay(numericId, moduleElement);
                }

                if (typeof window.applyWidgetStyles === 'function') {
                    if (!window.widgetSettingsCache[numericId]) {
                        window.widgetSettingsCache[numericId] = {};
                    }
                    window.widgetSettingsCache[numericId].hideBackground = currentHideBackground;
                    window.widgetSettingsCache[numericId].alignment = currentAlignment;
                    window.applyWidgetStyles(numericId);
                }
            }
        }
    } catch (error) {
        console.error('Error toggling alarm:', error);
        showToast('❌ Ошибка переключения будильника');
    }
}

// ============================================================
// PUSH УВЕДОМЛЕНИЯ
// ============================================================

// ===== ИСПРАВЛЕННАЯ ВЕРСИЯ initPushNotifications =====
async function initPushNotifications() {
    if (!('serviceWorker' in navigator)) {
        return;
    }

    try {
        const registration = await navigator.serviceWorker.ready;

        if (Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                return;
            }
        }

        if (Notification.permission !== 'granted') {
            return;
        }

        let subscription = await registration.pushManager.getSubscription();

        if (subscription) {
            // Проверяем валидность токена через сервер
            try {
                const testResponse = await fetch('/api/push/test', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: '🔍 Проверка токена' })
                });

                if (!testResponse.ok) {
                    // Если сервер вернул ошибку - токен невалидный
                    await subscription.unsubscribe();
                    subscription = null;
                } else {
                    // Отправляем существующую подписку на сервер
                    await sendSubscriptionToServer(subscription);
                    return;
                }
            } catch (e) {
                await subscription.unsubscribe();
                subscription = null;
            }
        }

        // Если нет подписки или она была удалена - создаем новую
        const response = await fetch('/api/push/public-key');
        if (!response.ok) {
            return;
        }

        const data = await response.json();
        const publicKey = data.publicKey;

        if (!publicKey || publicKey === '') {
            return;
        }

        const applicationServerKey = urlBase64ToUint8Array(publicKey);

        subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey
        });

        await sendSubscriptionToServer(subscription);

    } catch (error) {

    }
}

async function sendSubscriptionToServer(subscription) {
    try {
        const response = await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                endpoint: subscription.endpoint,
                keys: subscription.toJSON().keys
            })
        });

        if (response.ok) {
            const debugResponse = await fetch('/api/push/debug');
            const debugData = await debugResponse.json();
        } else {
            const text = await response.text();
        }
    } catch (error) {

    }
}

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

// ===== ЭКСПОРТ =====
window.initClockModule = initClockModule;
window.renderClockSettings = renderClockSettings;
window.initClockSettingsEvents = initClockSettingsEvents;
window.showAddAlarmModal = showAddAlarmModal;
window.addAlarmFromModal = addAlarmFromModal;
window.addAlarm = addAlarm;
window.removeAlarm = removeAlarm;
window.toggleAlarm = toggleAlarm;
window.showAddClockFaceModal = showAddClockFaceModal;
window.addClockFaceFromModal = addClockFaceFromModal;
window.addClockFace = addClockFace;
window.removeClockFace = removeClockFace;
window.updateClockSetting = updateClockSetting;
window.loadClockData = loadClockData;
window.renderClockDisplay = renderClockDisplay;
window.startClockUpdater = startClockUpdater;
window.updateClockTime = updateClockTime;
window.startAlarmChecker = startAlarmChecker;
window.checkAlarms = checkAlarms;
window.triggerAlarm = triggerAlarm;
window.initPushNotifications = initPushNotifications;
window.sendSubscriptionToServer = sendSubscriptionToServer;

// ===== АВТОЗАПУСК =====
if (document.readyState === 'complete') {
    setTimeout(initPushNotifications, 2000);
} else {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(initPushNotifications, 2000);
    });
}