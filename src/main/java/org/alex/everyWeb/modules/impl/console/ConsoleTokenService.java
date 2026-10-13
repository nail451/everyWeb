package org.alex.everyWeb.modules.impl.console;

import org.alex.everyWeb.common.logging.SafeLog;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ConsoleTokenService {

    private static final long TTL_MS = 24 * 60 * 60 * 1000L; // 24 часа

    private final Map<String, Long> tokens = new ConcurrentHashMap<>();
    private final SecureRandom random = new SecureRandom();

    public String createToken() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        tokens.put(token, System.currentTimeMillis() + TTL_MS);
        return token;
    }

    public boolean isValid(String token) {
        if (token == null || token.isEmpty()) return false;
        Long expiry = tokens.get(token);
        if (expiry == null) return false;
        if (System.currentTimeMillis() > expiry) {
            tokens.remove(token);
            return false;
        }
        return true;
    }

    /**
     * Ночная уборка: 05:00 по Самаре (UTC+4).
     */
    @Scheduled(cron = "0 0 5 * * *", zone = "Europe/Samara")
    public void nightlyCleanup() {
        int count = tokens.size();
        tokens.clear();
        SafeLog.info("Console: revoked {} tokens (nightly cleanup at 05:00 Samara)", count);
    }
}