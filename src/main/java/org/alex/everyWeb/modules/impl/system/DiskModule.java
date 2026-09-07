package org.alex.everyWeb.modules.impl.system;

import org.alex.everyWeb.modules.api.ModuleConfig;
import org.alex.everyWeb.modules.api.ModuleData;
import org.alex.everyWeb.modules.api.ModuleInfo;
import org.springframework.stereotype.Component;
import oshi.hardware.HWDiskStore;
import oshi.hardware.HWPartition;

import java.io.File;
import java.util.*;

@Component
public class DiskModule extends SystemModule {

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
        info.setVersion("1.0.0");
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

            if (diskStores == null || diskStores.isEmpty()) {
                result.put("disks", disks);
                result.put("diskCount", 0);
                result.put("message", "Диски не обнаружены");
                return result;
            }

            Map<String, FileInfo> fileSystemInfo = getFileSystemInfo();

            for (HWDiskStore disk : diskStores) {
                Map<String, Object> diskInfo = new LinkedHashMap<>();

                // ===== ПОЛУЧАЕМ И ОЧИЩАЕМ ИМЯ =====
                String diskName = disk.getName();
                String model = disk.getModel();

                // Очищаем оба поля
                if (diskName != null) {
                    diskName = cleanDiskName(diskName);
                }
                if (model != null) {
                    model = cleanDiskName(model);
                }

                // Выбираем лучшее имя для отображения
                String displayName = diskName;

                // Если имя начинается с \\.\PHYSICALDRIVE - используем модель
                if (diskName != null && diskName.startsWith("PHYSICALDRIVE")) {
                    if (model != null && !model.isEmpty() && !model.equals("N/A") && !model.equals("Unknown")) {
                        displayName = model;
                    }
                }

                // Если имя все еще содержит PHYSICALDRIVE или \\.\, пробуем модель
                if (displayName == null || displayName.startsWith("PHYSICALDRIVE") || displayName.startsWith("\\\\.\\")) {
                    if (model != null && !model.isEmpty() && !model.equals("N/A") && !model.equals("Unknown")) {
                        displayName = model;
                    }
                }

                // Если модель содержит "стандартные дисковые накопители", очищаем еще раз
                if (displayName != null && displayName.toLowerCase().contains("стандартные")) {
                    displayName = cleanDiskName(displayName);
                }

                // Если все еще пусто - используем физическое имя
                if (displayName == null || displayName.isEmpty() || displayName.equals("N/A")) {
                    displayName = disk.getName();
                    if (displayName != null && displayName.startsWith("\\\\.\\")) {
                        displayName = displayName.substring(4);
                    }
                }

                diskInfo.put("name", displayName != null ? displayName : "Unknown");
                diskInfo.put("physicalName", disk.getName());
                diskInfo.put("model", model != null ? model : "N/A");
                diskInfo.put("size", formatBytes(disk.getSize()));
                diskInfo.put("sizeBytes", disk.getSize());

                // ===== ПАРТИЦИИ =====
                List<Map<String, Object>> partitions = new ArrayList<>();
                List<HWPartition> partitionList = disk.getPartitions();

                if (partitionList != null && !partitionList.isEmpty()) {
                    for (HWPartition partition : partitionList) {
                        Map<String, Object> partInfo = new LinkedHashMap<>();
                        String mountPoint = partition.getMountPoint();
                        String identification = partition.getIdentification();

                        partInfo.put("name", identification != null ? identification : "Unknown");
                        partInfo.put("mountPoint", mountPoint != null ? mountPoint : "");
                        partInfo.put("size", formatBytes(partition.getSize()));
                        partInfo.put("sizeBytes", partition.getSize());
                        partInfo.put("type", partition.getType() != null ? partition.getType() : "");

                        if (mountPoint != null && !mountPoint.isEmpty()) {
                            String driveLetter = mountPoint;
                            if (driveLetter.length() > 0) {
                                FileInfo fileInfo = fileSystemInfo.get(driveLetter);
                                if (fileInfo != null) {
                                    partInfo.put("freeSpace", formatBytes(fileInfo.freeSpace));
                                    partInfo.put("freeSpaceBytes", fileInfo.freeSpace);
                                    partInfo.put("totalSpace", formatBytes(fileInfo.totalSpace));
                                    partInfo.put("totalSpaceBytes", fileInfo.totalSpace);
                                    partInfo.put("usedPercent", fileInfo.usedPercent);
                                }
                            }
                        }

                        partitions.add(partInfo);
                    }
                }
                diskInfo.put("partitions", partitions);

                // ===== СТАТИСТИКА =====
                diskInfo.put("reads", disk.getReads());
                diskInfo.put("writes", disk.getWrites());
                diskInfo.put("readBytes", formatBytes(disk.getReadBytes()));
                diskInfo.put("writeBytes", formatBytes(disk.getWriteBytes()));

                disks.add(diskInfo);
            }

