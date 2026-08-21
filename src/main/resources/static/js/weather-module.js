/**
 * WEATHER-MODULE.JS - Логика модуля погоды (Open-Meteo)
 */

console.log('Weather module loaded!');

function initWeatherModule(moduleElement, moduleId) {
    console.log('Initializing weather module:', moduleId);
    loadWeatherData(moduleElement, moduleId);
}

async function loadWeatherData(moduleElement, moduleId) {
    try {
        const response = await fetch(`/api/modules/${moduleId}/data`);
        if (response.ok) {
            const data = await response.json();
            console.log('Weather data loaded:', data);
            renderWeatherDisplay(moduleElement, data);
        }
    } catch (error) {
        console.error('Error loading weather data:', error);
    }
}

function renderWeatherDisplay(moduleElement, data) {
    const weatherDisplay = moduleElement.querySelector('.weather-display');
    if (!weatherDisplay) return;

    const content = data.content || {};
    const weatherInfo = content.weatherInfo || {};

    if (weatherInfo.error) {
        weatherDisplay.innerHTML = `
            <div style="text-align:center; padding:10px; color:#ff6b6b;">
                <div style="font-size:32px;">⚠️</div>
                <div style="font-size:14px; margin-top:8px;">${weatherInfo.error}</div>
                <div style="font-size:12px; opacity:0.5; margin-top:4px;">Город: ${weatherInfo.city || 'не указан'}</div>
            </div>
        `;
        return;
    }

    if (!weatherInfo.temperature) {
        weatherDisplay.innerHTML = `
            <div style="text-align:center; opacity:0.5; padding:10px;">
                ⏳ Загрузка погоды...
            </div>
        `;
        return;
    }

    weatherDisplay.innerHTML = `
        <div style="display:flex; align-items:center; gap:16px;">
            <div style="font-size:48px; line-height:1;">
                ${weatherInfo.icon || '🌤️'}
            </div>
            <div>
                <div style="font-size:32px; font-weight:300;">
                    ${weatherInfo.temperature}
                </div>
                <div style="opacity:0.6; font-size:14px; text-transform:capitalize;">
                    ${weatherInfo.condition || ''}
                </div>
                <div style="font-size:12px; opacity:0.4;">
                    ${weatherInfo.city || ''}
                </div>
                ${weatherInfo.tempMin && weatherInfo.tempMax ? `
                    <div style="font-size:11px; opacity:0.3;">
                        ${weatherInfo.tempMin} / ${weatherInfo.tempMax}
                    </div>
                ` : ''}
            </div>
        </div>
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap:8px; margin-top:12px; font-size:13px; opacity:0.6;">
            ${weatherInfo.feelsLike ? `<div>🌡️ Ощущается: ${weatherInfo.feelsLike}</div>` : ''}
            ${weatherInfo.windSpeed ? `<div>💨 Ветер: ${weatherInfo.windSpeed} ${weatherInfo.windDirection ? ' (' + weatherInfo.windDirection + ')' : ''}</div>` : ''}
            ${weatherInfo.humidity ? `<div>💧 Влажность: ${weatherInfo.humidity}</div>` : ''}
            ${weatherInfo.pressure ? `<div>📊 Давление: ${weatherInfo.pressure}</div>` : ''}
            ${weatherInfo.sunrise ? `<div>🌅 Восход: ${weatherInfo.sunrise}</div>` : ''}
            ${weatherInfo.sunset ? `<div>🌇 Закат: ${weatherInfo.sunset}</div>` : ''}
        </div>
        <div style="font-size:11px; opacity:0.3; margin-top:8px; text-align:right; display:flex; justify-content:space-between;">
            <span>📡 ${weatherInfo.source || 'Open-Meteo'}</span>
            <span>🔄 ${weatherInfo.updated || '--:--:--'}</span>
        </div>
    `;
}

