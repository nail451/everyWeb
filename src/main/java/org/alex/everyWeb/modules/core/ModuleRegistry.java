package org.alex.everyWeb.modules.core;

import jakarta.annotation.PostConstruct;
import org.alex.everyWeb.modules.api.ModuleInfo;
import org.springframework.stereotype.Component;


import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class ModuleRegistry {

    private final Map<String, Module> modules = new ConcurrentHashMap<>();
    private final Map<String, ModuleInfo> moduleInfos = new ConcurrentHashMap<>();

    @PostConstruct
    public void init() {
        // Регистрация будет происходить через @Component
    }

    public void register(Module module) {
        ModuleInfo info = module.getInfo();
        modules.put(info.getType(), module);
        moduleInfos.put(info.getType(), info);
    }

    public Module getModule(String type) {
        return modules.get(type);
    }

    public ModuleInfo getModuleInfo(String type) {
        return moduleInfos.get(type);
    }

    public List<ModuleInfo> getAllModules() {
        return new ArrayList<>(moduleInfos.values());
    }

    public List<ModuleInfo> getEnabledModules() {
        return moduleInfos.values().stream()
                .filter(ModuleInfo::isEnabled)
                .collect(ArrayList::new, ArrayList::add, ArrayList::addAll);
    }
}