            result.put("disks", disks);
            result.put("diskCount", disks.size());

        } catch (Exception e) {
            System.out.println("Error getting disk data: " + e.getMessage());
            e.printStackTrace();
            result.put("error", "Ошибка получения данных о дисках: " + e.getMessage());
        }

        return result;
    }

    /**
     * Очистка имени диска от лишнего текста
     */
    private String cleanDiskName(String name) {
        if (name == null) return "Unknown";

        // Убираем различные варианты "(стандартные дисковые накопители)" и подобные
        String cleaned = name
                // Основные варианты
                .replaceAll("(?i)\\(стандартные дисковые накопители\\)", "")
                .replaceAll("(?i)\\(Standard disk drives\\)", "")
                .replaceAll("(?i)\\(Standard Disk Drives\\)", "")
                .replaceAll("(?i)стандартные дисковые накопители", "")
                .replaceAll("(?i)Standard disk drives", "")
                .replaceAll("(?i)Standard Disk Drives", "")
                // Варианты с запятой и другими символами
                .replaceAll("(?i)\\(Стандартные дисковые накопители\\)", "")
                .replaceAll("(?i)\\(Стандартные дисковые накопители,", "")
                .replaceAll("(?i), Стандартные дисковые накопители\\)", "")
                .replaceAll("(?i)Стандартные дисковые накопители", "")
                // Варианты с точкой
                .replaceAll("(?i)\\(Стандартные дисковые накопители\\.\\.\\.\\)", "")
                .replaceAll("(?i)\\(Стандартные дисковые накопители...\\)", "")
                .replaceAll("\\s*\\|\\s*", " ")
                .trim();

        // Убираем двойные и множественные пробелы
        cleaned = cleaned.replaceAll("\\s+", " ");

        // Убираем лишние скобки в конце
        cleaned = cleaned.replaceAll("\\s*\\(\\s*\\)\\s*$", "");

        // Если после очистки осталось пусто или слишком коротко, возвращаем оригинал
        if (cleaned.isEmpty() || cleaned.length() < 3) {
            return name;
        }

        return cleaned;
    }

    private Map<String, FileInfo> getFileSystemInfo() {
        Map<String, FileInfo> result = new HashMap<>();

        try {
            File[] roots = File.listRoots();
            for (File root : roots) {
                String path = root.getPath();
                if (path.endsWith("\\")) {
                    path = path.substring(0, path.length() - 1);
                }

                FileInfo info = new FileInfo();
                info.totalSpace = root.getTotalSpace();
                info.freeSpace = root.getFreeSpace();
                info.usableSpace = root.getUsableSpace();
                info.usedSpace = info.totalSpace - info.freeSpace;
                info.usedPercent = info.totalSpace > 0 ?
                        Math.round((info.usedSpace * 100.0) / info.totalSpace * 10) / 10.0 : 0;

                result.put(path, info);
                result.put(path + "\\", info);
            }
        } catch (Exception e) {
            System.out.println("Error getting file system info: " + e.getMessage());
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

    private static class FileInfo {
        long totalSpace;
        long freeSpace;
        long usableSpace;
        long usedSpace;
        double usedPercent;
    }
}