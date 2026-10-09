package org.alex.everyWeb.modules.impl.system;

import org.alex.everyWeb.modules.api.ModuleConfig;
import org.alex.everyWeb.modules.api.ModuleData;
import org.alex.everyWeb.modules.api.ModuleInfo;
import org.springframework.stereotype.Component;
import oshi.hardware.HWDiskStore;
import oshi.hardware.HWPartition;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class DiskModule extends SystemModule {

    private static final Logger log = LoggerFactory.getLogger(DiskModule.class);

    // Псевдо-ФС, которые не показываем
    private static final Set<String> PSEUDO_FS = Set.of(
            "tmpfs", "devtmpfs", "devpts", "proc", "sysfs", "cgroup", "cgroup2",
            "overlay", "squashfs", "efivarfs", "mqueue", "hugetlbfs", "debugfs",
            "tracefs", "securityfs", "pstore", "bpf", "autofs", "fusectl",
            "configfs", "ramfs", "binfmt_misc", "rpc_pipefs", "nsfs",
            "fuse.gvfsd-fuse", "fuse.portal", "sunrpc"
    );

    public DiskModule() {
        this.updateIntervalMs = 10000;
    }

    @Override
    public ModuleInfo getInfo() {
        ModuleInfo info = new ModuleInfo();
        info.setType("DISK");
        info.setName("Диски");
        info.setDescription("Информация о дисках и свободном месте");
        info.setIcon("💾");
        info.setVersion("2.0.0");
        info.setAuthor("System");
        info.setEnabled(true);
        info.setConfigurable(true);
        info.setCssClass("disk-module");
        return info;
    }

    @Override
    public ModuleData createData(ModuleConfig config) {
        ModuleData data = new ModuleData("DISK", "Диски");
        data.setContent(getDiskData());
        data.setConfig(config);
        return data;
    }

    @Override
    public ModuleData updateData(ModuleData data, ModuleConfig config) {
        if (shouldUpdate()) {
            data.setContent(getDiskData());
        }
        data.setConfig(config);
        return data;
    }

    private Map<String, Object> getDiskData() {
        Map<String, Object> result = new HashMap<>();
        List<Map<String, Object>> disks = new ArrayList<>();

        try {
            List<HWDiskStore> diskStores = HARDWARE.getDiskStores();
            Map<String, MountInfo> mounts = readProcMounts();
            Map<String, Double> nvmeTemps = readNvmeTemperatures(); // device -> temp

            if (diskStores == null || diskStores.isEmpty()) {
                result.put("disks", disks);
                result.put("diskCount", 0);
                result.put("message", "Диски не обнаружены");
                return result;
            }

            for (HWDiskStore disk : diskStores) {
                // Пропускаем loop-устройства и ram-диски
                String devName = disk.getName();
                if (devName != null && (devName.startsWith("loop") || devName.startsWith("ram"))) {
                    continue;
                }

                Map<String, Object> diskInfo = new LinkedHashMap<>();

                String model = disk.getModel();
                String serial = disk.getSerial();
                String displayName = (model != null && !model.isBlank())
                        ? model.trim()
                        : (devName != null ? devName : "Unknown");

                diskInfo.put("name", displayName);
                diskInfo.put("device", devName);
                diskInfo.put("model", model != null ? model.trim() : "N/A");
                diskInfo.put("serial", serial != null ? serial.trim() : "");
                diskInfo.put("size", formatBytes(disk.getSize()));
                diskInfo.put("sizeBytes", disk.getSize());
                diskInfo.put("type", detectDiskType(devName));

                // Температура NVMe (если есть)
                if (nvmeTemps.containsKey(devName)) {
                    diskInfo.put("temperature", nvmeTemps.get(devName));
                }

                // === ПАРТИЦИИ ===
                List<Map<String, Object>> partitions = new ArrayList<>();
                List<HWPartition> partitionList = disk.getPartitions();

                if (partitionList != null) {
                    for (HWPartition partition : partitionList) {
                        Map<String, Object> partInfo = new LinkedHashMap<>();

                        String partDev = partition.getName();       // nvme0n1p2
                        String mountPoint = partition.getMountPoint(); // может быть пусто
                        String identification = partition.getIdentification();

                        // Если OSHI не дал mountPoint — ищем в /proc/mounts по устройству
                        if (mountPoint == null || mountPoint.isBlank()) {
                            MountInfo mi = findByDevice(mounts, partDev);
                            if (mi != null) mountPoint = mi.mountPoint;
                        }

                        partInfo.put("name", identification != null ? identification : partDev);
                        partInfo.put("device", partDev);
                        partInfo.put("mountPoint", mountPoint != null ? mountPoint : "");
                        partInfo.put("size", formatBytes(partition.getSize()));
                        partInfo.put("sizeBytes", partition.getSize());
                        partInfo.put("type", partition.getType() != null ? partition.getType() : "");

                        // Данные о свободном месте — по маунту
                        if (mountPoint != null && !mountPoint.isBlank()) {
                            File mountFile = new File(mountPoint);
                            if (mountFile.exists()) {
                                long total = mountFile.getTotalSpace();
                                long free = mountFile.getFreeSpace();
                                long usable = mountFile.getUsableSpace();
                                long used = total - free;
                                double usedPercent = total > 0
                                        ? Math.round((used * 100.0) / total * 10) / 10.0
                                        : 0;

                                partInfo.put("totalSpace", formatBytes(total));
                                partInfo.put("totalSpaceBytes", total);
                                partInfo.put("freeSpace", formatBytes(free));
                                partInfo.put("freeSpaceBytes", free);
                                partInfo.put("usableSpace", formatBytes(usable));
                                partInfo.put("usedSpace", formatBytes(used));
                                partInfo.put("usedPercent", usedPercent);
                            }
                        }

                        partitions.add(partInfo);
                    }
                }
                diskInfo.put("partitions", partitions);

                // Статистика I/O
                diskInfo.put("reads", disk.getReads());
                diskInfo.put("writes", disk.getWrites());
                diskInfo.put("readBytes", formatBytes(disk.getReadBytes()));
                diskInfo.put("writeBytes", formatBytes(disk.getWriteBytes()));

                disks.add(diskInfo);
            }

            result.put("disks", disks);
            result.put("diskCount", disks.size());

        } catch (Exception e) {
            log.error("Error getting disk data: {}", e.getMessage(), e);
            result.put("error", "Ошибка получения данных о дисках: " + e.getMessage());
        }

        return result;
    }

    /**
     * Чтение /proc/mounts → map mountPoint → MountInfo
     */
    private Map<String, MountInfo> readProcMounts() {
        Map<String, MountInfo> result = new LinkedHashMap<>();
        File f = new File("/proc/mounts");
        if (!f.exists()) return result;

        try (BufferedReader reader = new BufferedReader(new FileReader(f))) {
            String line;
            while ((line = reader.readLine()) != null) {
                String[] parts = line.split("\\s+");
                if (parts.length < 3) continue;

                String device = parts[0];
                String mountPoint = unescapeOctal(parts[1]);
                String fsType = parts[2];

                if (PSEUDO_FS.contains(fsType)) continue;
                if (device.startsWith("none")) continue;

                MountInfo mi = new MountInfo();
                mi.device = device;
                mi.mountPoint = mountPoint;
                mi.fsType = fsType;
                result.put(mountPoint, mi);
            }
        } catch (Exception e) {
            log.error("Error reading /proc/mounts: {}", e.getMessage());
        }
        return result;
    }

    /**
     * Поиск маунта по имени устройства (nvme0n1p2 → /, /home и т.д.)
     */
    private MountInfo findByDevice(Map<String, MountInfo> mounts, String device) {
        if (device == null) return null;
        for (MountInfo mi : mounts.values()) {
            if (device.equals(mi.device)) return mi;
            // /dev/nvme0n1p2 → nvme0n1p2
            if (mi.device.endsWith("/" + device)) return mi;
        }
        return null;
    }

    /**
     * Тип диска: NVMe / SSD / HDD — по имени устройства и /sys/block/<dev>/queue/rotational
     */
    private String detectDiskType(String device) {
        if (device == null) return "Unknown";
        String dev = device.replace("/dev/", "");

        if (dev.startsWith("nvme")) return "NVMe";

        // Проверяем rotational: 1 = HDD, 0 = SSD
        try {
            File rotFile = new File("/sys/block/" + dev + "/queue/rotational");
            if (rotFile.exists()) {
                try (BufferedReader r = new BufferedReader(new FileReader(rotFile))) {
                    String val = r.readLine();
                    if ("1".equals(val != null ? val.trim() : "")) return "HDD";
                    return "SSD";
                }
            }
        } catch (Exception e) {
            // ignore
        }
        return "Unknown";
    }

    /**
     * Температура NVMe из `sensors -j`.
     * Ищем чипы с "nvme" в имени, берём Composite temp.
     * Возвращает map: nvme0n1 → temp
     */
    private Map<String, Double> readNvmeTemperatures() {
        Map<String, Double> result = new HashMap<>();
        try {
            ProcessBuilder pb = new ProcessBuilder("sensors", "-j");
            Process process = pb.start();

            StringBuilder sb = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) sb.append(line);
            }
            if (!process.waitFor(2, TimeUnit.SECONDS)) {
                process.destroyForcibly();
                return result;
            }

            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            com.fasterxml.jackson.databind.JsonNode root = mapper.readTree(sb.toString());

            Iterator<Map.Entry<String, com.fasterxml.jackson.databind.JsonNode>> chips = root.fields();
            while (chips.hasNext()) {
                Map.Entry<String, com.fasterxml.jackson.databind.JsonNode> e = chips.next();
                String chipName = e.getKey().toLowerCase();
                if (!chipName.startsWith("nvme")) continue;

                // Имя чипа: nvme-pci-0100 — не даёт нам device name напрямую.
                // Берём первое найденное значение Composite.
                com.fasterxml.jackson.databind.JsonNode chip = e.getValue();
                com.fasterxml.jackson.databind.JsonNode composite = chip.get("Composite");
                if (composite != null && composite.isObject()) {
                    Iterator<Map.Entry<String, com.fasterxml.jackson.databind.JsonNode>> inner = composite.fields();
                    while (inner.hasNext()) {
                        Map.Entry<String, com.fasterxml.jackson.databind.JsonNode> ie = inner.next();
                        if (ie.getKey().endsWith("_input") && ie.getValue().isNumber()) {
                            // Привязываем ко всем NVMe-устройствам (у нас один)
                            result.put("nvme0n1", ie.getValue().asDouble());
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.debug("NVMe temperature not available: {}", e.getMessage());
        }
        return result;
    }

    /**
     * Разэкранирование octal-последовательностей в /proc/mounts
     * (пробелы кодируются как \040 и т.п.)
     */
    private String unescapeOctal(String s) {
        if (s == null || !s.contains("\\")) return s;
        Pattern p = Pattern.compile("\\\\(\\d{3})");
        Matcher m = p.matcher(s);
        StringBuffer sb = new StringBuffer();
        while (m.find()) {
            int code = Integer.parseInt(m.group(1), 8);
            m.appendReplacement(sb, Matcher.quoteReplacement(String.valueOf((char) code)));
        }
        m.appendTail(sb);
        return sb.toString();
    }

    private String formatBytes(long bytes) {
        if (bytes < 0) return "0 B";
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return String.format("%.1f KB", bytes / 1024.0);
        if (bytes < 1024 * 1024 * 1024) return String.format("%.1f MB", bytes / (1024.0 * 1024));
        if (bytes < 1024L * 1024 * 1024 * 1024) return String.format("%.2f GB", bytes / (1024.0 * 1024 * 1024));
        return String.format("%.2f TB", bytes / (1024.0 * 1024 * 1024 * 1024));
    }

    private static class MountInfo {
        String device;
        String mountPoint;
        String fsType;
    }
}