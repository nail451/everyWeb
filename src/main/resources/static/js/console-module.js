/**
 * CONSOLE-MODULE.JS - Интерактивная bash-консоль через WebSocket + xterm.js
 *
 * - Кэш токена на 23 часа (в sessionStorage)
 * - Heartbeat раз в 30 сек (соединение не «засыпает»)
 * - Auto-reconnect при обрыве (с запросом нового токена)
 * - Корректная обработка 05:00-уборки (code 1000 от сервера → переподключение)
 */

let consoleTerminal = null;
let consoleWebSocket = null;
let consoleFitAddon = null;
let consoleHeartbeatInterval = null;
let consoleReconnectTimer = null;
let consoleReconnectAttempts = 0;
let consoleXtermContainer = null;
let consolePageId = null;

const CONSOLE_RECONNECT_DELAYS_MS = [1000, 3000, 5000, 10000, 30000];

// ============================================================
// ИНИЦИАЛИЗАЦИЯ МОДУЛЯ
// ============================================================

async function initConsoleModule(moduleElement, moduleId) {
    const container = moduleElement.querySelector('.widget-content') ||
        moduleElement.querySelector('.widget-content-wrapper') ||
        moduleElement;

    container.innerHTML = '<div class="console-xterm-container" style="width:100%;height:100%;min-height:200px;"></div>';
    consoleXtermContainer = container.querySelector('.console-xterm-container');

    if (typeof Terminal === 'undefined') {
        consoleXtermContainer.innerHTML = '<div style="color:#ff6b6b;padding:10px;">❌ xterm.js не загружен</div>';
        return;
    }

    consolePageId = parseInt(document.getElementById('pageContainer')?.dataset.pageId || '0');
    if (!consolePageId) {
        consoleXtermContainer.innerHTML = '<div style="color:#ff6b6b;padding:10px;">❌ Не удалось определить страницу</div>';
        return;
    }

    // xterm init (один раз на весь виджет)
    consoleTerminal = new Terminal({
        cursorBlink: true,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        fontSize: 13,
        theme: {
            background: 'rgba(0,0,0,0.4)',
            foreground: '#e0e0e0',
            cursor: '#4CAF50'
        },
        allowProposedApi: true
    });

    if (typeof FitAddon !== 'undefined' && FitAddon.FitAddon) {
        consoleFitAddon = new FitAddon.FitAddon();
        consoleTerminal.loadAddon(consoleFitAddon);
    }

    consoleTerminal.open(consoleXtermContainer);
    if (consoleFitAddon) setTimeout(() => consoleFitAddon.fit(), 100);

    consoleTerminal.onData((data) => {
        if (consoleWebSocket && consoleWebSocket.readyState === WebSocket.OPEN) {
            consoleWebSocket.send(new TextEncoder().encode(data));
        }
    });

    const ro = new ResizeObserver(() => {
        if (consoleFitAddon) consoleFitAddon.fit();
        sendResize();
    });
    ro.observe(consoleXtermContainer);

    // Первое подключение
    await openWebSocket();
}

// ============================================================
// ПОДКЛЮЧЕНИЕ / ПЕРЕПОДКЛЮЧЕНИЕ
// ============================================================

