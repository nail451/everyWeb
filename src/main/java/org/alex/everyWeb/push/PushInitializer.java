package org.alex.everyWeb.push;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Component
public class PushInitializer {

    private static final Logger log = LoggerFactory.getLogger(PushInitializer.class);

    @Autowired
    private PushNotificationService pushService;

    @PostConstruct
    public void init() {
        pushService.initCache();
        log.info("✅ Push subscriptions loaded from database");
    }
}