/**
 * MODULES.JS - Управление модулями
 */

function initModules() {
    renderModules();
}

// ===== РЕНДЕРИНГ МОДУЛЕЙ =====
function renderModules() {
    const leftColumn = document.getElementById('modulesLeft');
    const rightColumn = document.getElementById('modulesRight');
    const modulesContainer = document.getElementById('modulesContainer');

    if (!leftColumn || !rightColumn) {
        return;
    }

    // Очищаем колонки
    leftColumn.innerHTML = '';
    rightColumn.innerHTML = '';

    // Добавляем лейблы
    leftColumn.innerHTML = `<div class="section-label">Модули</div>`;
    rightColumn.innerHTML = `<div class="section-label">Модули</div>`;

    if (!modulesContainer) {
        leftColumn.innerHTML += `
            <button class="add-module-btn" onclick="addModule()">
                ➕ Добавить модуль
            </button>
        `;
        return;
    }

    let modulesData = modulesContainer.getAttribute('data-modules');

    if (!modulesData || modulesData === 'null' || modulesData === 'undefined' || modulesData === '[]') {
        leftColumn.innerHTML += `
            <button class="add-module-btn" onclick="addModule()">
                ➕ Добавить модуль
            </button>
        `;
        return;
    }

    try {
        const modules = JSON.parse(modulesData);

        if (!Array.isArray(modules) || modules.length === 0) {
            leftColumn.innerHTML += `
                <button class="add-module-btn" onclick="addModule()">
                    ➕ Добавить модуль
                </button>
            `;
            return;
        }

        // Распределяем модули между колонками (чередуем)
        modules.forEach((module, index) => {
            const moduleDiv = createModuleElement(module);
            if (index % 2 === 0) {
                leftColumn.appendChild(moduleDiv);
            } else {
                rightColumn.appendChild(moduleDiv);
            }
        });

        // Добавляем кнопку добавления в левую колонку
        const addButton = document.createElement('button');
        addButton.className = 'add-module-btn';
        addButton.textContent = '➕ Добавить модуль';
        addButton.onclick = addModule;
        leftColumn.appendChild(addButton);

        // Инициализируем модули после рендеринга
        setTimeout(initializeModules, 100);

    } catch (error) {
        leftColumn.innerHTML += `
            <button class="add-module-btn" onclick="addModule()">
                ➕ Добавить модуль
            </button>
        `;
    }
}

// ===== СОЗДАНИЕ ЭЛЕМЕНТА МОДУЛЯ =====
function createModuleElement(module) {
    const moduleDiv = document.createElement('div');
    moduleDiv.className = `module ${(module.type || '').toLowerCase()}-module`;
    moduleDiv.dataset.moduleId = module.id;

    // Получаем контент модуля
    const content = getModuleContent(module);

    moduleDiv.innerHTML = `
        <div class="module-title">
            <span>${escapeHtml(module.title || 'Модуль')}</span>
            <button class="delete-btn" onclick="deleteModule(${module.id})">×</button>
        </div>
        <div class="module-content" data-type="${module.type || ''}" data-settings='${module.settings || '{}'}">
            ${content}
        </div>
    `;

    return moduleDiv;
}

// ===== ГЕНЕРАЦИЯ КОНТЕНТА МОДУЛЯ =====
function getModuleContent(module) {
    const type = module.type || '';
    const settings = module.settings || '{}';

    switch(type) {
        case 'WEATHER':
            return `
                <div class="weather-display">
                    <span class="weather-temp">--°C</span>
                    <span class="weather-desc">Загрузка...</span>
                </div>
            `;
        case 'NOTES':
            return `
                <textarea placeholder="Ваши заметки..." 
                         data-module-id="${module.id}"
                         onchange="saveNotes(this)">${getSavedNotes(module.id)}</textarea>
            `;
        case 'CLOCK':
            return `<div class="clock-display">--:--:--</div>`;
        case 'CALENDAR':
            return `<div class="calendar-display">📅 Календарь</div>`;
        case 'TODO':
            return `
                <div class="todo-module">
                    <input type="text" placeholder="Добавить задачу..." 
                           onkeypress="if(event.key==='Enter') addTodo(this, ${module.id})">
                    <ul class="todo-list" data-module-id="${module.id}"></ul>
                </div>
            `;
        default:
            return `<div style="opacity:0.5;text-align:center;padding:20px;">Модуль: ${type}</div>`;
    }
}

