/**
 * NOTES-MODULE.JS - Логика модуля заметок
 * v2: заметки в БД, поддержка привязки к календарю
 */

// ===== СОСТОЯНИЕ =====
const notesCache = {};              // moduleId → { text, linkedToCalendar, calendarModuleId }
const notesSaveTimers = {};         // moduleId → timeout id (для debounce)
const NOTES_SAVE_DEBOUNCE_MS = 1500;

// ===== ИНИЦИАЛИЗАЦИЯ =====
async function initNotesModule(moduleElement, moduleId) {
    const numericId = parseInt(moduleId);
    if (isNaN(numericId)) return;

    // Загружаем настройки модуля, чтобы понять — связан с календарём или нет
    let linkedToCalendar = false;
    let calendarModuleId = null;

    try {
        const settingsResp = await fetch(`/api/modules/${numericId}/settings`);
        if (settingsResp.ok) {
            const data = await settingsResp.json();
            const content = data.content || {};
            // linkedToCalendar может лежать в noteData (специфичные) или в settings (общие)
            const noteData = content.noteData || {};
            linkedToCalendar = noteData.linkedToCalendar === true;
            calendarModuleId = noteData.calendarModuleId ? String(noteData.calendarModuleId) : null;
        }
    } catch (e) {
        console.warn('[Notes] Не удалось загрузить настройки', e);
    }

    // Если связан с календарём, но не знает, с каким — ищем CALENDAR на странице
    if (linkedToCalendar && !calendarModuleId) {
        const calendarWidget = document.querySelector('.widget[data-widget-type="CALENDAR"]');
        if (calendarWidget) {
            calendarModuleId = calendarWidget.dataset.widgetId;
        } else {
            // Связка есть, а календаря нет — отключаем связку
            console.warn('[Notes] linkedToCalendar=true, но CALENDAR на странице не найден');
            linkedToCalendar = false;
        }
    }

    notesCache[numericId] = {
        linkedToCalendar,
        calendarModuleId,
        currentDate: getTodayISO(),
        text: ''
    };

    // ===== ЗАГРУЗКА =====
    if (linkedToCalendar && calendarModuleId) {
        // Связан с календарём — грузим заметку на сегодня
        await loadCalendarNote(moduleElement, numericId, calendarModuleId, getTodayISO());
    } else {
        // Постоянная заметка
        await loadStandaloneNote(moduleElement, numericId);
    }

    // ===== СОБЫТИЯ =====
    const textarea = moduleElement.querySelector('.note-textarea');
    if (textarea) {
        textarea.addEventListener('input', () => {
            onNoteInput(numericId, textarea.value);
        });
    }

    // Подписка на выбор даты в календаре
    if (linkedToCalendar) {
        window.addEventListener('calendar:date-selected', (e) => {
            const detail = e.detail || {};
            if (detail.calendarModuleId && String(detail.calendarModuleId) === String(calendarModuleId)) {
                onCalendarDateSelected(moduleElement, numericId, calendarModuleId, detail.date);
            }
        });
    }
}

// ===== ЗАГРУЗКА ПОСТОЯННОЙ ЗАМЕТКИ =====
async function loadStandaloneNote(moduleElement, moduleId) {
    try {
        const response = await fetch(`/api/notes/${moduleId}`);
        if (response.ok) {
            const data = await response.json();
            const text = data.text || '';
            notesCache[moduleId].text = text;
            renderNoteText(moduleElement, text);
        }
    } catch (e) {
        console.warn('[Notes] Ошибка загрузки постоянной заметки', e);
    }
}

// ===== ЗАГРУЗКА ЗАМЕТКИ НА ДАТУ =====
async function loadCalendarNote(moduleElement, moduleId, calendarModuleId, date) {
    try {
        const response = await fetch(`/api/calendar-notes/${calendarModuleId}/${date}`);
        if (response.ok) {
            const data = await response.json();
            const text = data.text || '';
            notesCache[moduleId].text = text;
            notesCache[moduleId].currentDate = date;
            renderNoteText(moduleElement, text);
            renderNoteDate(moduleElement, date);
        }
    } catch (e) {
        console.warn('[Notes] Ошибка загрузки заметки на дату', e);
    }
}

