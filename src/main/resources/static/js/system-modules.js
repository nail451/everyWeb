/**
 * SYSTEM-MODULES.JS - Логика системных модулей мониторинга
 */

console.log('🔵 System modules loaded!');

// ===== КЭШ ДЛЯ ДАННЫХ =====
const systemCache = {};
let systemIntervals = {};

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====
function getNumericId(moduleId) {
    if (typeof moduleId === 'number') return moduleId;
    if (typeof moduleId === 'string') {
        const num = parseInt(moduleId);
        return isNaN(num) ? null : num;
    }
    return null;
}

function formatBytes(bytes) {
    if (!bytes || bytes < 0) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    if (bytes < 1024 * 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    return (bytes / (1024 * 1024 * 1024 * 1024)).toFixed(2) + ' TB';
}

function getBatteryIcon(percent, isCharging) {
    if (isCharging) return '⚡';
    if (percent > 75) return '🔋';
    if (percent > 50) return '🔋';
    if (percent > 25) return '🔋';
    if (percent > 10) return '🪫';
    return '⚠️';
}

// ===== ИНИЦИАЛИЗАЦИЯ =====
function initSystemModule(moduleElement, moduleId) {
    console.log('🔵 initSystemModule called for:', moduleId);

    const numericId = getNumericId(moduleId);
    if (numericId === null) {
        console.error('❌ Invalid module ID:', moduleId);
        return;
    }

    console.log('🔵 numericId:', numericId);
    console.log('🔵 moduleElement:', moduleElement);

    // Очищаем старый интервал
    if (systemIntervals[numericId]) {
        clearInterval(systemIntervals[numericId]);
        delete systemIntervals[numericId];
    }

    // ===== ВАЖНО: Сразу загружаем данные =====
    loadSystemData(moduleElement, numericId);

    // Запускаем обновление
    const moduleType = moduleElement.dataset.widgetType;
    let interval = 2000;

    switch (moduleType) {
        case 'CPU': interval = 1000; break;
        case 'MEMORY': interval = 5000; break;
        case 'NETWORK': interval = 2000; break;
        case 'DISK': interval = 10000; break;
        case 'BATTERY': interval = 10000; break;
        default: interval = 5000;
    }

    console.log('🔵 Starting interval for', moduleType, 'every', interval, 'ms');

    systemIntervals[numericId] = setInterval(() => {
        updateSystemData(numericId);
    }, interval);
}

// ===== ЗАГРУЗКА ДАННЫХ =====
async function loadSystemData(moduleElement, moduleId) {
    const numericId = getNumericId(moduleId);
    if (numericId === null) return;

    console.log('🔵 loadSystemData called for:', numericId);

    try {
        const response = await fetch(`/api/modules/${numericId}/data`);
        console.log('🔵 Response status:', response.status);

        if (response.ok) {
            const data = await response.json();
            console.log('🔵 Data received for', numericId, ':', data);
            systemCache[numericId] = data;
            renderSystemDisplay(moduleElement, data);
        } else {
            console.error('❌ Failed to load system data:', response.status);
            // Показываем ошибку
            const systemDisplay = moduleElement.querySelector('.system-display') ||
                moduleElement.querySelector('.widget-content');
            if (systemDisplay) {
                systemDisplay.innerHTML = `
                    <div style="text-align:center; opacity:0.5; padding:10px; color:#ff6b6b;">
                        ❌ Ошибка загрузки данных (${response.status})
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('❌ Error loading system data:', error);
        const systemDisplay = moduleElement.querySelector('.system-display') ||
            moduleElement.querySelector('.widget-content');
        if (systemDisplay) {
            systemDisplay.innerHTML = `
                <div style="text-align:center; opacity:0.5; padding:10px; color:#ff6b6b;">
                    ❌ Ошибка: ${error.message}
                </div>
            `;
        }
    }
}

// ===== ОБНОВЛЕНИЕ ДАННЫХ =====
async function updateSystemData(moduleId) {
    const numericId = getNumericId(moduleId);
    if (numericId === null) return;

    try {
        const response = await fetch(`/api/modules/${numericId}/update`);
        if (response.ok) {
            const data = await response.json();
            // Обновляем кэш
            if (systemCache[numericId]) {
                systemCache[numericId].content = data.content;
            }
            // Обновляем отображение
            const moduleElement = document.querySelector(`.widget[data-widget-id="${moduleId}"]`);
            if (moduleElement) {
                renderSystemDisplay(moduleElement, { content: data.content });
            }
        }
    } catch (error) {
        // Игнорируем ошибки обновления
    }
}

// ===== РЕНДЕРИНГ =====
function renderSystemDisplay(moduleElement, data) {
    console.log('🔵 renderSystemDisplay called for:', moduleElement.dataset.widgetId);

    let systemDisplay = moduleElement.querySelector('.system-display');

    // Если контейнера нет, ищем widget-content или создаем
    if (!systemDisplay) {
        console.log('🔵 system-display not found, looking for widget-content...');
        systemDisplay = moduleElement.querySelector('.widget-content');

        if (!systemDisplay) {
            console.log('🔵 widget-content not found, creating...');
            const wrapper = moduleElement.querySelector('.widget-content-wrapper') || moduleElement;
            systemDisplay = document.createElement('div');
            systemDisplay.className = 'widget-content system-display';
            wrapper.appendChild(systemDisplay);
        } else {
            // Добавляем класс system-display к существующему widget-content
            systemDisplay.classList.add('system-display');
        }
    }

    const content = data.content || {};
    const moduleType = moduleElement.dataset.widgetType;

    console.log('🔵 Rendering for type:', moduleType);
    console.log('🔵 Content:', content);

    let html = '';

    switch (moduleType) {
        case 'CPU':
            html = renderCpuDisplay(content);
            break;
        case 'MEMORY':
            html = renderMemoryDisplay(content);
            break;
        case 'DISK':
            html = renderDiskDisplay(content);
            break;
        case 'NETWORK':
            html = renderNetworkDisplay(content);
            break;
        case 'BATTERY':
            html = renderBatteryDisplay(content);
            break;
        default:
            html = `<div style="text-align:center; opacity:0.5;">Неизвестный тип: ${moduleType}</div>`;
    }

    console.log('🔵 HTML length:', html.length);
    systemDisplay.innerHTML = html;
}

// ===== CPU =====
function renderCpuDisplay(content) {
    const load = content.load || 0;
    const cores = content.cores || 0;
    const physicalCores = content.physicalCores || 0;
    const frequency = content.frequency || 0;
    const perCoreLoad = content.perCoreLoad || [];

    // ===== ДАННЫЕ ИЗ LHM =====
    const lhm = content.lhm || {};
    const lhmAvailable = lhm.available === true;

    // Температура
    const cpuTempAvg = lhm.cpuTempAvg || 0;
    const cpuTempMax = lhm.cpuTempMax || 0;
    const hasTemp = lhmAvailable && cpuTempAvg > 0;

    // Вентиляторы (только CPU)
    const cpuFans = lhm.cpuFans || [];
    const hasFans = lhmAvailable && cpuFans.length > 0;

    const color = load > 80 ? '#ff6b6b' : load > 60 ? '#ffd93d' : '#6bcb77';

    // Цвет температуры
    let tempColor = '#6bcb77';
    if (hasTemp) {
        if (cpuTempAvg > 80) tempColor = '#ff6b6b';
        else if (cpuTempAvg > 60) tempColor = '#ffd93d';
        else tempColor = '#6bcb77';
    }

    // Прогресс-бары для ядер
    let perCoreHtml = '';
    if (perCoreLoad.length > 0) {
        const displayCores = perCoreLoad.slice(0, Math.min(8, perCoreLoad.length));
        perCoreHtml = `
            <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(30px, 1fr)); gap:2px; margin-top:6px;">
                ${displayCores.map((coreLoad, i) => {
            const loadPercent = Math.round(coreLoad * 100);
            const barColor = loadPercent > 80 ? '#ff6b6b' : loadPercent > 60 ? '#ffd93d' : '#6bcb77';
            return `
                        <div style="text-align:center;">
                            <div style="height:30px; width:100%; background:rgba(255,255,255,0.05); border-radius:3px; position:relative; overflow:hidden;">
                                <div style="position:absolute; bottom:0; left:0; right:0; height:${loadPercent}%; background:${barColor}; border-radius:3px; transition:height 0.3s;"></div>
                            </div>
                            <div style="font-size:7px; opacity:0.4; margin-top:1px;">${i+1}</div>
                        </div>
                    `;
        }).join('')}
            </div>
        `;
    }

    // ===== ТЕМПЕРАТУРА =====
    let tempHtml = '';
    if (hasTemp) {
        tempHtml = `
            <div style="display:flex; align-items:center; gap:12px; margin-top:4px; padding-top:6px; border-top:1px solid rgba(255,255,255,0.04);">
                <div style="display:flex; align-items:center; gap:4px;">
                    <span style="font-size:14px;">🌡️</span>
                    <span style="font-size:11px; opacity:0.5;">Сред:</span>
                    <span style="font-size:13px; font-weight:500; color:${tempColor};">${cpuTempAvg}°C</span>
                </div>
                ${cpuTempMax > 0 ? `
                    <div style="display:flex; align-items:center; gap:4px;">
                        <span style="font-size:11px; opacity:0.5;">Макс:</span>
                        <span style="font-size:13px; font-weight:500; color:${cpuTempMax > 80 ? '#ff6b6b' : cpuTempMax > 60 ? '#ffd93d' : '#6bcb77'};">${cpuTempMax}°C</span>
                    </div>
                ` : ''}
                <span style="font-size:9px; opacity:0.2; margin-left:auto;">LHM</span>
            </div>
        `;
    }

    // ===== ВЕНТИЛЯТОРЫ (только CPU) =====
    let fanHtml = '';
    if (hasFans) {
        const fanItems = cpuFans.map(fan => {
            const speed = fan.speed || 0;
            // Сокращаем имена для красоты
            let shortName = fan.name || 'Fan';
            shortName = shortName.replace('CPU Fan', 'CPU')
                .replace('Pump Fan', 'Pump')
                .replace('Water Pump', 'Water')
                .replace('CPU OPT', 'CPU Opt')
                .replace('AIO Pump', 'AIO')
                .trim();

            const isRunning = speed > 0;
            return `
                <div style="display:flex; align-items:center; gap:4px; font-size:11px; opacity:0.6;">
                    <span>🔄</span>
                    <span style="opacity:0.5;">${shortName}:</span>
                    <span style="font-weight:400; color:${isRunning ? '#81C784' : 'rgba(255,255,255,0.3)'};">
                        ${isRunning ? speed + ' RPM' : '0 RPM'}
                    </span>
                </div>
            `;
        }).join('');

        fanHtml = `
            <div style="display:flex; flex-wrap:wrap; gap:4px 12px; margin-top:2px; padding-top:4px; border-top:1px solid rgba(255,255,255,0.02);">
                ${fanItems}
            </div>
        `;
    }

    return `
        <div style="display:flex; flex-direction:column; gap:2px; width:100%;">
            <!-- Основная загрузка -->
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:14px; font-weight:500;">${load.toFixed(1)}%</span>
                <span style="font-size:11px; opacity:0.4;">${cores} ядер (${physicalCores} физических)</span>
            </div>
            <div style="height:8px; background:rgba(255,255,255,0.05); border-radius:4px; overflow:hidden;">
                <div style="height:100%; width:${load}%; background:${color}; border-radius:4px; transition:width 0.3s;"></div>
            </div>
            
            <!-- Частота -->
            ${frequency > 0 ? `<div style="font-size:11px; opacity:0.3;">⚡ ${frequency.toFixed(2)} ГГц</div>` : ''}
            
            <!-- Температура -->
            ${tempHtml}
            
            <!-- Вентиляторы CPU -->
            ${fanHtml}
            
            <!-- Ядра -->
            ${perCoreHtml}
        </div>
    `;
}

// ===== MEMORY =====
function renderMemoryDisplay(content) {
    const total = content.total || '0 B';
    const used = content.used || '0 B';
    const available = content.available || '0 B';
    const usedPercent = content.usedPercent || 0;
    const totalBytes = content.totalBytes || 0;

    const color = usedPercent > 80 ? '#ff6b6b' : usedPercent > 60 ? '#ffd93d' : '#6bcb77';

    // Прогресс-бар
    const barWidth = Math.min(100, usedPercent);

    // SWAP информация
    let swapHtml = '';
    if (content.swapTotal) {
        const swapPercent = content.swapPercent || 0;
        const swapUsed = content.swapUsed || '0 B';
        swapHtml = `
            <div style="margin-top:6px; border-top:1px solid rgba(255,255,255,0.04); padding-top:6px;">
                <div style="display:flex; justify-content:space-between; font-size:11px; opacity:0.4;">
                    <span>📊 SWAP</span>
                    <span>${swapUsed} / ${content.swapTotal}</span>
                </div>
                <div style="height:4px; background:rgba(255,255,255,0.05); border-radius:2px; overflow:hidden; margin-top:2px;">
                    <div style="height:100%; width:${Math.min(100, swapPercent)}%; background:rgba(255,255,255,0.2); border-radius:2px;"></div>
                </div>
            </div>
        `;
    }

    // Информация о страницах памяти (если доступна)
    let pageHtml = '';
    if (content.pageSize) {
        pageHtml = `
            <div style="font-size:9px; opacity:0.15; margin-top:2px;">
                📄 Страница: ${content.pageSize}
            </div>
        `;
    }

    return `
        <div style="display:flex; flex-direction:column; gap:4px; width:100%;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:14px; font-weight:500;">${usedPercent.toFixed(1)}%</span>
                <span style="font-size:11px; opacity:0.4;">${used} / ${total}</span>
            </div>
            <div style="height:8px; background:rgba(255,255,255,0.05); border-radius:4px; overflow:hidden;">
                <div style="height:100%; width:${barWidth}%; background:${color}; border-radius:4px; transition:width 0.3s;"></div>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:11px; opacity:0.4;">
                <span>🟢 Свободно: ${available}</span>
                <span>🔴 Использовано: ${used}</span>
            </div>
            ${swapHtml}
            ${pageHtml}
        </div>
    `;
}

// ===== DISK =====
function renderDiskDisplay(content) {
    const disks = content.disks || [];

    if (disks.length === 0) {
        return `<div style="text-align:center; opacity:0.5; padding:10px;">💾 Диски не обнаружены</div>`;
    }

    let disksHtml = disks.map((disk, index) => {
        // Получаем имя диска
        let displayName = disk.name || 'Unknown';

        // ===== УБИРАЕМ (Стандартные дисковые накопители) НА ФРОНТЕНДЕ =====
        displayName = displayName
            .replace(/\(Стандартные дисковые накопители\)/gi, '')
            .replace(/\(стандартные дисковые накопители\)/gi, '')
            .replace(/\(Standard disk drives\)/gi, '')
            .replace(/\(Standard Disk Drives\)/gi, '')
            .replace(/Стандартные дисковые накопители/gi, '')
            .replace(/стандартные дисковые накопители/gi, '')
            .replace(/Standard disk drives/gi, '')
            .replace(/Standard Disk Drives/gi, '')
            .trim();

        // Убираем лишние скобки в конце
        displayName = displayName.replace(/\s*\(\s*\)\s*$/, '');

        // Убираем двойные пробелы
        displayName = displayName.replace(/\s+/g, ' ');

        // Если имя пустое, используем "Unknown"
        if (!displayName || displayName.length < 2) {
            displayName = disk.name || 'Unknown';
        }

        // ===== ТЕПЕРЬ ОБРЕЗАЕМ ДЛИННЫЕ ИМЕНА =====
        // Обрезаем только если действительно длинное (больше 30 символов)
        if (displayName.length > 30) {
            displayName = displayName.substring(0, 27) + '...';
        }

        const partitions = disk.partitions || [];

        // Сортируем партиции: сначала с буквами дисков
        const sortedPartitions = [...partitions].sort((a, b) => {
            const aHasLetter = a.mountPoint && a.mountPoint.match(/^[A-Z]:/);
            const bHasLetter = b.mountPoint && b.mountPoint.match(/^[A-Z]:/);
            if (aHasLetter && !bHasLetter) return -1;
            if (!aHasLetter && bHasLetter) return 1;
            return 0;
        });

        // Показываем все партиции с буквами дисков
        let partitionsHtml = '';
        const partitionsWithLetters = sortedPartitions.filter(p => p.mountPoint && p.mountPoint.match(/^[A-Z]:/));

        if (partitionsWithLetters.length > 0) {
            partitionsHtml = partitionsWithLetters.map(part => {
                const mountPoint = part.mountPoint || '';
                const freeSpace = part.freeSpace || part.size || '0 B';
                const totalSpace = part.totalSpace || part.size || '0 B';
                const usedPercent = part.usedPercent !== undefined ? part.usedPercent : 0;

                const color = usedPercent > 80 ? '#ff6b6b' : usedPercent > 60 ? '#ffd93d' : '#6bcb77';

                return `
                    <div style="padding:4px 0; ${partitionsWithLetters.indexOf(part) < partitionsWithLetters.length - 1 ? 'border-bottom:1px solid rgba(255,255,255,0.03);' : ''}">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-size:12px; opacity:0.7; font-weight:400;">
                                ${mountPoint}
                            </span>
                            <span style="font-size:12px; opacity:0.4;">
                                ${freeSpace} из ${totalSpace}
                            </span>
                        </div>
                        <div style="display:flex; align-items:center; gap:8px; margin-top:2px;">
                            <div style="flex:1; height:6px; background:rgba(255,255,255,0.06); border-radius:3px; overflow:hidden;">
                                <div style="height:100%; width:${Math.min(100, usedPercent)}%; background:${color}; border-radius:3px; transition:width 0.3s;"></div>
                            </div>
                            <span style="font-size:12px; font-weight:500; color:${color}; min-width:42px; text-align:right;">
                                ${Math.round(usedPercent)}%
                            </span>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            const size = disk.size || '0 B';
            partitionsHtml = `
                <div style="padding:4px 0;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:12px; opacity:0.5;">Без буквы</span>
                        <span style="font-size:12px; opacity:0.3;">${size}</span>
                    </div>
                </div>
            `;
        }

        const borderStyle = index < disks.length - 1 ? 'border-bottom:2px solid rgba(255,255,255,0.06); padding-bottom:8px; margin-bottom:4px;' : '';

        return `
            <div style="${borderStyle}">
                <div style="font-size:13px; font-weight:500; opacity:0.9; margin-bottom:2px;">
                    💾 ${displayName}
                </div>
                ${partitionsHtml}
            </div>
        `;
    }).join('');

    return `
        <div style="display:flex; flex-direction:column; gap:2px; width:100%; max-height:250px; overflow-y:auto;">
            ${disksHtml}
        </div>
    `;
}

