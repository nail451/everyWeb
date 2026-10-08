package org.alex.everyWeb.common.logging;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class SafeLog {

    private static final Logger log = LoggerFactory.getLogger("SafeLog");
    private static SensitiveDataMasker masker;

    @Autowired
    public void setMasker(SensitiveDataMasker masker) {
        SafeLog.masker = masker;
    }

    private static Object[] maskArgs(Object... args) {
        if (masker == null) return args;
        Object[] masked = new Object[args.length];
        for (int i = 0; i < args.length; i++) masked[i] = masker.mask(args[i]);
        return masked;
    }

    public static void info(String message, Object... args) {
        log.info(message, maskArgs(args));
    }

    public static void warn(String message, Object... args) {
        log.warn(message, maskArgs(args));
    }

    public static void error(String message, Object... args) {
        log.error(message, maskArgs(args));
    }

    public static void debug(String message, Object... args) {
        log.debug(message, maskArgs(args));
    }
}