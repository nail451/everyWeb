package org.alex.everyWeb.modules.impl.system;

import org.alex.everyWeb.modules.api.ModuleConfig;
import org.alex.everyWeb.modules.api.ModuleData;
import org.alex.everyWeb.modules.api.ModuleInfo;
import org.springframework.stereotype.Component;
import oshi.hardware.NetworkIF;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class NetworkModule extends SystemModule {

    private Map<String, Long> prevRxBytes = new HashMap<>();
    private Map<String, Long> prevTxBytes = new HashMap<>();
    private Map<String, Long> prevTime = new HashMap<>();
    private String activeInterface = null;

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
        info.setVersion("1.0.0");
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

            // Находим активный интерфейс
            NetworkIF activeNet = findActiveInterface(netIFs);

            if (activeNet == null) {
                result.put("error", "Активный сетевой интерфейс не найден");
                return result;
            }

            // Обновляем статистику
            activeNet.updateAttributes();

            String name = activeNet.getName();
            String displayName = activeNet.getDisplayName();

            // Получаем данные
            long rxBytes = activeNet.getBytesRecv();
            long txBytes = activeNet.getBytesSent();
            long rxPackets = activeNet.getPacketsRecv();
            long txPackets = activeNet.getPacketsSent();
            long speed = activeNet.getSpeed();

            // Вычисляем скорость передачи
            long rxSpeed = 0;
            long txSpeed = 0;

            if (prevRxBytes.containsKey(name) && prevTxBytes.containsKey(name)) {
                long prevRx = prevRxBytes.get(name);
                long prevTx = prevTxBytes.get(name);
                long prevTimeVal = prevTime.getOrDefault(name, System.currentTimeMillis());
                long timeDiff = System.currentTimeMillis() - prevTimeVal;

                if (timeDiff > 0) {
                    rxSpeed = (rxBytes - prevRx) * 1000 / timeDiff;
                    txSpeed = (txBytes - prevTx) * 1000 / timeDiff;
                }
            }

            // Сохраняем для следующего вычисления
            prevRxBytes.put(name, rxBytes);
            prevTxBytes.put(name, txBytes);
            prevTime.put(name, System.currentTimeMillis());

            // Форматируем результат
            result.put("interface", displayName != null ? displayName : name);
            result.put("rxSpeed", formatSpeed(rxSpeed));
            result.put("rxSpeedBytes", rxSpeed);
            result.put("txSpeed", formatSpeed(txSpeed));
            result.put("txSpeedBytes", txSpeed);
            result.put("rxTotal", formatBytes(rxBytes));
            result.put("txTotal", formatBytes(txBytes));
            result.put("speed", speed > 0 ? (speed / 1_000_000) + " Mbps" : "N/A");
            result.put("ip", getIpAddress(activeNet));
        } catch (Exception e) {
            System.out.println("Error getting network data: " + e.getMessage());
            result.put("error", "Ошибка получения данных о сети: " + e.getMessage());
        }

        return result;
    }

    /**
     * Находит активный сетевой интерфейс
     */
    private NetworkIF findActiveInterface(List<NetworkIF> interfaces) {
        NetworkIF bestMatch = null;
        long maxBytes = 0;

        for (NetworkIF net : interfaces) {
            try {
                net.updateAttributes();

                // Пропускаем loopback и виртуальные интерфейсы
                String name = net.getName().toLowerCase();
                String displayName = net.getDisplayName().toLowerCase();

                // Пропускаем loopback
                if (name.contains("loopback") || displayName.contains("loopback")) {
                    continue;
                }

                // Пропускаем виртуальные интерфейсы
                if (name.contains("virtual") || displayName.contains("virtual") ||
                        name.contains("hyper-v") || displayName.contains("hyper-v") ||
                        name.contains("vpn") || displayName.contains("vpn") ||
                        name.contains("tun") || displayName.contains("tun") ||
                        name.contains("tap") || displayName.contains("tap") ||
                        name.contains("wsl") || displayName.contains("wsl") ||
                        name.contains("bluetooth") || displayName.contains("bluetooth")) {
                    continue;
                }

                // Проверяем, есть ли трафик
                long totalBytes = net.getBytesRecv() + net.getBytesSent();

                // Если интерфейс имеет IP адрес и трафик - это хороший кандидат
                String[] ips = net.getIPv4addr();
                boolean hasIp = ips != null && ips.length > 0 && !ips[0].isEmpty() && !ips[0].equals("0.0.0.0");

                if (hasIp && totalBytes > 0) {
                    // Если уже есть активный интерфейс с таким же именем, используем его
                    if (activeInterface != null && activeInterface.equals(net.getName())) {
                        return net;
                    }

                    // Выбираем интерфейс с наибольшим трафиком
                    if (totalBytes > maxBytes) {
                        maxBytes = totalBytes;
                        bestMatch = net;
                    }
                }
            } catch (Exception e) {
                // Игнорируем ошибки для отдельных интерфейсов
            }
        }

        // Если нашли по трафику - возвращаем
        if (bestMatch != null) {
            activeInterface = bestMatch.getName();
            return bestMatch;
        }

        // Если не нашли, берем первый Ethernet интерфейс
        for (NetworkIF net : interfaces) {
            try {
                String name = net.getName().toLowerCase();
                String displayName = net.getDisplayName().toLowerCase();

                if (name.contains("ethernet") || displayName.contains("ethernet") ||
                        name.contains("wi-fi") || displayName.contains("wi-fi") ||
                        name.contains("wireless") || displayName.contains("wireless")) {
                    activeInterface = net.getName();
                    return net;
                }
            } catch (Exception e) {
                // Игнорируем
            }
        }

        // Если ничего не нашли - берем первый интерфейс (кроме loopback)
        for (NetworkIF net : interfaces) {
            String name = net.getName().toLowerCase();
            if (!name.contains("loopback")) {
                activeInterface = net.getName();
                return net;
            }
        }

        return null;
    }

    /**
     * Получение IP адреса интерфейса
     */
    private String getIpAddress(NetworkIF net) {
        try {
            String[] ips = net.getIPv4addr();
            if (ips != null && ips.length > 0) {
                for (String ip : ips) {
                    if (ip != null && !ip.isEmpty() && !ip.equals("0.0.0.0") && !ip.startsWith("169.254")) {
                        return ip;
                    }
                }
            }
        } catch (Exception e) {
            // Игнорируем
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