// ===== ИНИЦИАЛИЗАЦИЯ МОДУЛЕЙ =====
function initializeModules() {

    // Погода
    document.querySelectorAll('.weather-module .weather-display').forEach(el => {
        const content = el.closest('.module-content');
        if (content) {
            try {
                const settings = JSON.parse(content.dataset.settings || '{}');
                const city = settings.city || 'Moscow';
                fetchWeather(city, el);
            } catch (e) {
            }
        }
    });

    // Часы
    document.querySelectorAll('.clock-module .clock-display').forEach(clock => {
        updateClock(clock);
    });

    // Заметки
    document.querySelectorAll('.notes-module textarea').forEach(textarea => {
        const moduleId = textarea.dataset.moduleId;
        const saved = localStorage.getItem('notes_' + moduleId);
        if (saved) textarea.value = saved;
    });

    // To-Do
    document.querySelectorAll('.todo-module').forEach(todo => {
        const list = todo.querySelector('.todo-list');
        if (list) {
            const moduleId = parseInt(list.dataset.moduleId);
            loadTodos(moduleId);
        }
    });
}

// ===== ПОГОДА =====
async function fetchWeather(city, element) {
    try {
        const geoResponse = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`
        );
        const geoData = await geoResponse.json();

        if (geoData.results && geoData.results.length > 0) {
            const lat = geoData.results[0].latitude;
            const lon = geoData.results[0].longitude;

            const weatherResponse = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`
            );
            const weatherData = await weatherResponse.json();

            if (weatherData && weatherData.current_weather) {
                const temp = Math.round(weatherData.current_weather.temperature);
                const weatherCode = weatherData.current_weather.weathercode;
                const description = getWeatherDescription(weatherCode);

                element.querySelector('.weather-temp').textContent = temp + '°C';
                element.querySelector('.weather-desc').textContent = description;
                return;
            }
        }
        throw new Error('City not found');
    } catch (error) {
        element.querySelector('.weather-temp').textContent = '--°C';
        element.querySelector('.weather-desc').textContent = 'Ошибка загрузки';
    }
}

function getWeatherDescription(code) {
    const descriptions = {
        0: '☀️ Ясно',
        1: '🌤️ Преимущественно ясно',
        2: '⛅ Переменная облачность',
        3: '☁️ Пасмурно',
        45: '🌫️ Туман',
        48: '🌫️ Туман',
        51: '🌧️ Легкая морось',
        53: '🌧️ Умеренная морось',
        55: '🌧️ Сильная морось',
        61: '🌧️ Легкий дождь',
        63: '🌧️ Умеренный дождь',
        65: '🌧️ Сильный дождь',
        71: '🌨️ Легкий снег',
        73: '🌨️ Умеренный снег',
        75: '🌨️ Сильный снег',
        80: '🌧️ Ливень',
        81: '🌧️ Ливень',
        82: '🌧️ Сильный ливень',
        95: '⛈️ Гроза',
        96: '⛈️ Гроза с градом',
        99: '⛈️ Гроза с градом'
    };
    return descriptions[code] || '❓ Неизвестно';
}

// ===== ЧАСЫ =====
function updateClock(element) {
    const now = new Date();
    const time = now.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    element.textContent = time;
}

setInterval(() => {
    document.querySelectorAll('.clock-module .clock-display').forEach(clock => {
        updateClock(clock);
    });
}, 1000);

// ===== ЗАМЕТКИ =====
function getSavedNotes(moduleId) {
    return localStorage.getItem('notes_' + moduleId) || '';
}

function saveNotes(textarea) {
    const moduleId = textarea.dataset.moduleId;
    localStorage.setItem('notes_' + moduleId, textarea.value);
}

