package org.alex.everyWeb.config;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class PasswordService {

    private final PasswordEncoder passwordEncoder;

    public PasswordService() {
        this.passwordEncoder = new BCryptPasswordEncoder();
    }

    /**
     * Шифрует пароль с помощью BCrypt
     */
    public String encodePassword(String rawPassword) {
        if (rawPassword == null || rawPassword.isEmpty()) {
            return null;
        }
        return passwordEncoder.encode(rawPassword);
    }

    /**
     * Проверяет, совпадает ли введенный пароль с зашифрованным
     */
    public boolean matches(String rawPassword, String encodedPassword) {
        if (rawPassword == null || encodedPassword == null) {
            return false;
        }
        return passwordEncoder.matches(rawPassword, encodedPassword);
    }

    /**
     * Проверяет, зашифрован ли пароль (для миграции)
     */
    public boolean isEncrypted(String password) {
        if (password == null || password.isEmpty()) {
            return true;
        }
        // BCrypt хэши начинаются с $2a$, $2b$ или $2y$
        return password.startsWith("$2a$") ||
                password.startsWith("$2b$") ||
                password.startsWith("$2y$");
    }
}