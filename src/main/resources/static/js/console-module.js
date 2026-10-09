/**
 * CONSOLE-MODULE.JS - Интерактивная bash-консоль через WebSocket + xterm.js
 */

let consoleTerminal = null;
let consoleWebSocket = null;
let consoleFitAddon = null;

async function initConsoleModule(moduleElement, moduleId) {
    const container = moduleElement.querySelector('.widget-content') ||
        moduleElement.querySelector('.widget-content-wrapper') ||
        moduleElement;

    container.innerHTML = '<div class="console-xterm-container" style="width:100%;height:100%;min-height:200px;"></div>';
    const xtermContainer = container.querySelector('.console-xterm-container');

    if (typeof Terminal === 'undefined') {
        xtermContainer.innerHTML = '<div style="color:#ff6b6b;padding:10px;">❌ xterm.js не загружен</div>';
        return;
    }

    const pageId = parseInt(document.getElementById('pageContainer')?.dataset.pageId || '0');
    if (!pageId) {
        xtermContainer.innerHTML = '<div style="color:#ff6b6b;padding:10px;">❌ Не удалось определить страницу</div>';
        return;
    }

    // Пытаемся получить токен
    let token = await requestConsoleToken(pageId, sessionStorage.getItem('pagePassword_' + pageId) || '');
    if (!token) {
        // Спрашиваем пароль
        const pwd = prompt('Введите пароль страницы для доступа к консоли:');
        if (!pwd) {
            xtermContainer.innerHTML = '<div style="color:#ff6b6b;padding:10px;">❌ Доступ к консоли запрещён</div>';
            return;
        }
        token = await requestConsoleToken(pageId, pwd);
        if (!token) {
            xtermContainer.innerHTML = '<div style="color:#ff6b6b;padding:10px;">❌ Неверный пароль</div>';
            return;
        }
        try { sessionStorage.setItem('pagePassword_' + pageId, pwd); } catch (e) {}
    }

    // xterm init
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

    consoleTerminal.open(xtermContainer);
    if (consoleFitAddon) setTimeout(() => consoleFitAddon.fit(), 100);

    // WebSocket
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    consoleWebSocket = new WebSocket(`${proto}//${location.host}/ws/console?token=${encodeURIComponent(token)}`);
    consoleWebSocket.binaryType = 'arraybuffer';

    consoleWebSocket.onopen = () => {
        consoleTerminal.writeln('\x1b[32m[Подключено]\x1b[0m');
        sendResize();
    };
    consoleWebSocket.onmessage = (e) => consoleTerminal.write(new Uint8Array(e.data));
    consoleWebSocket.onclose = (e) => consoleTerminal.writeln(`\r\n\x1b[33m[Соединение закрыто: ${e.code}]\x1b[0m`);
    consoleWebSocket.onerror = () => consoleTerminal.writeln('\r\n\x1b[31m[Ошибка WebSocket]\x1b[0m');

    consoleTerminal.onData((data) => {
        if (consoleWebSocket && consoleWebSocket.readyState === WebSocket.OPEN) {
            consoleWebSocket.send(new TextEncoder().encode(data));
        }
    });

    const ro = new ResizeObserver(() => {
        if (consoleFitAddon) consoleFitAddon.fit();
        sendResize();
    });
    ro.observe(xtermContainer);

    function sendResize() {
        if (consoleWebSocket && consoleWebSocket.readyState === WebSocket.OPEN && consoleTerminal) {
            const msg = JSON.stringify({ type: 'resize', cols: consoleTerminal.cols, rows: consoleTerminal.rows });
            consoleWebSocket.send(new TextEncoder().encode(msg));
        }
    }
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

window.initConsoleModule = initConsoleModule;