// ===== РЕНДЕР ТЕКСТА =====
function renderNoteText(moduleElement, text) {
    const textarea = moduleElement.querySelector('.note-textarea');
    if (textarea) {
        textarea.value = text || '';
    }
}

// ===== РЕНДЕР ДАТЫ В ЗАГОЛОВКЕ =====
function renderNoteDate(moduleElement, date) {
    const dateLabel = moduleElement.querySelector('.note-date-label');
    if (dateLabel) {
        dateLabel.textContent = formatDateHuman(date);
    }
}

// ===== ОБРАБОТКА ВВОДА (DEBOUNCE) =====
function onNoteInput(moduleId, value) {
    if (!notesCache[moduleId]) return;
    notesCache[moduleId].text = value;

    if (notesSaveTimers[moduleId]) {
        clearTimeout(notesSaveTimers[moduleId]);
    }

    notesSaveTimers[moduleId] = setTimeout(() => {
        saveNoteToServer(moduleId);
    }, NOTES_SAVE_DEBOUNCE_MS);
}

// ===== СОХРАНЕНИЕ НА СЕРВЕР =====
async function saveNoteToServer(moduleId) {
    const cache = notesCache[moduleId];
    if (!cache) return;

    try {
        let response;
        if (cache.linkedToCalendar && cache.calendarModuleId) {
            response = await fetch(`/api/calendar-notes/${cache.calendarModuleId}/${cache.currentDate}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: cache.text })
            });

            if (response.ok) {
                // Уведомляем CALENDAR, чтобы обновил подсветку
                window.dispatchEvent(new CustomEvent('calendar:note-saved', {
                    detail: {
                        calendarModuleId: cache.calendarModuleId,
                        date: cache.currentDate
                    }
                }));
            }
        } else {
            response = await fetch(`/api/notes/${moduleId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: cache.text })
            });
        }

        if (response.ok) {
            // Обновляем индикатор ❗ если это сегодня
            const todayISO = getTodayISO();
            if (cache.linkedToCalendar && cache.calendarModuleId && cache.currentDate === todayISO) {
                // Тихо перезапрашиваем /api/pages
                fetch('/api/pages').then(r => r.json()).then(pages => {
                    if (typeof updateNoteIndicators === 'function') {
                        updateNoteIndicators(pages);
                    }
                }).catch(() => {});
            }

            window.dispatchEvent(new CustomEvent('calendar:note-saved', {
                detail: { calendarModuleId: cache.calendarModuleId, date: cache.currentDate }
            }));
        }
    } catch (e) {
        console.warn('[Notes] Ошибка сохранения', e);
    }
}

// ===== СОБЫТИЕ ОТ КАЛЕНДАРЯ: ВЫБРАНА ДАТА =====
async function onCalendarDateSelected(moduleElement, moduleId, calendarModuleId, date) {
    if (!date) return;

    // Сохраняем текущее перед переключением
    if (notesSaveTimers[moduleId]) {
        clearTimeout(notesSaveTimers[moduleId]);
        delete notesSaveTimers[moduleId];
    }
    await saveNoteToServer(moduleId);

    // Загружаем новую
    await loadCalendarNote(moduleElement, moduleId, calendarModuleId, date);
}

