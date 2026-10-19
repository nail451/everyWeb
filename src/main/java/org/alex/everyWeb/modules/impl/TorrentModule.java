package org.alex.everyWeb.modules.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.alex.everyWeb.modules.api.ModuleConfig;
import org.alex.everyWeb.modules.api.ModuleData;
import org.alex.everyWeb.modules.api.ModuleInfo;
import org.alex.everyWeb.modules.core.Module;
import org.alex.everyWeb.modules.impl.torrent.TorrentData;
import org.alex.everyWeb.modules.impl.torrent.TorrentService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Component
public class TorrentModule extends Module {

    private static final Logger log = LoggerFactory.getLogger(TorrentModule.class);

    @Autowired
    private TorrentService torrentService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public ModuleInfo getInfo() {
        ModuleInfo info = new ModuleInfo();
        info.setType("TORRENT");
        info.setName("Торрент");
        info.setDescription("Торрент-клиент qBittorrent");
        info.setIcon("🌊");
        info.setVersion("1.0.0");
        info.setAuthor("System");
        info.setEnabled(true);
        info.setConfigurable(true);
        info.setCssClass("torrent-module");
        return info;
    }

    @Override
    public ModuleData createData(ModuleConfig config) {
        return buildModuleData(config);
    }

    @Override
    public ModuleData updateData(ModuleData data, ModuleConfig config) {
        return buildModuleData(config);
    }

    @Override
    public Object handleAction(String action, Map<String, Object> params, ModuleConfig config) {
        TorrentData torrentData = getTorrentData(config);

        switch (action) {
            case "updateSettings": {
                String baseUrl = (String) params.get("baseUrl");
                String username = (String) params.get("username");
                String password = (String) params.get("password");
                String downloadPath = (String) params.get("downloadPath");
                Integer pollInterval = asInt(params.get("pollInterval"));

                if (baseUrl != null) torrentData.setBaseUrl(baseUrl.trim());
                if (username != null) torrentData.setUsername(username.trim());
                if (password != null) torrentData.setPassword(password);
                if (downloadPath != null) torrentData.setDownloadPath(downloadPath.trim());
                if (pollInterval != null && pollInterval > 0) torrentData.setPollInterval(pollInterval);

                // Сбрасываем клиент, чтобы применились новые настройки
                torrentService.invalidate(torrentData);

                saveTorrentData(config, torrentData);
                return buildModuleData(config);
            }

            case "testConnection": {
                String testUrl = (String) params.get("baseUrl");
                String testUser = (String) params.get("username");
                String testPass = (String) params.get("password");

                TorrentData testData = new TorrentData();
                testData.setBaseUrl(testUrl != null && !testUrl.isBlank() ? testUrl.trim() : torrentData.getBaseUrl());
                testData.setUsername(testUser != null && !testUser.isBlank() ? testUser.trim() : torrentData.getUsername());
                testData.setPassword(testPass != null && !testPass.isBlank() ? testPass : torrentData.getPassword());
                testData.setDownloadPath(torrentData.getDownloadPath());

                boolean connected = torrentService.ping(testData);
                String version = connected ? torrentService.getVersion(testData) : null;

                ModuleData result = new ModuleData("TORRENT", "Торрент");
                Map<String, Object> content = new HashMap<>();
                content.put("connected", connected);
                content.put("message", connected
                        ? "✅ Подключение успешно" + (version != null ? " (" + version + ")" : "")
                        : "❌ Ошибка подключения");
                content.put("version", version);
                result.setContent(content);
                return result;
            }

            case "sendAnnounce": {
                String hash = (String) params.get("hash");
                if (hash == null || hash.isBlank()) {
                    return errorResult("Не указан hash торрента");
                }
                boolean ok = torrentService.reannounce(torrentData, hash);
                ModuleData result = new ModuleData("TORRENT", "Торрент");
                Map<String, Object> content = new HashMap<>();
                content.put("success", ok);
                content.put("message", ok ? "✅ Трекеры оповещены" : "❌ Не удалось оповестить трекеры");
                result.setContent(content);
                return result;
            }

            case "changeSpeed": {
                Boolean enabled = asBoolean(params.get("enabled"));
                if (enabled == null) {
                    return errorResult("Не указан параметр enabled");
                }
                boolean ok = torrentService.setSpeedLimitsMode(torrentData, enabled);
                ModuleData result = new ModuleData("TORRENT", "Торрент");
                Map<String, Object> content = new HashMap<>();
                content.put("success", ok);
                content.put("mode", enabled ? 1 : 0);
                content.put("message", ok
                        ? (enabled ? "🐢 Медленный режим включён" : "🚀 Безлимит включён")
                        : "❌ Не удалось изменить режим");
                result.setContent(content);
                return result;
            }
        }

        return null;
    }

    // ============================================================
    //  СБОРКА ModuleData
    // ============================================================

    private ModuleData buildModuleData(ModuleConfig config) {
        TorrentData torrentData = getTorrentData(config);

        ModuleData data = new ModuleData("TORRENT", "Торрент");
        Map<String, Object> content = new HashMap<>();
        content.put("torrentData", torrentData);

        if (torrentData.isConfigured()) {
            boolean connected = torrentService.ping(torrentData);
            content.put("connected", connected);

            if (!connected) {
                log.info("TorrentModule: подключение не удалось, пробуем пересоздать клиент");
                torrentService.forceReconnect(torrentData);
                connected = torrentService.ping(torrentData);
            }
            content.put("connected", connected);

            if (connected) {
                content.put("version", torrentService.getVersion(torrentData));
                content.put("torrents", torrentService.list(torrentData));
                content.put("transferInfo", torrentService.transferInfo(torrentData));
                content.put("speedLimitsMode", torrentService.getSpeedLimitsMode(torrentData));
            } else {
                content.put("error", "Не удалось подключиться к qBittorrent");
            }
        } else {
            content.put("error", "Настройте подключение к qBittorrent");
        }

        data.setContent(content);
        data.setConfig(config);
        return data;
    }

    private ModuleData errorResult(String message) {
        ModuleData result = new ModuleData("TORRENT", "Торрент");
        Map<String, Object> content = new HashMap<>();
        content.put("success", false);
        content.put("message", message);
        result.setContent(content);
        return result;
    }

    // ============================================================
    //  СЕРИАЛИЗАЦИЯ НАСТРОЕК
    // ============================================================

    private TorrentData getTorrentData(ModuleConfig config) {
        String settingsJson = config.getString("torrentData");
        if (settingsJson != null && !settingsJson.isEmpty()) {
            try {
                return objectMapper.readValue(settingsJson, TorrentData.class);
            } catch (Exception e) {
                log.error("Error parsing torrentData: {}", e.getMessage(), e);
            }
        }
        return new TorrentData();
    }

    private void saveTorrentData(ModuleConfig config, TorrentData torrentData) {
        try {
            String json = objectMapper.writeValueAsString(torrentData);
            config.put("torrentData", json);
        } catch (Exception e) {
            log.error("Error saving torrentData: {}", e.getMessage(), e);
        }
    }

    // ============================================================
    //  ХЕЛПЕРЫ
    // ============================================================

    private Integer asInt(Object o) {
        if (o == null) return null;
        if (o instanceof Number) return ((Number) o).intValue();
        try { return Integer.parseInt(o.toString()); } catch (Exception e) { return null; }
    }

    private Boolean asBoolean(Object o) {
        if (o == null) return null;
        if (o instanceof Boolean) return (Boolean) o;
        return Boolean.parseBoolean(o.toString());
    }
}