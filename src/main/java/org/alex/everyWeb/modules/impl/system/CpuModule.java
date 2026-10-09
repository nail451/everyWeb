package org.alex.everyWeb.modules.impl.system;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.alex.everyWeb.modules.api.ModuleConfig;
import org.alex.everyWeb.modules.api.ModuleData;
import org.alex.everyWeb.modules.api.ModuleInfo;
import org.springframework.stereotype.Component;
import oshi.hardware.CentralProcessor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.TimeUnit;

@Component
public class CpuModule extends SystemModule {

    private static final Logger log = LoggerFactory.getLogger(CpuModule.class);

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    // Кэш для данных из sensors
    private Map<String, Object> sensorsCache = new HashMap<>();
    private long lastSensorsUpdate = 0;
    private static final long SENSORS_CACHE_TTL = 2000; // 2 секунды

    // Предыдущие тики для общей загрузки CPU
    private long[] previousTicks = new long[CentralProcessor.TickType.values().length];
    private double previousLoad = 0;

    // Предыдущие тики per-core
    private long[][] previousTicksPerCore = null;
    private double[] previousPerCoreLoad = null;

    public CpuModule() {
        this.updateIntervalMs = 1000;
    }

    @Override
    public ModuleInfo getInfo() {
        ModuleInfo info = new ModuleInfo();
        info.setType("CPU");
        info.setName("Процессор");
        info.setDescription("Загрузка процессора, температура и вентиляторы");
        info.setIcon("📊");
        info.setVersion("2.0.0");
        info.setAuthor("System");
        info.setEnabled(true);
        info.setConfigurable(true);
        info.setCssClass("cpu-module");
        return info;
    }

    @Override
    public ModuleData createData(ModuleConfig config) {
        ModuleData data = new ModuleData("CPU", "Процессор");
        data.setContent(getCpuData());
        data.setConfig(config);
        return data;
    }

    @Override
    public ModuleData updateData(ModuleData data, ModuleConfig config) {
        if (shouldUpdate()) {
            data.setContent(getCpuData());
        }
        data.setConfig(config);
        return data;
    }

    private Map<String, Object> getCpuData() {
        Map<String, Object> result = new HashMap<>();

        CentralProcessor processor = HARDWARE.getProcessor();

        // ===== ОБЩАЯ ЗАГРУЗКА CPU =====
        long[] currentTicks = processor.getSystemCpuLoadTicks();
        double cpuLoad = processor.getSystemCpuLoadBetweenTicks(previousTicks) * 100;
        previousTicks = currentTicks;

        if (cpuLoad < 0 || cpuLoad > 100) {
            cpuLoad = previousLoad;
        } else {
            previousLoad = cpuLoad;
        }

        result.put("load", Math.round(cpuLoad * 10) / 10.0);
        result.put("cores", processor.getLogicalProcessorCount());
        result.put("physicalCores", processor.getPhysicalProcessorCount());

        // ===== ЧАСТОТА =====
        long[] freqs = processor.getCurrentFreq();
        if (freqs != null && freqs.length > 0) {
            long sum = 0;
            for (long f : freqs) sum += f;
            result.put("frequency", (sum / (double) freqs.length) / 1_000_000_000.0);
        }

        // ===== ЗАГРУЗКА ПО ЯДРАМ (РЕАЛЬНАЯ) =====
        int coreCount = processor.getLogicalProcessorCount();
        double[] perCoreLoad = new double[coreCount];

        try {
            if (previousTicksPerCore == null || previousTicksPerCore.length != coreCount) {
                previousTicksPerCore = new long[coreCount][CentralProcessor.TickType.values().length];
                previousPerCoreLoad = new double[coreCount];
            } else {
                double[] loads = processor.getProcessorCpuLoadBetweenTicks(previousTicksPerCore);
                if (loads != null && loads.length == coreCount) {
                    for (int i = 0; i < coreCount; i++) {
                        double l = loads[i];
                        if (l < 0 || l > 1) {
                            l = previousPerCoreLoad[i];
                        } else {
                            previousPerCoreLoad[i] = l;
                        }
                        perCoreLoad[i] = l;
                    }
                }

                long[][] freshTicks = processor.getProcessorCpuLoadTicks();
                if (freshTicks != null && freshTicks.length == coreCount) {
                    previousTicksPerCore = freshTicks;
                }
            }
        } catch (Exception e) {
            log.warn("Failed to read per-core CPU load: {}", e.getMessage());
        }

        result.put("perCoreLoad", perCoreLoad);

        // ===== ДАННЫЕ ИЗ sensors (температура и вентиляторы) =====
        Map<String, Object> sensorsData = getSensorsData();
        result.put("lhm", sensorsData);
        result.put("sensorsAvailable", sensorsData.getOrDefault("available", false));

        return result;
    }