// ===== ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ ПАРСИНГА РАЗМЕРА =====
function parseSizeToBytes(sizeStr) {
    if (!sizeStr) return 0;

    const units = {
        'B': 1,
        'KB': 1024,
        'MB': 1024 * 1024,
        'GB': 1024 * 1024 * 1024,
        'TB': 1024 * 1024 * 1024 * 1024
    };

    const match = sizeStr.match(/^([\d.]+)\s*(B|KB|MB|GB|TB)$/i);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();

    return value * (units[unit] || 1);
}

// ===== NETWORK =====
function renderNetworkDisplay(content) {
    // Если есть ошибка
    if (content.error) {
        return `<div style="text-align:center; opacity:0.5; padding:10px;">🌐 ${content.error}</div>`;
    }

    const interfaceName = content.interface || 'Сеть';
    const rxSpeed = content.rxSpeed || '0 B/s';
    const txSpeed = content.txSpeed || '0 B/s';
    const rxTotal = content.rxTotal || '0 B';
    const txTotal = content.txTotal || '0 B';
    const speed = content.speed || 'N/A';
    const ip = content.ip || 'N/A';

    // Определяем максимальную скорость для прогресс-бара
    // (условно, чтобы показать нагрузку)
    const rxBytes = content.rxSpeedBytes || 0;
    const txBytes = content.txSpeedBytes || 0;
    const maxSpeed = Math.max(rxBytes, txBytes, 1);

    // Процент использования (относительно максимальной скорости интерфейса)
    // Для красоты используем максимальную скорость 100 MB/s как 100%
    const maxDisplaySpeed = 100 * 1024 * 1024; // 100 MB/s
    const rxPercent = Math.min(100, (rxBytes / maxDisplaySpeed) * 100);
    const txPercent = Math.min(100, (txBytes / maxDisplaySpeed) * 100);

    const rxColor = rxPercent > 80 ? '#ff6b6b' : rxPercent > 60 ? '#ffd93d' : '#6bcb77';
    const txColor = txPercent > 80 ? '#ff6b6b' : txPercent > 60 ? '#ffd93d' : '#6bcb77';

    return `
        <div style="display:flex; flex-direction:column; gap:6px; width:100%;">
            <!-- Имя интерфейса и IP -->
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:13px; font-weight:500; opacity:0.9;">🌐 ${interfaceName}</span>
                <span style="font-size:11px; opacity:0.3;">${ip}</span>
            </div>
            
            <!-- Скорость интерфейса -->
            ${speed !== 'N/A' ? `<div style="font-size:10px; opacity:0.2;">⚡ ${speed}</div>` : ''}
            
            <!-- Загрузка (Download) -->
            <div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:11px; opacity:0.5;">⬇ Загрузка</span>
                    <span style="font-size:13px; font-weight:500; color:${rxColor};">${rxSpeed}</span>
                </div>
                <div style="height:4px; background:rgba(255,255,255,0.06); border-radius:2px; overflow:hidden; margin-top:2px;">
                    <div style="height:100%; width:${rxPercent}%; background:${rxColor}; border-radius:2px; transition:width 0.3s;"></div>
                </div>
            </div>
            
            <!-- Отдача (Upload) -->
            <div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:11px; opacity:0.5;">⬆ Отдача</span>
                    <span style="font-size:13px; font-weight:500; color:${txColor};">${txSpeed}</span>
                </div>
                <div style="height:4px; background:rgba(255,255,255,0.06); border-radius:2px; overflow:hidden; margin-top:2px;">
                    <div style="height:100%; width:${txPercent}%; background:${txColor}; border-radius:2px; transition:width 0.3s;"></div>
                </div>
            </div>
            
            <!-- Общий трафик -->
            <div style="display:flex; justify-content:space-between; font-size:10px; opacity:0.2; margin-top:2px; padding-top:4px; border-top:1px solid rgba(255,255,255,0.02);">
                <span>📥 Всего: ${rxTotal}</span>
                <span>📤 Всего: ${txTotal}</span>
            </div>
        </div>
    `;
}

