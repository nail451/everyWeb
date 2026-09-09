package org.alex.everyWeb.push;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class PushInitializer {

    @Autowired
    private PushNotificationService pushService;

    @PostConstruct
    public void init() {
        pushService.initCache();
        System.out.println("✅ Push subscriptions loaded from database");
    }
}