// ===== УТИЛИТЫ =====
function getTodayISO() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function formatDateHuman(isoDate) {
    if (!isoDate) return '';
    const [y, m, d] = isoDate.split('-').map(Number);
    const months = [
        'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
        'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];
    return `${d} ${months[m - 1]} ${y}`;
}

function renderNotesSettings(data) {
    const content = data.content || {};
    const noteData = content.noteData || {};
    const linkedToCalendar = noteData.linkedToCalendar === true;
    const calendarModuleId = noteData.calendarModuleId || '';

    // Находим все CALENDAR на странице
    const calendarWidgets = [...document.querySelectorAll('.widget[data-widget-type="CALENDAR"]')];
    const hasCalendar = calendarWidgets.length > 0;

    let calendarSelectHtml = '';
    if (hasCalendar) {
        calendarSelectHtml = `
            <div class="notes-calendar-select-wrapper" style="${linkedToCalendar ? '' : 'display:none;'} margin-top:10px; padding-left:36px;">
                <label style="font-size:11px; opacity:0.5; display:block; margin-bottom:4px;">Какой календарь?</label>
                <select class="notes-calendar-select" style="width:100%; padding:6px 10px; border-radius:6px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.08); color:white; font-size:12px;">
                    ${calendarWidgets.map(w => {
            const id = w.dataset.widgetId;
            const title = w.querySelector('.widget-title')?.textContent?.trim() || ('Календарь #' + id);
            const selected = String(id) === String(calendarModuleId) ? 'selected' : '';
            return `<option value="${id}" ${selected}>${escapeHtml(title)}</option>`;
        }).join('')}
                </select>
            </div>
        `;
    } else {
        calendarSelectHtml = `
            <div style="margin-top:10px; padding-left:36px; font-size:11px; color:#ff6b6b; opacity:0.8;">
                ⚠️ На странице нет календаря. Добавьте виджет CALENDAR, чтобы включить связку.
            </div>
        `;
    }

    return `
        <div class="notes-settings-container" style="display:flex; flex-direction:column; gap:12px;">
            <label style="display:flex; align-items:center; gap:10px; cursor:pointer; padding:8px; border-radius:8px; transition:background 0.2s;"
                   onmouseover="this.style.background='rgba(255,255,255,0.04)'"
                   onmouseout="this.style.background='transparent'">
                <input type="checkbox" class="notes-linked-checkbox" 
                       ${linkedToCalendar ? 'checked' : ''}
                       ${hasCalendar ? '' : 'disabled'}
                       style="accent-color:#4CAF50; width:18px; height:18px; cursor:${hasCalendar ? 'pointer' : 'not-allowed'};">
                <span style="font-size:13px; color:rgba(255,255,255,0.8);">🔗 Связать с календарём</span>
            </label>
            <div style="font-size:11px; opacity:0.4; padding-left:36px; margin-top:-6px;">
                Заметки будут привязаны к выбранной дате в календаре.
            </div>
            ${calendarSelectHtml}
        </div>
    `;
}

function initNotesSettingsEvents(moduleId, settingsContainer) {
    const checkbox = settingsContainer.querySelector('.notes-linked-checkbox');
    const select = settingsContainer.querySelector('.notes-calendar-select');
    const selectWrapper = settingsContainer.querySelector('.notes-calendar-select-wrapper');

    if (checkbox) {
        checkbox.addEventListener('change', async function() {
            const enabled = this.checked;

            // Если включаем — надо выбрать календарь
            if (enabled && select && !select.value) {
                showToast('❌ На странице нет календаря');
                this.checked = false;
                return;
            }

            // Показываем/скрываем селект
            if (selectWrapper) {
                selectWrapper.style.display = enabled ? 'block' : 'none';
            }

            // Сохраняем linkedToCalendar
            await updateNoteSetting(moduleId, 'linkedToCalendar', enabled);

            // Если включили — сохраняем выбранный календарь
            if (enabled && select && select.value) {
                await updateNoteSetting(moduleId, 'calendarModuleId', select.value);
            }

            // Перезагружаем виджет NOTES
            await reloadNotesWidget(moduleId);
        });
    }

    if (select) {
        select.addEventListener('change', async function() {
            await updateNoteSetting(moduleId, 'calendarModuleId', this.value);
            await reloadNotesWidget(moduleId);
        });
    }
}

async function updateNoteSetting(moduleId, key, value) {
    try {
        const params = {};
        params[key] = value;

        const response = await fetch(`/api/modules/${moduleId}/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'updateSettings', params })
        });

        return response.ok;
    } catch (e) {
        return false;
    }
}

async function reloadNotesWidget(moduleId) {
    const widgetEl = document.querySelector(`.widget[data-widget-id="${moduleId}"]`);
    if (!widgetEl) return;

    // Перезагружаем через initNotesModule — он заново прочитает настройки
    if (typeof initNotesModule === 'function') {
        await initNotesModule(widgetEl, moduleId);
    }
}

// ===== ЭКСПОРТЫ =====
window.renderNotesSettings = renderNotesSettings;
window.initNotesSettingsEvents = initNotesSettingsEvents;
window.initNotesModule = initNotesModule;
window.loadStandaloneNote = loadStandaloneNote;
window.loadCalendarNote = loadCalendarNote;
window.saveNoteToServer = saveNoteToServer;