// ===== BATTERY =====
function renderBatteryDisplay(content) {
    if (!content.available) {
        return `<div style="text-align:center; opacity:0.5;">🔋 ${content.message || 'Батарея не обнаружена'}</div>`;
    }

    const percent = content.remainingCapacity || 0;
    const isCharging = content.isCharging || false;
    const timeRemaining = content.timeRemainingFormatted || 'N/A';
    const icon = content.icon || getBatteryIcon(percent, isCharging);

    const color = percent > 75 ? '#6bcb77' : percent > 50 ? '#ffd93d' : percent > 25 ? '#ff9f43' : '#ff6b6b';
    const status = isCharging ? 'Заряжается' : (percent > 75 ? 'Отлично' : percent > 50 ? 'Нормально' : percent > 25 ? 'Низкий заряд' : 'Критический заряд');

    return `
        <div style="display:flex; flex-direction:column; gap:4px; width:100%;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:28px;">${icon}</span>
                <span style="font-size:24px; font-weight:300;">${percent.toFixed(0)}%</span>
            </div>
            <div style="height:8px; background:rgba(255,255,255,0.05); border-radius:4px; overflow:hidden;">
                <div style="height:100%; width:${percent}%; background:${color}; border-radius:4px; transition:width 0.3s;"></div>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:11px; opacity:0.5;">
                <span>${status}</span>
                <span>⏱ ${timeRemaining}</span>
            </div>
            ${content.name ? `<div style="font-size:9px; opacity:0.2;">${content.name}</div>` : ''}
        </div>
    `;
}

