package org.alex.everyWeb.common.logging;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Aspect
@Component
public class LoggingAspect {

    private static final Logger log = LoggerFactory.getLogger(LoggingAspect.class);
    private final SensitiveDataMasker masker;

    public LoggingAspect(SensitiveDataMasker masker) {
        this.masker = masker;
    }

    @Around("execution(* org.alex.everyWeb..controller..*(..))")
    public Object logAround(ProceedingJoinPoint pjp) throws Throwable {
        String method = pjp.getSignature().getDeclaringType().getSimpleName()
                + "." + pjp.getSignature().getName();
        Object[] maskedArgs = new Object[pjp.getArgs().length];
        for (int i = 0; i < pjp.getArgs().length; i++) {
            maskedArgs[i] = masker.mask(pjp.getArgs()[i]);
        }
        log.debug("→ {} args={}", method, maskedArgs);
        long start = System.currentTimeMillis();
        try {
            Object result = pjp.proceed();
            log.debug("← {} ({} ms)", method, System.currentTimeMillis() - start);
            return result;
        } catch (Throwable t) {
            log.error("✗ {} threw: {}", method, t.getMessage());
            throw t;
        }
    }
}