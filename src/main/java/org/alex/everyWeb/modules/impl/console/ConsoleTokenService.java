package org.alex.everyWeb.modules.impl.console;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ConsoleTokenService {

    private static final long TTL_MS = 60_000; // 60 секунд
    private final Map<String, Long> tokens = new ConcurrentHashMap<>();
    private final SecureRandom random = new SecureRandom();

    public String createToken() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        tokens.put(token, System.currentTimeMillis() + TTL_MS);
        return token;
    }

    /**
     * Проверяет и УДАЛЯЕТ токен (one-time use).
     */
    public boolean consumeToken(String token) {
        if (token == null || token.isEmpty()) return false;
        Long expiry = tokens.remove(token);
        if (expiry == null) return false;
        return System.currentTimeMillis() <= expiry;
    }

    @Scheduled(fixedRate = 30_000)
    public void cleanupExpired() {
        long now = System.currentTimeMillis();
        tokens.entrySet().removeIf(e -> e.getValue() < now);
    }
}