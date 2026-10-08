package org.alex.everyWeb.push;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import org.alex.everyWeb.common.logging.SafeLog;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping("/api/push")
public class PushController {

    private static final Logger log = LoggerFactory.getLogger(PushController.class);

    @Autowired
    private PushNotificationService pushService;

    @Value("${app.push.public-key}")
    private String publicKey;

    @PostMapping("/subscribe")
    public ResponseEntity<?> subscribe(@RequestBody Map<String, Object> request) {
        try {
            String endpoint = (String) request.get("endpoint");
            Map<String, String> keys = (Map<String, String>) request.get("keys");

            SafeLog.info("📨 SUBSCRIBE REQUEST RECEIVED: endpoint={}, keys={}", endpoint, keys);

            if (endpoint == null || keys == null) {
                log.warn("❌ Missing endpoint or keys");
                return ResponseEntity.badRequest().body("Missing endpoint or keys");
            }

            pushService.subscribe(endpoint, keys);
            log.info("✅ Subscription saved, total: {}", pushService.getSubscriptionCount());

            // Проверяем, что сохранилось в БД
            int dbCount = pushService.getSubscriptionCount();
            log.debug("📊 After save - cache count: {}", dbCount);

            return ResponseEntity.ok(Map.of(
                    "status", "ok",
                    "cacheCount", dbCount
            ));
        } catch (Exception e) {
            log.error("❌ Error in subscribe: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/public-key")
    public ResponseEntity<?> getPublicKey() {
        return ResponseEntity.ok(Map.of("publicKey", publicKey));
    }

    @GetMapping("/subscriptions/count")
    public ResponseEntity<?> getSubscriptionsCount() {
        return ResponseEntity.ok(Map.of(
                "count", pushService.getSubscriptionCount()
        ));
    }

    @PostMapping("/test")
    public ResponseEntity<?> testNotification(@RequestBody(required = false) Map<String, String> request) {
        String message = request != null && request.containsKey("message")
                ? request.get("message")
                : "Тестовое уведомление!";

        pushService.sendTestNotification(message);
        return ResponseEntity.ok(Map.of(
                "status", "sent",
                "message", message
        ));
    }

    @DeleteMapping("/subscriptions")
    public ResponseEntity<?> clearSubscriptions() {
        pushService.clearSubscriptions();
        return ResponseEntity.ok().build();
    }

    @GetMapping("/debug")
    public ResponseEntity<?> debug() {
        return ResponseEntity.ok(Map.of(
                "publicKey", publicKey,
                "publicKeyLength", publicKey != null ? publicKey.length() : 0,
                "subscriptionsCount", pushService.getSubscriptionCount()
        ));
    }
}