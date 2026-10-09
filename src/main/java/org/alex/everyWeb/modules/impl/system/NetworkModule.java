package org.alex.everyWeb.modules.impl.system;

import org.alex.everyWeb.modules.api.ModuleConfig;
import org.alex.everyWeb.modules.api.ModuleData;
import org.alex.everyWeb.modules.api.ModuleInfo;
import org.springframework.stereotype.Component;
import oshi.hardware.NetworkIF;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class NetworkModule extends SystemModule {

    private static final Logger log = LoggerFactory.getLogger(NetworkModule.class);

    private Map<String, Long> prevRxBytes = new HashMap<>();
    private Map<String, Long> prevTxBytes = new HashMap<>();
    private Map<String, Long> prevTime = new HashMap<>();

    // Кэш выбранного интерфейса
    private String cachedInterfaceName = null;
    private long cachedInterfaceTime = 0;
    private static final long INTERFACE_CACHE_TTL = 10_000; // 10 секунд

    public NetworkModule() {
        this.updateIntervalMs = 2000;
    }

    @Override
    public ModuleInfo getInfo() {
        ModuleInfo info = new ModuleInfo();
        info.setType("NETWORK");
        info.setName("Сеть");
        info.setDescription("Скорость сети");
        info.setIcon("🌐");
        info.setVersion("2.0.0");
        info.setAuthor("System");
        info.setEnabled(true);
        info.setConfigurable(true);
        info.setCssClass("network-module");
        return info;
    }

    @Override
    public ModuleData createData(ModuleConfig config) {
        ModuleData data = new ModuleData("NETWORK", "Сеть");
        data.setContent(getNetworkData());
        data.setConfig(config);
        return data;
    }

    @Override
    public ModuleData updateData(ModuleData data, ModuleConfig config) {
        if (shouldUpdate()) {
            data.setContent(getNetworkData());
        }
        data.setConfig(config);
        return data;
    }

    private Map<String, Object> getNetworkData() {
        Map<String, Object> result = new HashMap<>();

        try {
            List<NetworkIF> netIFs = HARDWARE.getNetworkIFs();

            if (netIFs == null || netIFs.isEmpty()) {
                result.put("error", "Сетевые интерфейсы не обнаружены");
                return result;
            }

            NetworkIF activeNet = findActiveInterface(netIFs);

            if (activeNet == null) {
                result.put("error", "Активный сетевой интерфейс не найден");
                return result;
            }

            activeNet.updateAttributes();

            String name = activeNet.getName();
            String displayName = activeNet.getDisplayName();

            long rxBytes = activeNet.getBytesRecv();
            long txBytes = activeNet.getBytesSent();
            long speed = activeNet.getSpeed();

            // Скорость передачи
            long rxSpeed = 0;
            long txSpeed = 0;

            if (prevRxBytes.containsKey(name) && prevTxBytes.containsKey(name)) {
                long prevRx = prevRxBytes.get(name);
                long prevTx = prevTxBytes.get(name);
                long prevTimeVal = prevTime.getOrDefault(name, System.currentTimeMillis());
                long timeDiff = System.currentTimeMillis() - prevTimeVal;

                if (timeDiff > 0) {
                    rxSpeed = Math.max(0, (rxBytes - prevRx) * 1000 / timeDiff);
                    txSpeed = Math.max(0, (txBytes - prevTx) * 1000 / timeDiff);
                }
            }

            prevRxBytes.put(name, rxBytes);
            prevTxBytes.put(name, txBytes);
            prevTime.put(name, System.currentTimeMillis());

            result.put("interface", displayName != null && !displayName.isBlank() ? displayName : name);
            result.put("interfaceName", name);
            result.put("rxSpeed", formatSpeed(rxSpeed));
            result.put("rxSpeedBytes", rxSpeed);
            result.put("txSpeed", formatSpeed(txSpeed));
            result.put("txSpeedBytes", txSpeed);
            result.put("rxTotal", formatBytes(rxBytes));
            result.put("txTotal", formatBytes(txBytes));
            result.put("speed", speed > 0 ? (speed / 1_000_000) + " Mbps" : "N/A");
            result.put("ip", getIpAddress(activeNet));

        } catch (Exception e) {
            log.error("Error getting network data: {}", e.getMessage());
            result.put("error", "Ошибка получения данных о сети: " + e.getMessage());
        }

        return result;
    }

    private NetworkIF findActiveInterface(List<NetworkIF> interfaces) {
        // Если есть закэшированный интерфейс и он ещё жив — возвращаем его
        if (cachedInterfaceName != null
                && System.currentTimeMillis() - cachedInterfaceTime < INTERFACE_CACHE_TTL) {
            for (NetworkIF net : interfaces) {
                if (cachedInterfaceName.equals(net.getName())) {
                    return net;
                }
            }
        }

        NetworkIF bestMatch = null;
        long maxBytes = 0;

        for (NetworkIF net : interfaces) {
            try {
                net.updateAttributes();

                String name = net.getName() != null ? net.getName().toLowerCase() : "";
                String displayName = net.getDisplayName() != null ? net.getDisplayName().toLowerCase() : "";

                if (isExcludedInterface(name, displayName)) {
                    continue;
                }

                // Есть ли IP?
                String[] ips = net.getIPv4addr();
                boolean hasIp = false;
                if (ips != null) {
                    for (String ip : ips) {
                        if (ip != null && !ip.isEmpty() && !ip.equals("0.0.0.0") && !ip.startsWith("169.254")) {
                            hasIp = true;
                            break;
                        }
                    }
                }
                if (!hasIp) {
                    continue;
                }

                boolean isPreferred = isPreferredInterface(name, displayName);
                long totalBytes = net.getBytesRecv() + net.getBytesSent();

                boolean bestIsPreferred = false;
                if (bestMatch != null) {
                    String bestName = bestMatch.getName() != null ? bestMatch.getName().toLowerCase() : "";
                    String bestDisplay = bestMatch.getDisplayName() != null ? bestMatch.getDisplayName().toLowerCase() : "";
                    bestIsPreferred = isPreferredInterface(bestName, bestDisplay);
                }

                if (bestMatch == null) {
                    // Первый подходящий
                    bestMatch = net;
                    maxBytes = totalBytes;
                } else if (isPreferred && !bestIsPreferred) {
                    // Preferred побеждает не-preferred
                    bestMatch = net;
                    maxBytes = totalBytes;
                } else if (isPreferred == bestIsPreferred && totalBytes > maxBytes) {
                    // Равный приоритет — по трафику
                    bestMatch = net;
                    maxBytes = totalBytes;
                }
            } catch (Exception e) {
                // игнорируем отдельные интерфейсы
            }
        }

        if (bestMatch != null) {
            cachedInterfaceName = bestMatch.getName();
            cachedInterfaceTime = System.currentTimeMillis();
        }
        return bestMatch;
    }

    /**
     * Исключаем loopback, docker, veth, br-, virbr, tun, tap, wg, tailscale, zt, wsl, hyper-v
     */
    private boolean isExcludedInterface(String name, String displayName) {
        String[] excludedPrefixes = {
                "lo", "docker", "veth", "br-", "virbr", "tun", "tap", "wg",
                "tailscale", "zt", "wsl", "hyper-v", "vmnet", "vboxnet", "bluetooth"
        };
        for (String p : excludedPrefixes) {
            if (name.startsWith(p) || displayName.startsWith(p)) return true;
        }
        // Точные имена
        if (name.equals("lo") || displayName.equals("loopback")) return true;
        // Содержит
        if (name.contains("virtual") || displayName.contains("virtual")) return true;
        if (name.contains("vpn") || displayName.contains("vpn")) return true;
        return false;
    }

    /**
     * Приоритетные интерфейсы: en*, eth*, wl*, wlan*
     */
    private boolean isPreferredInterface(String name, String displayName) {
        String[] preferredPrefixes = {"en", "eth", "wl", "wlan"};
        for (String p : preferredPrefixes) {
            if (name.startsWith(p)) return true;
        }
        return false;
    }

    private String getIpAddress(NetworkIF net) {
        try {
            String[] ips = net.getIPv4addr();
            if (ips != null) {
                for (String ip : ips) {
                    if (ip != null && !ip.isEmpty() && !ip.equals("0.0.0.0") && !ip.startsWith("169.254")) {
                        return ip;
                    }
                }
            }
        } catch (Exception e) {
            // игнорируем
        }
        return "N/A";
    }

    private String formatSpeed(long bytesPerSec) {
        if (bytesPerSec < 0) return "0 B/s";
        if (bytesPerSec < 1024) return bytesPerSec + " B/s";
        if (bytesPerSec < 1024 * 1024) return String.format("%.1f KB/s", bytesPerSec / 1024.0);
        if (bytesPerSec < 1024 * 1024 * 1024) return String.format("%.1f MB/s", bytesPerSec / (1024.0 * 1024));
        return String.format("%.2f GB/s", bytesPerSec / (1024.0 * 1024 * 1024));
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