// ===== НАСТРОЙКИ МОДУЛЯ ПОГОДЫ =====
function renderWeatherSettings(data) {
    console.log('Rendering weather settings with data:', data);

    const content = data.content || {};
    const weatherData = content.weatherData || {};
    const weatherInfo = content.weatherInfo || {};

    if (!weatherData || Object.keys(weatherData).length === 0) {
        return `
            <div style="text-align:center; opacity:0.5; padding:10px; font-size:13px;">
                ⏳ Загрузка настроек погоды...
            </div>
        `;
    }

    const city = weatherData.city || 'Moscow';
    const units = weatherData.units || 'metric';
    const showWind = weatherData.showWind !== undefined ? weatherData.showWind : true;
    const showHumidity = weatherData.showHumidity !== undefined ? weatherData.showHumidity : true;
    const showPressure = weatherData.showPressure !== undefined ? weatherData.showPressure : true;

    let html = `
        <div style="display:flex; flex-direction:column; gap:12px; padding:4px 0;">
            <div>
                <label style="font-size:12px; opacity:0.6; display:block; margin-bottom:4px;">Город</label>
                <input type="text" class="weather-city" value="${city}" 
                       style="width:100%; padding:6px 10px; border-radius:6px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.08); color:white; font-size:12px;">
                <div style="font-size:11px; opacity:0.3; margin-top:4px;">
                    Введите название города на английском (например: Moscow, London, Tolyatti, Saint Petersburg)
                </div>
            </div>
            
            <div>
                <label style="font-size:12px; opacity:0.6; display:block; margin-bottom:4px;">Единицы измерения</label>
                <select class="weather-units" style="width:100%; padding:6px 10px; border-radius:6px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.08); color:white; font-size:12px;">
                    <option value="metric" ${units === 'metric' ? 'selected' : ''}>Цельсий (°C), м/с</option>
                    <option value="imperial" ${units === 'imperial' ? 'selected' : ''}>Фаренгейт (°F), миль/ч</option>
                </select>
            </div>
            
            <div style="display:flex; flex-wrap:wrap; gap:12px;">
                <label style="display:flex; align-items:center; gap:6px; font-size:12px; opacity:0.7; cursor:pointer;">
                    <input type="checkbox" class="weather-show-wind" ${showWind ? 'checked' : ''}>
                    💨 Ветер
                </label>
                <label style="display:flex; align-items:center; gap:6px; font-size:12px; opacity:0.7; cursor:pointer;">
                    <input type="checkbox" class="weather-show-humidity" ${showHumidity ? 'checked' : ''}>
                    💧 Влажность
                </label>
                <label style="display:flex; align-items:center; gap:6px; font-size:12px; opacity:0.7; cursor:pointer;">
                    <input type="checkbox" class="weather-show-pressure" ${showPressure ? 'checked' : ''}>
                    📊 Давление
                </label>
            </div>
            
            <button class="weather-update-btn" style="padding:6px 16px; border-radius:6px; background:rgba(33,150,243,0.2); border:1px solid rgba(33,150,243,0.3); color:white; cursor:pointer; font-size:12px;">
                🔄 Обновить погоду
            </button>
            
            ${weatherInfo.error ? `
                <div style="padding:8px 12px; border-radius:6px; background:rgba(244,67,54,0.1); border:1px solid rgba(244,67,54,0.2); font-size:12px; color:#ff6b6b;">
                    ⚠️ ${weatherInfo.error}
                </div>
            ` : `
                <div style="padding:8px 12px; border-radius:6px; background:rgba(76,175,80,0.1); border:1px solid rgba(76,175,80,0.2); font-size:11px; color:#81C784; display:flex; justify-content:space-between; flex-wrap:wrap;">
                    <span>🌡️ ${weatherInfo.temperature || '--'}</span>
                    <span>💨 ${weatherInfo.windSpeed || '--'}</span>
                    <span>💧 ${weatherInfo.humidity || '--'}</span>
                    <span>📡 Open-Meteo</span>
                </div>
            `}
        </div>
    `;

    return html;
}

// ===== ИНИЦИАЛИЗАЦИЯ СОБЫТИЙ НАСТРОЕК ПОГОДЫ =====
function initWeatherSettingsEvents(moduleId, settingsContainer) {
    const updateBtn = settingsContainer.querySelector('.weather-update-btn');
    if (updateBtn) {
        updateBtn.addEventListener('click', function() {
            updateWeatherSettings(moduleId, settingsContainer);
        });
    }

    const cityInput = settingsContainer.querySelector('.weather-city');
    if (cityInput) {
        cityInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                updateWeatherSettings(moduleId, settingsContainer);
            }
        });
    }
}

// ===== ОБНОВЛЕНИЕ НАСТРОЕК ПОГОДЫ =====
async function updateWeatherSettings(moduleId, settingsContainer) {
    const cityInput = settingsContainer.querySelector('.weather-city');
    const unitsSelect = settingsContainer.querySelector('.weather-units');
    const showWindCheck = settingsContainer.querySelector('.weather-show-wind');
    const showHumidityCheck = settingsContainer.querySelector('.weather-show-humidity');
    const showPressureCheck = settingsContainer.querySelector('.weather-show-pressure');

    const city = cityInput ? cityInput.value.trim() : 'Moscow';
    const units = unitsSelect ? unitsSelect.value : 'metric';
    const showWind = showWindCheck ? showWindCheck.checked : true;
    const showHumidity = showHumidityCheck ? showHumidityCheck.checked : true;
    const showPressure = showPressureCheck ? showPressureCheck.checked : true;

    if (!city) {
        showToast('❌ Введите название города');
        return;
    }

    try {
        const response = await fetch(`/api/modules/${moduleId}/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'updateSettings',
                params: {
                    city: city,
                    units: units,
                    showWind: showWind,
                    showHumidity: showHumidity,
                    showPressure: showPressure
                }
            })
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Weather settings updated:', data);

            const moduleElement = document.querySelector(`.module[data-module-id="${moduleId}"]`);
            if (moduleElement) {
                renderWeatherDisplay(moduleElement, data);
            }

            if (settingsContainer) {
                settingsContainer.innerHTML = renderWeatherSettings(data);
                initWeatherSettingsEvents(moduleId, settingsContainer);
            }

            showToast('✅ Настройки погоды обновлены');
        } else {
            const error = await response.text();
            showToast('❌ Ошибка: ' + error);
        }
    } catch (error) {
        console.error('Error updating weather settings:', error);
        showToast('❌ Ошибка обновления настроек');
    }
}