// ===== TO-DO =====
function addTodo(input, moduleId) {
    const text = input.value.trim();
    if (!text) return;

    const todos = JSON.parse(localStorage.getItem('todos_' + moduleId) || '[]');
    todos.push({ id: Date.now(), text: text, done: false });
    localStorage.setItem('todos_' + moduleId, JSON.stringify(todos));

    input.value = '';
    loadTodos(moduleId);
}

function loadTodos(moduleId) {
    const list = document.querySelector(`.todo-list[data-module-id="${moduleId}"]`);
    if (!list) return;

    const todos = JSON.parse(localStorage.getItem('todos_' + moduleId) || '[]');
    list.innerHTML = '';

    todos.forEach(todo => {
        const li = document.createElement('li');
        li.innerHTML = `
            <input type="checkbox" ${todo.done ? 'checked' : ''} 
                   onchange="toggleTodo(${moduleId}, ${todo.id})">
            <span style="${todo.done ? 'text-decoration: line-through; opacity: 0.6;' : ''}">
                ${escapeHtml(todo.text)}
            </span>
            <button class="delete-todo-btn" onclick="deleteTodo(${moduleId}, ${todo.id})">×</button>
        `;
        list.appendChild(li);
    });
}

function toggleTodo(moduleId, todoId) {
    const todos = JSON.parse(localStorage.getItem('todos_' + moduleId) || '[]');
    const todo = todos.find(t => t.id === todoId);
    if (todo) {
        todo.done = !todo.done;
        localStorage.setItem('todos_' + moduleId, JSON.stringify(todos));
        loadTodos(moduleId);
    }
}

function deleteTodo(moduleId, todoId) {
    let todos = JSON.parse(localStorage.getItem('todos_' + moduleId) || '[]');
    todos = todos.filter(t => t.id !== todoId);
    localStorage.setItem('todos_' + moduleId, JSON.stringify(todos));
    loadTodos(moduleId);
}

// ===== ДОБАВЛЕНИЕ МОДУЛЯ =====
function addModule() {
    const types = ['WEATHER', 'NOTES', 'CLOCK', 'CALENDAR', 'TODO'];
    const typeNames = ['🌤️ Погода', '📝 Заметки', '🕐 Часы', '📅 Календарь', '✅ To-Do'];

    let typeIndex = prompt(
        'Выберите тип модуля:\n' +
        types.map((t, i) => `${i+1}. ${typeNames[i]}`).join('\n')
    );

    if (typeIndex === null) return;
    typeIndex = parseInt(typeIndex) - 1;
    if (isNaN(typeIndex) || typeIndex < 0 || typeIndex >= types.length) {
        showToast('❌ Неверный выбор');
        return;
    }

    const type = types[typeIndex];
    const defaultTitle = typeNames[typeIndex].replace(/^[^\s]+\s/, '');

    const title = prompt('Введите заголовок модуля:', defaultTitle);
    if (title === null || !title.trim()) return;

    let settings = {};
    if (type === 'WEATHER') {
        const city = prompt('Введите город:', 'Moscow');
        if (city !== null && city.trim()) {
            settings.city = city.trim();
        } else {
            showToast('❌ Город не указан');
            return;
        }
    }

    fetch(`/api/pages/${currentPageId}/modules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            type: type,
            title: title.trim(),
            settings: JSON.stringify(settings)
        })
    })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => {
                    throw new Error(`HTTP error! status: ${response.status}, message: ${text}`);
                });
            }
            return response.json();
        })
        .then(() => {
            showToast('✅ Модуль добавлен');
            setTimeout(() => location.reload(), 500);
        })
        .catch(error => {
            showToast('❌ Ошибка добавления модуля: ' + error.message);
        });
}

// ===== УДАЛЕНИЕ МОДУЛЯ =====
function deleteModule(moduleId) {
    if (!confirm('Удалить модуль?')) return;

    fetch(`/api/modules/${moduleId}`, { method: 'DELETE' })
        .then(response => {
            if (response.ok) {
                showToast('✅ Модуль удален');
                setTimeout(() => location.reload(), 500);
            } else {
                showToast('❌ Ошибка удаления модуля');
            }
        })
        .catch(() => showToast('❌ Ошибка удаления модуля'));
}