async function openWebSocket() {
    // Закрываем старый, если был
    if (consoleWebSocket && consoleWebSocket.readyState !== WebSocket.CLOSED) {
        try { consoleWebSocket.close(1000, 'Reconnecting'); } catch (e) {}
    }

    let token = await getOrCreateToken(consolePageId);
    if (!token) {
        consoleTerminal.writeln('\r\n\x1b[31m[Не удалось получить токен — доступ запрещён или пароль неверен]\x1b[0m');
        return;
    }

    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    consoleWebSocket = new WebSocket(`${proto}//${location.host}/ws/console?token=${encodeURIComponent(token)}`);
    consoleWebSocket.binaryType = 'arraybuffer';

    consoleWebSocket.onopen = () => {
        consoleReconnectAttempts = 0;
        consoleTerminal.writeln('\x1b[32m[Подключено]\x1b[0m');
        sendResize();

        // Heartbeat: раз в 30 сек шлём resize — no-op, не попадает в stdin bash
        if (consoleHeartbeatInterval) clearInterval(consoleHeartbeatInterval);
        consoleHeartbeatInterval = setInterval(() => {
            if (consoleWebSocket && consoleWebSocket.readyState === WebSocket.OPEN) {
                sendResize();
            } else {
                clearInterval(consoleHeartbeatInterval);
                consoleHeartbeatInterval = null;
            }
        }, 30000);
    };

    consoleWebSocket.onmessage = (e) => {
        consoleTerminal.write(new Uint8Array(e.data));
    };

    consoleWebSocket.onclose = (e) => {
        if (consoleHeartbeatInterval) {
            clearInterval(consoleHeartbeatInterval);
            consoleHeartbeatInterval = null;
        }

        consoleTerminal.writeln(`\r\n\x1b[33m[Соединение закрыто: ${e.code}]\x1b[0m`);

        // 1008 = policy violation — переподключаться бессмысленно
        if (e.code === 1008) {
            consoleTerminal.writeln('\x1b[31m[Отказано в подключении: слишком много сессий или доступ запрещён]\x1b[0m');
            return;
        }

        // 1000 = нормальное закрытие. Это может быть 05:00-уборка сервера —
        // переподключаемся, но запрашиваем НОВЫЙ токен (старый мог быть отозван).
        if (e.code === 1000) {
            clearTokenCache(consolePageId);
        }

        // 1006 (abnormal closure) — вероятно, токен просрочен или сеть упала.
        // Тоже чистим кэш, чтобы получить новый токен при reconnect.
        if (e.code === 1006 || e.code === 1001 || e.code === 1005) {
            clearTokenCache(consolePageId);
        }

        scheduleReconnect();
    };

    consoleWebSocket.onerror = () => {
        // Ошибка всегда сопровождается onclose — там и обрабатываем
    };
}

function scheduleReconnect() {
    if (consoleReconnectTimer) return; // уже запланировано

    const delay = CONSOLE_RECONNECT_DELAYS_MS[
        Math.min(consoleReconnectAttempts, CONSOLE_RECONNECT_DELAYS_MS.length - 1)
        ];
    consoleReconnectAttempts++;

    consoleTerminal.writeln(`\x1b[33m[Переподключение через ${delay / 1000} сек...]\x1b[0m`);

    consoleReconnectTimer = setTimeout(async () => {
        consoleReconnectTimer = null;
        await openWebSocket();
    }, delay);
}

// ============================================================
// RESIZE
// ============================================================

function sendResize() {
    if (consoleWebSocket && consoleWebSocket.readyState === WebSocket.OPEN && consoleTerminal) {
        const msg = JSON.stringify({
            type: 'resize',
            cols: consoleTerminal.cols,
            rows: consoleTerminal.rows
        });
        consoleWebSocket.send(new TextEncoder().encode(msg));
    }
}

// ============================================================
// ТОКЕН: запрос / кэш
// ============================================================

async function getOrCreateToken(pageId) {
    const cached = sessionStorage.getItem('consoleToken_' + pageId);
    const cachedAt = sessionStorage.getItem('consoleTokenAt_' + pageId);

    // Кэш на 23 часа. Сервер отзывает токены в 05:00 Самары,
    // поэтому 23 часа — безопасный запас.
    if (cached && cachedAt) {
        const age = Date.now() - parseInt(cachedAt, 10);
        if (age < 23 * 60 * 60 * 1000) {
            return cached;
        }
    }

    // Пробуем с сохранённым паролем (если страница защищена)
    const password = sessionStorage.getItem('pagePassword_' + pageId) || '';
    let token = await requestConsoleToken(pageId, password);

    // Если не получилось — спрашиваем пароль
    if (!token) {
        const pwd = prompt('Введите пароль страницы для доступа к консоли:');
        if (!pwd) return null;
        token = await requestConsoleToken(pageId, pwd);
        if (token) {
            try { sessionStorage.setItem('pagePassword_' + pageId, pwd); } catch (e) {}
        }
    }

    if (token) {
        try {
            sessionStorage.setItem('consoleToken_' + pageId, token);
            sessionStorage.setItem('consoleTokenAt_' + pageId, String(Date.now()));
        } catch (e) {}
    }
    return token;
}

function clearTokenCache(pageId) {
    try {
        sessionStorage.removeItem('consoleToken_' + pageId);
        sessionStorage.removeItem('consoleTokenAt_' + pageId);
    } catch (e) {}
}

async function requestConsoleToken(pageId, password) {
    try {
        const resp = await fetch('/api/console/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pageId, password })
        });
        if (!resp.ok) return null;
        const data = await resp.json();
        return data.token || null;
    } catch (e) {
        return null;
    }
}

// ============================================================
// ЭКСПОРТ
// ============================================================

window.initConsoleModule = initConsoleModule;