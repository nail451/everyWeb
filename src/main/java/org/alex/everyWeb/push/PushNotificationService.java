package org.alex.everyWeb.push;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.auth.oauth2.GoogleCredentials;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.io.InputStream;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class PushNotificationService {

    @Autowired
    private PushSubscriptionRepository subscriptionRepository;

    private final Map<String, String> fcmTokensCache = new ConcurrentHashMap<>();
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    private String cachedAccessToken = null;
    private long tokenExpiryTime = 0;
    private boolean cacheInitialized = false;

    /**
     * Инициализация кэша из БД при запуске
     */
    @Transactional(readOnly = true)
    public synchronized void initCache() {
        if (cacheInitialized) {
            System.out.println("✅ Cache already initialized, skipping...");
            return;
        }

        try {
            List<PushSubscription> subscriptions = subscriptionRepository.findAll();
            System.out.println("📊 Found " + subscriptions.size() + " subscriptions in DB");

            for (PushSubscription sub : subscriptions) {
                String token = extractTokenFromEndpoint(sub.getEndpoint());
                if (token != null && !token.isEmpty()) {
                    fcmTokensCache.put(sub.getEndpoint(), token);
                    System.out.println("   Loaded token: " + token.substring(0, Math.min(15, token.length())) + "...");
                }
            }
            cacheInitialized = true;
            System.out.println("✅ Push cache initialized with " + fcmTokensCache.size() + " subscriptions from DB");
        } catch (Exception e) {
            System.err.println("❌ Error initializing cache: " + e.getMessage());
            e.printStackTrace();
        }
    }

    @Transactional
    public synchronized void subscribe(String endpoint, Map<String, String> keys) {
        System.out.println("📨 SUBSCRIBE CALLED:");
        System.out.println("   Endpoint: " + endpoint);
        System.out.println("   Keys: " + keys);

        String token = extractTokenFromEndpoint(endpoint);
        if (token == null || token.isEmpty()) {
            System.out.println("⚠️ Could not extract token from endpoint: " + endpoint);
            return;
        }

        // Сохраняем или обновляем в БД
        try {
            PushSubscription subscription = subscriptionRepository.findByEndpoint(endpoint)
                    .orElse(new PushSubscription());

            subscription.setEndpoint(endpoint);
            subscription.setP256dh(keys.get("p256dh"));
            subscription.setAuth(keys.get("auth"));
            subscription.setCreatedAt(System.currentTimeMillis());

            PushSubscription saved = subscriptionRepository.save(subscription);
            System.out.println("✅ Push subscription saved to DB with ID: " + saved.getId());

            // Проверяем, что сохранилось
            List<PushSubscription> check = subscriptionRepository.findAll();
            System.out.println("📊 Total subscriptions in DB after save: " + check.size());

        } catch (Exception e) {
            System.err.println("❌ Error saving to DB: " + e.getMessage());
            e.printStackTrace();
            return;
        }

        // Сохраняем в кэш
        fcmTokensCache.put(endpoint, token);
        System.out.println("✅ FCM token saved, total in cache: " + fcmTokensCache.size());
    }

    public void sendAlarmNotification(Long moduleId, String alarmName, String alarmTime) {
        // Убеждаемся, что кэш инициализирован
        if (!cacheInitialized) {
            initCache();
        }

        if (fcmTokensCache.isEmpty()) {
            System.out.println("⚠️ No FCM tokens to send to");
            return;
        }

        String title = "🔔 " + (alarmName != null ? alarmName : "Будильник");
        String body = "Время: " + (alarmTime != null ? alarmTime : "--:--");

        System.out.println("📤 Sending FCM notification to " + fcmTokensCache.size() + " subscribers");
        System.out.println("   Title: " + title);
        System.out.println("   Body: " + body);

        for (Map.Entry<String, String> entry : fcmTokensCache.entrySet()) {
            String endpoint = entry.getKey();
            String token = entry.getValue();

            try {
                sendFcmNotificationV1(token, title, body, moduleId);
                System.out.println("✅ FCM sent to: " + endpoint);
            } catch (Exception e) {
                String errorMsg = e.getMessage();
                System.err.println("❌ Failed to send FCM to " + endpoint + ": " + errorMsg);

                if (errorMsg != null && (errorMsg.contains("UNREGISTERED") ||
                        errorMsg.contains("NotRegistered") ||
                        errorMsg.contains("410"))) {
                    // Удаляем из кэша и БД
                    fcmTokensCache.remove(endpoint);
                    deleteSubscriptionFromDB(endpoint);
                    System.out.println("🗑️ Removed invalid token: " + endpoint);
                }
            }
        }
    }

    @Transactional
    public void deleteSubscriptionFromDB(String endpoint) {
        subscriptionRepository.findByEndpoint(endpoint).ifPresent(sub -> {
            subscriptionRepository.delete(sub);
            System.out.println("🗑️ Deleted from DB: " + endpoint);
        });
    }

    @Transactional
    public void clearSubscriptions() {
        fcmTokensCache.clear();
        subscriptionRepository.deleteAll();
        System.out.println("🗑️ All subscriptions cleared");
    }

    private void sendFcmNotificationV1(String token, String title, String body, Long moduleId) throws Exception {
        String projectId = getProjectId();
        String url = "https://fcm.googleapis.com/v1/projects/" + projectId + "/messages:send";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Bearer " + getAccessToken());

        Map<String, Object> message = new HashMap<>();
        message.put("token", token);

        Map<String, Object> notification = new HashMap<>();
        notification.put("title", title);
        notification.put("body", body);
        message.put("notification", notification);

        Map<String, Object> data = new HashMap<>();
        data.put("moduleId", String.valueOf(moduleId));
        data.put("timestamp", String.valueOf(System.currentTimeMillis()));
        message.put("data", data);

        Map<String, Object> android = new HashMap<>();
        android.put("priority", "high");
        message.put("android", android);

        Map<String, Object> apns = new HashMap<>();
        Map<String, Object> apnsHeaders = new HashMap<>();
        apnsHeaders.put("apns-priority", "10");
        apns.put("headers", apnsHeaders);
        message.put("apns", apns);

        Map<String, Object> payload = new HashMap<>();
        payload.put("message", message);

        String jsonPayload = objectMapper.writeValueAsString(payload);
        System.out.println("   FCM payload: " + jsonPayload);

        HttpEntity<String> request = new HttpEntity<>(jsonPayload, headers);

        try {
            String response = restTemplate.postForObject(url, request, String.class);
            System.out.println("   FCM response: " + response);
        } catch (Exception e) {
            // Логируем детали ошибки
            System.err.println("❌ FCM error: " + e.getMessage());
            if (e.getMessage().contains("404")) {
                System.err.println("❌ Token is not registered in Firebase project: " + projectId);
                System.err.println("   This token was created for a different Firebase project.");
            }
            throw e;
        }
    }

    private String getAccessToken() throws Exception {
        if (cachedAccessToken != null && System.currentTimeMillis() < tokenExpiryTime) {
            return cachedAccessToken;
        }

        try {
            InputStream serviceAccount = new ClassPathResource("firebase-service-account.json").getInputStream();

            GoogleCredentials credentials = GoogleCredentials.fromStream(serviceAccount)
                    .createScoped(
                            "https://www.googleapis.com/auth/firebase.messaging",
                            "https://www.googleapis.com/auth/cloud-platform"
                    );

            credentials.refreshIfExpired();
            cachedAccessToken = credentials.getAccessToken().getTokenValue();
            tokenExpiryTime = System.currentTimeMillis() + 3600000;

            System.out.println("✅ OAuth2 token obtained successfully");
            return cachedAccessToken;
        } catch (Exception e) {
            System.err.println("❌ Failed to get OAuth2 token: " + e.getMessage());
            throw e;
        }
    }

    private String getProjectId() throws Exception {
        try {
            InputStream serviceAccount = new ClassPathResource("firebase-service-account.json").getInputStream();
            Map<String, Object> json = objectMapper.readValue(serviceAccount, Map.class);
            String projectId = (String) json.get("project_id");
            if (projectId != null && !projectId.isEmpty()) {
                return projectId;
            }
        } catch (Exception e) {
            System.err.println("❌ Failed to read project_id: " + e.getMessage());
        }
        return "everyweb-71176";
    }

    private String extractTokenFromEndpoint(String endpoint) {
        if (endpoint == null) return null;

        if (endpoint.startsWith("https://fcm.googleapis.com/fcm/send/")) {
            return endpoint.substring("https://fcm.googleapis.com/fcm/send/".length());
        }

        if (endpoint.contains("/send/")) {
            String[] parts = endpoint.split("/send/");
            if (parts.length > 1) {
                return parts[1];
            }
        }

        return null;
    }

    public void sendTestNotification(String message) {
        sendAlarmNotification(0L, "Тест", message);
    }

    public int getSubscriptionCount() {
        return fcmTokensCache.size();
    }
}