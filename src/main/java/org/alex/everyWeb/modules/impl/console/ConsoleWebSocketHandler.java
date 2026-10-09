package org.alex.everyWeb.modules.impl.console;

import com.pty4j.PtyProcess;
import com.pty4j.PtyProcessBuilder;
import com.pty4j.WinSize;
import org.alex.everyWeb.common.logging.SafeLog;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.BinaryWebSocketHandler;

import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

@Component
public class ConsoleWebSocketHandler extends BinaryWebSocketHandler {

    private static final AtomicInteger activeSessions = new AtomicInteger(0);

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        if (activeSessions.incrementAndGet() > 1) {
            activeSessions.decrementAndGet();
            session.close(CloseStatus.POLICY_VIOLATION.withReason("Only one console session allowed"));
            return;
        }

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
        SafeLog.info("Console session opened (active={})", activeSessions.get());

        Thread reader = new Thread(() -> {
            try (InputStream in = pty.getInputStream()) {
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
                // session closed or PTY died — нормально
            } finally {
                try { session.close(CloseStatus.NORMAL); } catch (Exception ignored) {}
            }
        }, "console-reader-" + session.getId());
        reader.setDaemon(true);
        reader.start();
    }

    @Override
    protected void handleBinaryMessage(WebSocketSession session, BinaryMessage message) throws Exception {
        PtyProcess pty = (PtyProcess) session.getAttributes().get("pty");
        if (pty == null) return;

        byte[] payload = new byte[message.getPayload().remaining()];
        message.getPayload().get(payload);

        // resize-сообщение? (текстовый JSON)
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

        try (OutputStream out = pty.getOutputStream()) {
            out.write(payload);
            out.flush();
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        PtyProcess pty = (PtyProcess) session.getAttributes().get("pty");
        if (pty != null) {
            try { pty.destroy(); } catch (Exception ignored) {}
        }
        int remaining = activeSessions.decrementAndGet();
        SafeLog.info("Console session closed (status={}, active={})", status, Math.max(0, remaining));
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