package org.alex.everyWeb.modules.impl.console;

import com.pty4j.PtyProcess;
import com.pty4j.PtyProcessBuilder;
import com.pty4j.WinSize;
import org.alex.everyWeb.common.logging.SafeLog;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.BinaryWebSocketHandler;

import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Component
public class ConsoleWebSocketHandler extends BinaryWebSocketHandler {

    private static final AtomicInteger activeSessions = new AtomicInteger(0);
    private static final Map<String, WebSocketSession> activeSessionsMap = new ConcurrentHashMap<>();

    public Collection<WebSocketSession> getActiveSessions() {
        return activeSessionsMap.values();
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        // Лимита нет. Просто инкремент для статистики.
        int active = activeSessions.incrementAndGet();

        PtyProcess pty;
        try {
            Map<String, String> env = new HashMap<>(System.getenv());
            env.put("TERM", "xterm-256color");
            env.put("COLORTERM", "truecolor");

            pty = new PtyProcessBuilder()
                    .setCommand(new String[]{"/bin/bash", "-l"})
                    .setEnvironment(env)
                    .setDirectory("/home/alsa")
                    .setInitialColumns(120)
                    .setInitialRows(30)
                    .start();
        } catch (Exception e) {
            activeSessions.decrementAndGet();
            session.close(CloseStatus.SERVER_ERROR.withReason("PTY start failed: " + e.getMessage()));
            SafeLog.error("Console PTY start failed: {}", e.getMessage(), e);
            return;
        }

        session.getAttributes().put("pty", pty);
        session.getAttributes().put("lastHeartbeat", System.currentTimeMillis());
        activeSessionsMap.put(session.getId(), session);

        // Логируем подключение: id, IP, активных сессий
        String remote = extractRemoteAddress(session);
        SafeLog.info("Console session opened: id={}, remote={}, active={}",
                session.getId(), remote, active);

        // Reader thread: PTY stdout → WebSocket
        // Стек 256 КБ вместо 1 МБ (экономия native-памяти при 1000+ сессий)
        Runnable readerTask = () -> {
            try {
                InputStream in = pty.getInputStream();
                byte[] buf = new byte[8192];
                int n;
                while ((n = in.read(buf)) != -1) {
                    if (session.isOpen()) {
                        session.sendMessage(new BinaryMessage(Arrays.copyOf(buf, n)));
                    } else {
                        break;
                    }
                }
            } catch (Exception e) {
                SafeLog.debug("Console reader stopped: {}", e.getMessage());
            } finally {
                try { session.close(CloseStatus.NORMAL); } catch (Exception ignored) {}
            }
        };

        Thread reader = new Thread(null, readerTask, "console-reader-" + session.getId(), 256 * 1024);
        reader.setDaemon(true);
        reader.start();
    }

    @Override
    protected void handleBinaryMessage(WebSocketSession session, BinaryMessage message) throws Exception {
        // Heartbeat: обновляем время последней активности с фронта
        session.getAttributes().put("lastHeartbeat", System.currentTimeMillis());

        PtyProcess pty = (PtyProcess) session.getAttributes().get("pty");
        if (pty == null) return;

        byte[] payload = new byte[message.getPayload().remaining()];
        message.getPayload().get(payload);

        // resize-сообщение?
        if (payload.length > 0 && payload[0] == '{') {
            String text = new String(payload, StandardCharsets.UTF_8);
            if (text.contains("\"type\":\"resize\"")) {
                try {
                    int cols = extractInt(text, "cols");
                    int rows = extractInt(text, "rows");
                    if (cols > 0 && rows > 0) {
                        pty.setWinSize(new WinSize(cols, rows));
                    }
                } catch (Exception ignored) {}
                return;
            }
        }

        // Обычный ввод в PTY
        OutputStream out = pty.getOutputStream();
        out.write(payload);
        out.flush();
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        PtyProcess pty = (PtyProcess) session.getAttributes().get("pty");
        if (pty != null) {
            try { pty.destroy(); } catch (Exception ignored) {}
        }
        activeSessionsMap.remove(session.getId());
        int remaining = activeSessions.decrementAndGet();

        String remote = extractRemoteAddress(session);
        SafeLog.info("Console session closed: id={}, remote={}, status={}, active={}",
                session.getId(), remote, status, Math.max(0, remaining));
    }

    /**
     * Ночная уборка: 05:00 по Самаре. Убиваем все активные сессии.
     * (Токены отзывает ConsoleTokenService.nightlyCleanup в то же время.)
     */
    @Scheduled(cron = "0 0 5 * * *", zone = "Europe/Samara")
    public void killAllSessions() {
        int count = 0;
        for (WebSocketSession session : activeSessionsMap.values()) {
            try {
                session.close(CloseStatus.NORMAL.withReason("Nightly cleanup"));
                count++;
            } catch (Exception e) {
                SafeLog.debug("Failed to close session {}: {}", session.getId(), e.getMessage());
            }
        }
        SafeLog.info("Console: killed {} sessions (nightly cleanup at 05:00 Samara)", count);
    }

    private String extractRemoteAddress(WebSocketSession session) {
        try {
            InetSocketAddress addr = session.getRemoteAddress();
            return addr != null ? addr.getAddress().getHostAddress() : "unknown";
        } catch (Exception e) {
            return "unknown";
        }
    }

    private int extractInt(String json, String key) {
        int i = json.indexOf("\"" + key + "\":");
        if (i < 0) return 0;
        i += key.length() + 3;
        int j = i;
        while (j < json.length() && (Character.isDigit(json.charAt(j)) || json.charAt(j) == '-')) j++;
        return Integer.parseInt(json.substring(i, j));
    }
}