    /**
     * Получение данных из `sensors -j` (lm-sensors)
     */
    private Map<String, Object> getSensorsData() {
        Map<String, Object> result = new HashMap<>();
        result.put("available", false);

        try {
            long now = System.currentTimeMillis();
            if (now - lastSensorsUpdate < SENSORS_CACHE_TTL && !sensorsCache.isEmpty()) {
                result.putAll(sensorsCache);
                result.put("available", true);
                return result;
            }

            String json = readSensorsJson();
            if (json == null || json.isBlank()) {
                if (!sensorsCache.isEmpty()) {
                    result.putAll(sensorsCache);
                    result.put("available", true);
                    return result;
                }
                result.put("message", "sensors не вернул данные");
                return result;
            }

            JsonNode root = OBJECT_MAPPER.readTree(json);
            Map<String, Object> parsed = parseSensorsData(root);

            sensorsCache = parsed;
            lastSensorsUpdate = now;
            result.putAll(parsed);
            result.put("available", true);

            return result;

        } catch (Exception e) {
            log.error("Error reading sensors data: {}", e.getMessage());
            if (!sensorsCache.isEmpty()) {
                result.putAll(sensorsCache);
                result.put("available", true);
                return result;
            }
            result.put("message", "Ошибка чтения sensors: " + e.getMessage());
            return result;
        }
    }

