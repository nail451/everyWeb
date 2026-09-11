/**
 * CALENDAR-MODULE.JS - Логика виджета календаря
 * Этап 2: базовый рендер сетки месяца с навигацией
 */

const calendarState = {};  // moduleId → { year, month }

const MONTH_NAMES = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const WEEKDAY_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

// ===== ИНИЦИАЛИЗАЦИЯ =====
async function initCalendarModule(moduleElement, moduleId) {
    const numericId = parseInt(moduleId);
    if (isNaN(numericId)) return;

    const today = new Date();
    calendarState[numericId] = {
        year: today.getFullYear(),
        month: today.getMonth(),
        linkedToNotes: false,
        showProductionCalendar: false,
        datesWithNotes: new Set(),
        productionDays: {},
        selectedDate: null
    };

    // Загружаем настройки (linkedToNotes)
    await loadCalendarSettings(moduleElement, numericId);

    // Рендерим
    await refreshCalendarWithNotes(moduleElement, numericId);

    // Если linkedToNotes — сразу выбираем сегодня
    if (calendarState[numericId].linkedToNotes) {
        const todayISO = toISO(new Date());
        calendarState[numericId].selectedDate = todayISO;

        // Небольшая задержка, чтобы NOTES успел подписаться
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('calendar:date-selected', {
                detail: {
                    calendarModuleId: numericId,
                    date: todayISO
                }
            }));
        }, 200);
    }

    // Подписки на события
    if (calendarState[numericId].linkedToNotes) {
        // После сохранения заметки — обновить подсветку
        window.addEventListener('calendar:note-saved', (e) => {
            const detail = e.detail || {};
            if (String(detail.calendarModuleId) === String(numericId)) {
                refreshDatesWithNotes(moduleElement, numericId);
            }
        });
    }
}

async function loadCalendarSettings(moduleElement, moduleId) {
    try {
        const response = await fetch(`/api/modules/${moduleId}/settings`);
        if (response.ok) {
            const data = await response.json();
            const content = data.content || {};
            const calendarData = content.calendarData || {};
            calendarState[moduleId].linkedToNotes = calendarData.linkedToNotes === true;
            calendarState[moduleId].showProductionCalendar = calendarData.showProductionCalendar === true;
        }
    } catch (e) {
        console.warn('[Calendar] Ошибка загрузки настроек', e);
    }
}

async function refreshProductionDays(moduleElement, moduleId) {
    const state = calendarState[moduleId];
    console.log('[Calendar] refreshProductionDays called, showProd =', state?.showProductionCalendar, 'year =', state?.year, 'month =', state?.month);
    if (!state || !state.showProductionCalendar) return;

    const firstDay = new Date(state.year, state.month, 1);
    const lastDay = new Date(state.year, state.month + 1, 0);

    const from = new Date(firstDay);
    from.setDate(from.getDate() - 7);
    const to = new Date(lastDay);
    to.setDate(to.getDate() + 7);

    try {
        const response = await fetch(`/api/calendar/production?from=${toISO(from)}&to=${toISO(to)}`);
        if (response.ok) {
            const data = await response.json();
            state.productionDays = data.days || {};
        }
    } catch (e) {
        console.warn('[Calendar] Ошибка загрузки производственных дней', e);
    }
}

async function refreshCalendarWithNotes(moduleElement, moduleId) {
    const state = calendarState[moduleId];
    if (!state) return;

    if (state.linkedToNotes) {
        await refreshDatesWithNotes(moduleElement, moduleId);
    }
    if (state.showProductionCalendar) {
        await refreshProductionDays(moduleElement, moduleId);
    }

    renderCalendar(moduleElement, moduleId);
    bindCalendarEvents(moduleElement, moduleId);
}

async function refreshDatesWithNotes(moduleElement, moduleId) {
    const state = calendarState[moduleId];
    if (!state || !state.linkedToNotes) return;

    // Запрашиваем даты в диапазоне отображения (может захватывать соседние месяцы)
    const firstDay = new Date(state.year, state.month, 1);
    const lastDay = new Date(state.year, state.month + 1, 0);

    // Расширяем на ±7 дней — покрываем ячейки соседних месяцев
    const from = new Date(firstDay);
    from.setDate(from.getDate() - 7);
    const to = new Date(lastDay);
    to.setDate(to.getDate() + 7);

    const fromStr = toISO(from);
    const toStr = toISO(to);

    try {
        const response = await fetch(`/api/calendar-notes/${moduleId}/dates?from=${fromStr}&to=${toStr}`);
        if (response.ok) {
            const data = await response.json();
            state.datesWithNotes = new Set(data.dates || []);
        }
    } catch (e) {
        console.warn('[Calendar] Ошибка загрузки дат с заметками', e);
    }
}

