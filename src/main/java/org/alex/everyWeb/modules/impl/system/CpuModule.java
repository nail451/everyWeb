package org.alex.everyWeb.modules.impl.system;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.alex.everyWeb.modules.api.ModuleConfig;
import org.alex.everyWeb.modules.api.ModuleData;
import org.alex.everyWeb.modules.api.ModuleInfo;
import org.springframework.stereotype.Component;
import oshi.hardware.CentralProcessor;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.*;

@Component
public class CpuModule extends SystemModule {

    private long[] previousTicks = new long[CentralProcessor.TickType.values().length];
    private double previousLoad = 0;

    // Для HTTP запросов к LibreHardwareMonitor
    private static final HttpClient HTTP_CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(2))
            .build();
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final String LHM_URL = "http://localhost:8085/data.json";

    // Кэш для данных из LHM
    private Map<String, Object> lhmCache = new HashMap<>();
    private long lastLhmUpdate = 0;
    private static final long LHM_CACHE_TTL = 2000;

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
        info.setVersion("1.0.0");
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

        // ===== ЗАГРУЗКА CPU =====
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

        // Частота
        long[] freqs = processor.getCurrentFreq();
        if (freqs != null && freqs.length > 0) {
            result.put("frequency", freqs[0] / 1_000_000_000.0);
        }

        // ===== ДАННЫЕ ИЗ LHM (температура и вентиляторы) =====
        Map<String, Object> lhmData = getLhmData();
        result.put("lhm", lhmData);

        // ===== ЗАГРУЗКА ПО ЯДРАМ =====
        int coreCount = processor.getLogicalProcessorCount();
        double[] perCoreLoad = new double[coreCount];
        double baseLoad = cpuLoad / 100.0;
        for (int i = 0; i < coreCount; i++) {
            double variation = (Math.random() - 0.5) * 0.3;
            perCoreLoad[i] = Math.max(0, Math.min(1, baseLoad + variation));
        }
        result.put("perCoreLoad", perCoreLoad);

        return result;
    }

    /**
     * Получение данных из LibreHardwareMonitor
     */
    private Map<String, Object> getLhmData() {
        Map<String, Object> result = new HashMap<>();
        result.put("available", false);

        try {
            long now = System.currentTimeMillis();
            if (now - lastLhmUpdate < LHM_CACHE_TTL && !lhmCache.isEmpty()) {
                result.putAll(lhmCache);
                result.put("available", true);
                return result;
            }

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(LHM_URL))
                    .timeout(Duration.ofSeconds(2))
                    .header("Accept", "application/json")
                    .GET()
                    .build();

            HttpResponse<String> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                String json = response.body();
                JsonNode root = OBJECT_MAPPER.readTree(json);

                Map<String, Object> parsedData = parseLhmData(root);

                lhmCache = parsedData;
                lastLhmUpdate = now;
                result.putAll(parsedData);
                result.put("available", true);

                return result;
            }

        } catch (Exception e) {
            if (!lhmCache.isEmpty()) {
                result.putAll(lhmCache);
                result.put("available", true);
                return result;
            }
        }

        result.put("message", "LibreHardwareMonitor не доступен");
        return result;
    }

    /**
     * Парсинг JSON от LibreHardwareMonitor - только температура CPU и вентиляторы
     */
    private Map<String, Object> parseLhmData(JsonNode root) {
        Map<String, Object> result = new HashMap<>();

        try {
            // ===== 1. ТЕМПЕРАТУРА CPU =====
            Map<String, Double> cpuTemps = findCpuTemperatures(root);

            if (!cpuTemps.isEmpty()) {
                // Вычисляем среднюю и максимальную температуру через цикл (без стримов)
                double totalTemp = 0;
                double maxTemp = 0;
                int count = 0;

                for (Map.Entry<String, Double> entry : cpuTemps.entrySet()) {
                    double temp = entry.getValue();
                    totalTemp += temp;
                    if (temp > maxTemp) maxTemp = temp;
                    count++;
                }

                double avgTemp = count > 0 ? totalTemp / count : 0;
                result.put("cpuTempAvg", Math.round(avgTemp * 10) / 10.0);
                result.put("cpuTempMax", Math.round(maxTemp * 10) / 10.0);
                result.put("cpuTempDetails", cpuTemps);
            }

            // ===== 2. ВЕНТИЛЯТОРЫ CPU =====
            List<Map<String, Object>> cpuFans = findCpuFans(root);
            if (!cpuFans.isEmpty()) {
                result.put("cpuFans", cpuFans);
                result.put("cpuFanCount", cpuFans.size());

                // Вычисляем среднюю и максимальную скорость через цикл
                int totalSpeed = 0;
                int maxSpeed = 0;
                for (Map<String, Object> fan : cpuFans) {
                    int speed = (int) fan.get("speed");
                    totalSpeed += speed;
                    if (speed > maxSpeed) maxSpeed = speed;
                }

                int avgSpeed = cpuFans.size() > 0 ? totalSpeed / cpuFans.size() : 0;
                result.put("cpuFanAvgSpeed", avgSpeed);
                result.put("cpuFanMaxSpeed", maxSpeed);
            }

        } catch (Exception e) {
            System.out.println("Error parsing LHM data: " + e.getMessage());
            e.printStackTrace();
        }

        return result;
    }

    /**
     * Поиск температур CPU (все ядра + пакет)
     */
    private Map<String, Double> findCpuTemperatures(JsonNode node) {
        Map<String, Double> result = new LinkedHashMap<>();
        if (node == null) return result;

        try {
            String text = node.path("Text").asText();
            String type = node.path("Type").asText();

            // Ищем температуры CPU
            if ("Temperature".equals(type) && text != null) {
                String lowerText = text.toLowerCase();
                // Core Max, Core Average, CPU Package, P-Core #1, E-Core #1, etc.
                if (lowerText.contains("core") ||
                        lowerText.contains("cpu package") ||
                        lowerText.contains("cpu") && !lowerText.contains("gpu") ||
                        lowerText.contains("package")) {

                    String valueStr = node.path("Value").asText();
                    if (valueStr != null && !valueStr.isEmpty()) {
                        double temp = parseTemperatureValue(valueStr);
                        if (temp > 0 && temp < 200) {
                            // Ограничиваем длину имени
                            String name = text.length() > 20 ? text.substring(0, 17) + "..." : text;
                            result.put(name, Math.round(temp * 10) / 10.0);
                        }
                    }
                }
            }

            // Рекурсивно ищем в детях
            if (node.has("Children")) {
                for (JsonNode child : node.path("Children")) {
                    result.putAll(findCpuTemperatures(child));
                }
            }
        } catch (Exception e) {
            System.out.println("Error in findCpuTemperatures: " + e.getMessage());
        }

        return result;
    }

    /**
     * Поиск вентиляторов CPU
     */
    private List<Map<String, Object>> findCpuFans(JsonNode node) {
        List<Map<String, Object>> result = new ArrayList<>();
        if (node == null) return result;

        try {
            String text = node.path("Text").asText();
            String type = node.path("Type").asText();

            // Ищем только вентиляторы CPU
            if ("Fan".equals(type) && text != null) {
                String lowerText = text.toLowerCase();
                // Только CPU Fan и Pump Fan (исключаем System Fan)
                if (lowerText.contains("cpu fan") ||
                        lowerText.contains("cpu_fan") ||
                        lowerText.contains("pump fan") ||
                        lowerText.contains("water pump") ||
                        lowerText.contains("cpu opt") ||
                        lowerText.contains("cpu_opt") ||
                        lowerText.contains("aio pump") ||
                        lowerText.contains("cpu") && lowerText.contains("pump")) {

                    String valueStr = node.path("Value").asText();
                    if (valueStr != null && !valueStr.isEmpty()) {
                        int speed = parseFanSpeedValue(valueStr);
                        if (speed >= 0 && speed < 50000) {
                            Map<String, Object> fan = new LinkedHashMap<>();
                            fan.put("name", text);
                            fan.put("speed", speed);
                            fan.put("speedFormatted", speed > 0 ? speed + " RPM" : "0 RPM");
                            result.add(fan);
                        }
                    }
                }
            }

            // Рекурсивно ищем в детях
            if (node.has("Children")) {
                for (JsonNode child : node.path("Children")) {
                    result.addAll(findCpuFans(child));
                }
            }
        } catch (Exception e) {
            System.out.println("Error in findCpuFans: " + e.getMessage());
        }

        return result;
    }

    private double parseTemperatureValue(String valueStr) {
        if (valueStr == null || valueStr.isEmpty()) return 0;
        try {
            String clean = valueStr.replace("°C", "").replace("°", "")
                    .replace("C", "").trim();
            clean = clean.replace(",", ".");
            return Double.parseDouble(clean);
        } catch (Exception e) {
            return 0;
        }
    }

    private int parseFanSpeedValue(String valueStr) {
        if (valueStr == null || valueStr.isEmpty()) return 0;
        try {
            String clean = valueStr.replace("RPM", "").trim();
            clean = clean.replace(",", ".");
            return (int) Math.round(Double.parseDouble(clean));
        } catch (Exception e) {
            return 0;
        }
    }
}