    /**
     * Запуск `sensors -j` и чтение stdout
     */
    private String readSensorsJson() {
        ProcessBuilder pb = new ProcessBuilder("sensors", "-j");
        pb.redirectErrorStream(false);
        Process process = null;
        try {
            process = pb.start();
            StringBuilder sb = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    sb.append(line).append('\n');
                }
            }
            boolean finished = process.waitFor(2, TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                log.warn("sensors -j did not finish in 2s");
                return null;
            }
            if (process.exitValue() != 0) {
                log.warn("sensors -j exited with code {}", process.exitValue());
                return null;
            }
            return sb.toString();
        } catch (Exception e) {
            log.error("Failed to run sensors: {}", e.getMessage());
            if (process != null) process.destroyForcibly();
            return null;
        }
    }

    /**
     * Парсинг JSON от `sensors -j`.
     *
     * Структура:
     * {
     *   "k10temp-pci-00c3": {
     *     "Adapter": "PCI adapter",
     *     "Tctl": { "temp1_input": 76.8 }
     *   },
     *   "thinkpad-isa-0000": {
     *     "Adapter": "ISA adapter",
     *     "fan1": { "fan1_input": 3600 },
     *     "fan2": { "fan2_input": 3600 },
     *     "CPU":  { "temp1_input": 77.0 }
     *   }
     * }
     */
    private Map<String, Object> parseSensorsData(JsonNode root) {
        Map<String, Object> result = new HashMap<>();

        Map<String, Double> cpuTemps = new LinkedHashMap<>();
        List<Map<String, Object>> cpuFans = new ArrayList<>();

        Iterator<Map.Entry<String, JsonNode>> chips = root.fields();
        while (chips.hasNext()) {
            Map.Entry<String, JsonNode> chipEntry = chips.next();
            String chipName = chipEntry.getKey();
            JsonNode chip = chipEntry.getValue();
            if (chip == null || !chip.isObject()) continue;

            String chipLower = chipName.toLowerCase();
            boolean isCpuChip =
                    chipLower.startsWith("k10temp") ||      // AMD
                            chipLower.startsWith("coretemp") ||     // Intel
                            chipLower.startsWith("zenpower") ||     // AMD alt
                            chipLower.startsWith("thinkpad-isa");   // ThinkPad ACPI (CPU temp + fans)

            if (!isCpuChip) continue;

            Iterator<Map.Entry<String, JsonNode>> features = chip.fields();
            while (features.hasNext()) {
                Map.Entry<String, JsonNode> featEntry = features.next();
                String featureName = featEntry.getKey();
                JsonNode feature = featEntry.getValue();
                if (feature == null || !feature.isObject()) continue;

                // --- Температуры ---
                // Ищем поле temp*_input
                Double tempVal = extractNumeric(feature, "temp");
                if (tempVal != null && tempVal > 0 && tempVal < 200) {
                    String label = featureName;
                    // Красивое имя
                    if (label.equalsIgnoreCase("Tctl") || label.equalsIgnoreCase("Tdie")) {
                        label = "CPU Tctl";
                    } else if (label.equalsIgnoreCase("CPU")) {
                        label = "CPU";
                    } else if (label.equalsIgnoreCase("Composite")) {
                        label = "CPU Composite";
                    } else if (label.startsWith("Core")) {
                        // Core 0, Core 1...
                        label = label;
                    } else if (label.startsWith("Package")) {
                        label = label;
                    }
                    if (label.length() > 20) label = label.substring(0, 17) + "...";
                    cpuTemps.put(label, Math.round(tempVal * 10) / 10.0);
                }

                // --- Вентиляторы ---
                Double fanVal = extractNumeric(feature, "fan");
                if (fanVal != null && fanVal >= 0 && fanVal < 50000) {
                    Map<String, Object> fan = new LinkedHashMap<>();
                    String fanName = featureName; // fan1, fan2, CPU Fan...
                    fan.put("name", fanName);
                    fan.put("speed", fanVal.intValue());
                    fan.put("speedFormatted", fanVal.intValue() > 0 ? fanVal.intValue() + " RPM" : "0 RPM");
                    cpuFans.add(fan);
                }
            }
        }

        // --- Температуры ---
        if (!cpuTemps.isEmpty()) {
            double totalTemp = 0;
            double maxTemp = 0;
            int count = 0;
            for (Double t : cpuTemps.values()) {
                totalTemp += t;
                if (t > maxTemp) maxTemp = t;
                count++;
            }
            double avgTemp = count > 0 ? totalTemp / count : 0;
            result.put("cpuTempAvg", Math.round(avgTemp * 10) / 10.0);
            result.put("cpuTempMax", Math.round(maxTemp * 10) / 10.0);
            result.put("cpuTempDetails", cpuTemps);
        }

        // --- Вентиляторы ---
        if (!cpuFans.isEmpty()) {
            result.put("cpuFans", cpuFans);
            result.put("cpuFanCount", cpuFans.size());
            int totalSpeed = 0;
            int maxSpeed = 0;
            for (Map<String, Object> fan : cpuFans) {
                int speed = (int) fan.get("speed");
                totalSpeed += speed;
                if (speed > maxSpeed) maxSpeed = speed;
            }
            result.put("cpuFanAvgSpeed", totalSpeed / cpuFans.size());
            result.put("cpuFanMaxSpeed", maxSpeed);
        }

        return result;
    }

    /**
     * Из feature-объекта извлекает числовое значение по префиксу ключа.
     * Например, для {"temp1_input": 76.8} с prefix="temp" вернёт 76.8.
     * Для {"fan1_input": 3600} с prefix="fan" вернёт 3600.0.
     */
    private Double extractNumeric(JsonNode feature, String prefix) {
        Iterator<Map.Entry<String, JsonNode>> fields = feature.fields();
        while (fields.hasNext()) {
            Map.Entry<String, JsonNode> e = fields.next();
            String key = e.getKey();
            if (key.startsWith(prefix) && key.endsWith("_input")) {
                JsonNode v = e.getValue();
                if (v != null && v.isNumber()) {
                    return v.asDouble();
                }
            }
        }
        return null;
    }
}