function toISO(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// ===== РЕНДЕР СЕТКИ =====
function renderCalendar(moduleElement, moduleId) {
    const state = calendarState[moduleId];
    if (!state) return;

    const container = moduleElement.querySelector('.calendar-container');
    if (!container) return;

    const { year, month } = state;
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

    // Заголовок
    const headerHtml = `
        <div class="calendar-header">
            <button class="calendar-nav calendar-prev" data-module="${moduleId}" title="Предыдущий месяц">◀</button>
            <div class="calendar-title">${MONTH_NAMES[month]} ${year}</div>
            <button class="calendar-nav calendar-next" data-module="${moduleId}" title="Следующий месяц">▶</button>
        </div>
    `;

    // Дни недели
    const weekdaysHtml = `
        <div class="calendar-weekdays">
            ${WEEKDAY_SHORT.map(d => `<div class="calendar-weekday">${d}</div>`).join('')}
        </div>
    `;

    // Дни месяца
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();

    // Понедельник = 0, воскресенье = 6
    let startWeekday = firstDayOfMonth.getDay() - 1;
    if (startWeekday < 0) startWeekday = 6;

    // Дни предыдущего месяца
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const cells = [];

    for (let i = startWeekday - 1; i >= 0; i--) {
        cells.push({
            day: prevMonthLastDay - i,
            month: 'prev',
            isToday: false
        });
    }

    // Дни текущего месяца
    for (let d = 1; d <= daysInMonth; d++) {
        const isToday = isCurrentMonth && d === today.getDate();
        const dateObj = new Date(year, month, d);
        const weekday = dateObj.getDay(); // 0 = воскресенье, 6 = суббота
        const isWeekend = weekday === 0 || weekday === 6;

        cells.push({
            day: d,
            month: 'current',
            isToday,
            isWeekend,
            isoDate: formatISODate(year, month + 1, d)
        });
    }

    // Дни следующего месяца — добиваем до 42 ячеек (6 недель)
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
        cells.push({
            day: d,
            month: 'next',
            isToday: false
        });
    }

    const daysHtml = `
    <div class="calendar-days">
        ${cells.map(cell => {
        const classes = ['calendar-day'];
        if (cell.month === 'prev' || cell.month === 'next') {
            classes.push('calendar-day-other');
        }
        if (cell.isWeekend) {
            classes.push('calendar-day-weekend');
        }
        if (cell.isToday) {
            classes.push('calendar-day-today');
        }

        // Подсветка дней с заметками
        const state = calendarState[moduleId];
        if (state && state.linkedToNotes && cell.isoDate && state.datesWithNotes.has(cell.isoDate)) {
            classes.push('calendar-day-has-note');
        }

        // Подсветка выбранного дня
        if (state && state.selectedDate && cell.isoDate === state.selectedDate) {
            classes.push('calendar-day-selected');
        }

        // Производственный календарь
        if (state && state.showProductionCalendar && cell.isoDate) {
            const prodType = state.productionDays[cell.isoDate];
            if (prodType === 'HOLIDAY') {
                classes.push('calendar-day-holiday');
            } else if (prodType === 'SHORTENED') {
                classes.push('calendar-day-shortened');
            }
        }

        const dataAttr = cell.isoDate ? `data-date="${cell.isoDate}"` : '';
        return `<div class="${classes.join(' ')}" ${dataAttr}>${cell.day}</div>`;
    }).join('')}
    </div>
`;

    container.innerHTML = headerHtml + weekdaysHtml + daysHtml;
}

// ===== ПРИВЯЗКА СОБЫТИЙ =====
function bindCalendarEvents(moduleElement, moduleId) {
    const container = moduleElement.querySelector('.calendar-container');
    if (!container) return;

    const prevBtn = container.querySelector('.calendar-prev');
    const nextBtn = container.querySelector('.calendar-next');

    if (prevBtn) {
        prevBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await changeMonth(moduleElement, moduleId, -1);
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await changeMonth(moduleElement, moduleId, 1);
        });
    }

    // Клик по дню (только если linkedToNotes)
    if (calendarState[moduleId].linkedToNotes) {
        const days = container.querySelectorAll('.calendar-day[data-date]');
        days.forEach(dayEl => {
            dayEl.style.cursor = 'pointer';
            dayEl.addEventListener('click', (e) => {
                e.stopPropagation();
                const date = dayEl.dataset.date;
                if (date) {
                    selectCalendarDate(moduleElement, moduleId, date);
                }
            });
        });
    }
}

function selectCalendarDate(moduleElement, moduleId, date) {
    const state = calendarState[moduleId];
    if (!state) return;

    state.selectedDate = date;

    // Перерисовываем календарь, чтобы выделить день
    renderCalendar(moduleElement, moduleId);
    bindCalendarEvents(moduleElement, moduleId);

    // Отправляем событие в window — NOTES подхватит
    window.dispatchEvent(new CustomEvent('calendar:date-selected', {
        detail: {
            calendarModuleId: moduleId,
            date: date
        }
    }));
}