// ===== НАСТРОЙКИ =====
function renderSystemSettings(data) {
    const content = data.content || {};
    const moduleType = data.type || 'SYSTEM';

    let infoHtml = '';

    switch (moduleType) {
        case 'CPU':
            infoHtml = `
                <div style="font-size:11px; opacity:0.4;">
                    🔄 Обновление каждую секунду
                </div>
            `;
            break;
        case 'MEMORY':
            infoHtml = `
                <div style="font-size:11px; opacity:0.4;">
                    🔄 Обновление каждые 5 секунд
                </div>
            `;
            break;
        case 'NETWORK':
            infoHtml = `
                <div style="font-size:11px; opacity:0.4;">
                    🔄 Обновление каждые 2 секунды
                </div>
            `;
            break;
        default:
            infoHtml = `
                <div style="font-size:11px; opacity:0.4;">
                    🔄 Обновление каждые 10 секунд
                </div>
            `;
    }

    return `
        <div style="display:flex; flex-direction:column; gap:8px; padding:4px 0;">
            ${infoHtml}
            <div style="font-size:12px; opacity:0.6; border-top:1px solid rgba(255,255,255,0.04); padding-top:8px;">
                ✅ Системный модуль активен
            </div>
        </div>
    `;
}

// ===== ИНИЦИАЛИЗАЦИЯ СОБЫТИЙ =====
function initSystemSettingsEvents(moduleId, settingsContainer) {
    console.log('System settings initialized for:', moduleId);
}

// ===== ЭКСПОРТ =====
window.initSystemModule = initSystemModule;
window.loadSystemData = loadSystemData;
window.updateSystemData = updateSystemData;
window.renderSystemDisplay = renderSystemDisplay;
window.renderSystemSettings = renderSystemSettings;
window.initSystemSettingsEvents = initSystemSettingsEvents;
window.systemCache = systemCache;

console.log('✅ system-modules.js fully loaded');
console.log('✅ initSystemModule:', typeof initSystemModule === 'function');
console.log('✅ renderSystemDisplay:', typeof renderSystemDisplay === 'function');