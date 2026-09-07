package org.alex.everyWeb.modules.impl.system;

import org.alex.everyWeb.modules.core.Module;
import oshi.SystemInfo;
import oshi.hardware.HardwareAbstractionLayer;

public abstract class SystemModule extends Module {

    protected static final SystemInfo SYSTEM_INFO = new SystemInfo();
    protected static final HardwareAbstractionLayer HARDWARE = SYSTEM_INFO.getHardware();

    protected long lastUpdateTime = 0;
    protected int updateIntervalMs = 5000;

    protected boolean shouldUpdate() {
        long now = System.currentTimeMillis();
        if (now - lastUpdateTime >= updateIntervalMs) {
            lastUpdateTime = now;
            return true;
        }
        return false;
    }
}