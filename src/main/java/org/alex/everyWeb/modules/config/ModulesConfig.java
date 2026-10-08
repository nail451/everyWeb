package org.alex.everyWeb.modules.config;

import jakarta.annotation.PostConstruct;
import org.alex.everyWeb.modules.core.Module;
import org.alex.everyWeb.modules.core.ModuleRegistry;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;

@Configuration
public class ModulesConfig {

    private static final Logger log = LoggerFactory.getLogger(ModulesConfig.class);

    @Autowired
    private ModuleRegistry moduleRegistry;

    @Autowired(required = false)
    private List<Module> modules;

    @PostConstruct
    public void init() {
        if (modules != null) {
            for (Module module : modules) {
                moduleRegistry.register(module);
                log.info("✅ Module registered: {} - {}", module.getInfo().getType(), module.getInfo().getName());
            }
        }
    }
}