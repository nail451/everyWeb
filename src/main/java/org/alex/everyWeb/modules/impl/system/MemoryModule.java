package org.alex.everyWeb.modules.impl.system;

import org.alex.everyWeb.modules.api.ModuleConfig;
import org.alex.everyWeb.modules.api.ModuleData;
import org.alex.everyWeb.modules.api.ModuleInfo;
import org.springframework.stereotype.Component;
import oshi.hardware.GlobalMemory;
import oshi.hardware.HardwareAbstractionLayer;
import oshi.hardware.VirtualMemory;

import java.util.HashMap;
import java.util.Map;

@Component
public class MemoryModule extends SystemModule {

    public MemoryModule() {
        this.updateIntervalMs = 5000;
    }

    @Override
    public ModuleInfo getInfo() {
        ModuleInfo info = new ModuleInfo();
        info.setType("MEMORY");
        info.setName("Память");
        info.setDescription("Использование оперативной памяти");
        info.setIcon("🧠");
        info.setVersion("1.0.0");
        info.setAuthor("System");
        info.setEnabled(true);
        info.setConfigurable(true);
        info.setCssClass("memory-module");
        return info;
    }

    @Override
    public ModuleData createData(ModuleConfig config) {
        ModuleData data = new ModuleData("MEMORY", "Память");
        data.setContent(getMemoryData());
        data.setConfig(config);
        return data;
    }

    @Override
    public ModuleData updateData(ModuleData data, ModuleConfig config) {
        if (shouldUpdate()) {
            data.setContent(getMemoryData());
        }
        data.setConfig(config);
        return data;
    }

    private Map<String, Object> getMemoryData() {
        Map<String, Object> result = new HashMap<>();

        try {
            GlobalMemory memory = HARDWARE.getMemory();

            // ===== ОСНОВНАЯ ПАМЯТЬ =====
            long total = memory.getTotal();
            long available = memory.getAvailable();
            long used = total - available;

            double usedPercent = (used * 100.0) / total;

            result.put("total", formatBytes(total));
            result.put("totalBytes", total);
            result.put("available", formatBytes(available));
            result.put("availableBytes", available);
            result.put("used", formatBytes(used));
            result.put("usedBytes", used);
            result.put("usedPercent", Math.round(usedPercent * 10) / 10.0);

            // ===== ВИРТУАЛЬНАЯ ПАМЯТЬ (SWAP) =====
            try {
                VirtualMemory virtualMemory = memory.getVirtualMemory();
                if (virtualMemory != null) {
                    long swapTotal = virtualMemory.getSwapTotal();
                    long swapUsed = virtualMemory.getSwapUsed();

                    if (swapTotal > 0) {
                        result.put("swapTotal", formatBytes(swapTotal));
                        result.put("swapUsed", formatBytes(swapUsed));
                        result.put("swapPercent", Math.round((swapUsed * 100.0) / swapTotal * 10) / 10.0);
                    }
                }
            } catch (Exception e) {
                System.out.println("Swap info not available: " + e.getMessage());
            }

            // ===== СТАТИСТИКА ПАМЯТИ (если доступна) =====
            try {
                // Количество страниц в памяти
                long pageSize = memory.getPageSize();
                if (pageSize > 0) {
                    result.put("pageSize", formatBytes(pageSize));
                }
            } catch (Exception e) {
                // Игнорируем
            }
        } catch (Exception e) {
            System.out.println("Error getting memory data: " + e.getMessage());
            result.put("error", "Ошибка получения данных о памяти: " + e.getMessage());
        }

        return result;
    }

    private String formatBytes(long bytes) {
        if (bytes < 0) return "0 B";
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return String.format("%.1f KB", bytes / 1024.0);
        if (bytes < 1024 * 1024 * 1024) return String.format("%.1f MB", bytes / (1024.0 * 1024));
        if (bytes < 1024L * 1024 * 1024 * 1024) return String.format("%.2f GB", bytes / (1024.0 * 1024 * 1024));
        return String.format("%.2f TB", bytes / (1024.0 * 1024 * 1024 * 1024));
    }
}