// ===== СМЕНА МЕСЯЦА =====
async function changeMonth(moduleElement, moduleId, delta) {
    const state = calendarState[moduleId];
    if (!state) return;

    let newMonth = state.month + delta;
    let newYear = state.year;

    if (newMonth < 0) {
        newMonth = 11;
        newYear--;
    } else if (newMonth > 11) {
        newMonth = 0;
        newYear++;
    }

    state.month = newMonth;
    state.year = newYear;

    renderCalendar(moduleElement, moduleId);
    bindCalendarEvents(moduleElement, moduleId);

    await refreshCalendarWithNotes(moduleElement, moduleId);
}

// ===== УТИЛИТЫ =====
function formatISODate(year, month, day) {
    const m = String(month).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
}

function renderCalendarSettings(data) {
    const content = data.content || {};
    const calendarData = content.calendarData || {};
    const linkedToNotes = calendarData.linkedToNotes === true;
    const showProduction = calendarData.showProductionCalendar === true;

    return `
        <div class="calendar-settings-container" style="display:flex; flex-direction:column; gap:12px;">
            <label style="display:flex; align-items:center; gap:10px; cursor:pointer; padding:8px; border-radius:8px; transition:background 0.2s;"
                   onmouseover="this.style.background='rgba(255,255,255,0.04)'"
                   onmouseout="this.style.background='transparent'">
                <input type="checkbox" class="calendar-linked-checkbox" 
                       ${linkedToNotes ? 'checked' : ''}
                       style="accent-color:#4CAF50; width:18px; height:18px; cursor:pointer;">
                <span style="font-size:13px; color:rgba(255,255,255,0.8);">🔗 Связать с заметками</span>
            </label>
            <div style="font-size:11px; opacity:0.4; padding-left:36px; margin-top:-6px;">
                Дни с заметками будут подсвечиваться. Клик по дню переключит заметки.
            </div>

            <label style="display:flex; align-items:center; gap:10px; cursor:pointer; padding:8px; border-radius:8px; transition:background 0.2s;"
                   onmouseover="this.style.background='rgba(255,255,255,0.04)'"
                   onmouseout="this.style.background='transparent'">
                <input type="checkbox" class="calendar-production-checkbox" 
                       ${showProduction ? 'checked' : ''}
                       style="accent-color:#4CAF50; width:18px; height:18px; cursor:pointer;">
                <span style="font-size:13px; color:rgba(255,255,255,0.8);">🇷🇺 Производственный календарь</span>
            </label>
            <div style="font-size:11px; opacity:0.4; padding-left:36px; margin-top:-6px;">
                Подсвечивает выходные, праздники и сокращённые дни.
            </div>
        </div>
    `;
}

function initCalendarSettingsEvents(moduleId, settingsContainer) {
    const checkbox = settingsContainer.querySelector('.calendar-linked-checkbox');
    const prodCheckbox = settingsContainer.querySelector('.calendar-production-checkbox');

    if (checkbox) {
        checkbox.addEventListener('change', async function() {
            await updateCalendarSetting(moduleId, 'linkedToNotes', this.checked);
        });
    }
    if (prodCheckbox) {
        prodCheckbox.addEventListener('change', async function() {
            await updateCalendarSetting(moduleId, 'showProductionCalendar', this.checked);
        });
    }
}

async function updateCalendarSetting(moduleId, key, value) {
    try {
        const params = {};
        params[key] = value;

        const response = await fetch(`/api/modules/${moduleId}/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'updateSettings', params })
        });

        if (response.ok) {
            // Обновляем state
            if (key === 'linkedToNotes' && calendarState[moduleId]) {
                calendarState[moduleId].linkedToNotes = value === true;
            }
            if (key === 'showProductionCalendar' && calendarState[moduleId]) {
                calendarState[moduleId].showProductionCalendar = value === true;
            }

            // Перерисовываем календарь
            const widgetEl = document.querySelector(`.widget[data-widget-id="${moduleId}"]`);
            if (widgetEl) {
                await refreshCalendarWithNotes(widgetEl, moduleId);
            }

            showToast('✅ Настройка сохранена');
        } else {
            showToast('❌ Ошибка сохранения');
        }
    } catch (e) {
        showToast('❌ Ошибка сохранения');
    }
}

// ===== ЭКСПОРТЫ =====
window.renderCalendarSettings = renderCalendarSettings;
window.initCalendarSettingsEvents = initCalendarSettingsEvents;
window.updateCalendarSetting = updateCalendarSetting;
window.initCalendarModule = initCalendarModule;
window.renderCalendar = renderCalendar;
window.refreshCalendarWithNotes = refreshCalendarWithNotes;
window.refreshDatesWithNotes = refreshDatesWithNotes;