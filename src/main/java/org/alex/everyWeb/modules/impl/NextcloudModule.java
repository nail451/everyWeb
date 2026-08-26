package org.alex.everyWeb.modules.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.alex.everyWeb.modules.api.ModuleConfig;
import org.alex.everyWeb.modules.api.ModuleData;
import org.alex.everyWeb.modules.api.ModuleInfo;
import org.alex.everyWeb.modules.core.Module;
import org.alex.everyWeb.modules.impl.nextcloud.NextcloudData;
import org.alex.everyWeb.modules.impl.nextcloud.NextcloudService;
import org.alex.everyWeb.modules.impl.nextcloud.NextcloudStorage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Component
public class NextcloudModule extends Module {

    @Autowired
    private NextcloudService nextcloudService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public ModuleInfo getInfo() {
        ModuleInfo info = new ModuleInfo();
        info.setType("NEXTCLOUD");
        info.setName("Nextcloud");
        info.setDescription("Интеграция с Nextcloud - просмотр файлов и хранилища");
        info.setIcon("☁️");
        info.setVersion("1.0.0");
        info.setAuthor("System");
        info.setEnabled(true);
        info.setConfigurable(true);
        info.setCssClass("nextcloud-module");
        return info;
    }

    @Override
    public ModuleData createData(ModuleConfig config) {
        ModuleData data = new ModuleData("NEXTCLOUD", "Nextcloud");
        NextcloudData nextcloudData = getNextcloudData(config);

        Map<String, Object> content = new HashMap<>();
        content.put("nextcloudData", nextcloudData);

        // Проверяем подключение
        if (isConfigured(nextcloudData)) {
            content.put("files", nextcloudService.getFiles(
                    nextcloudData.getServerUrl(),
                    nextcloudData.getUsername(),
                    nextcloudData.getPassword(),
                    nextcloudData.getPath(),
                    nextcloudData.getMaxFiles()
            ));

            if (nextcloudData.isShowStorage()) {
                NextcloudStorage storage = nextcloudService.getStorage(
                        nextcloudData.getServerUrl(),
                        nextcloudData.getUsername(),
                        nextcloudData.getPassword()
                );
                content.put("storage", storage);
            }
        } else {
            content.put("error", "Настройте подключение к Nextcloud");
        }

        data.setContent(content);
        data.setConfig(config);
        return data;
    }

    @Override
    public ModuleData updateData(ModuleData data, ModuleConfig config) {
        NextcloudData nextcloudData = getNextcloudData(config);

        Map<String, Object> content = new HashMap<>();
        content.put("nextcloudData", nextcloudData);

        if (isConfigured(nextcloudData)) {
            content.put("files", nextcloudService.getFiles(
                    nextcloudData.getServerUrl(),
                    nextcloudData.getUsername(),
                    nextcloudData.getPassword(),
                    nextcloudData.getPath(),
                    nextcloudData.getMaxFiles()
            ));

            if (nextcloudData.isShowStorage()) {
                NextcloudStorage storage = nextcloudService.getStorage(
                        nextcloudData.getServerUrl(),
                        nextcloudData.getUsername(),
                        nextcloudData.getPassword()
                );
                content.put("storage", storage);
            }
        } else {
            content.put("error", "Настройте подключение к Nextcloud");
        }

        data.setContent(content);
        data.setConfig(config);
        return data;
    }

    @Override
    public Object handleAction(String action, Map<String, Object> params, ModuleConfig config) {
        NextcloudData nextcloudData = getNextcloudData(config);

        switch (action) {
            case "updateSettings":
                String serverUrl = (String) params.get("serverUrl");
                String username = (String) params.get("username");
                String password = (String) params.get("password");
                String path = (String) params.get("path");
                Integer maxFiles = (Integer) params.get("maxFiles");
                Boolean showStorage = (Boolean) params.get("showStorage");
                Boolean showRecentFiles = (Boolean) params.get("showRecentFiles");

                if (serverUrl != null) {
                    nextcloudData.setServerUrl(serverUrl.trim());
                }
                if (username != null) {
                    nextcloudData.setUsername(username.trim());
                }
                if (password != null) {
                    nextcloudData.setPassword(password);
                }
                if (path != null) {
                    nextcloudData.setPath(path.trim());
                }
                if (maxFiles != null && maxFiles > 0) {
                    nextcloudData.setMaxFiles(maxFiles);
                }
                if (showStorage != null) {
                    nextcloudData.setShowStorage(showStorage);
                }
                if (showRecentFiles != null) {
                    nextcloudData.setShowRecentFiles(showRecentFiles);
                }

                saveNextcloudData(config, nextcloudData);
                return buildModuleData(nextcloudData, config);

            case "testConnection":
                boolean connected = nextcloudService.testConnection(
                        nextcloudData.getServerUrl(),
                        nextcloudData.getUsername(),
                        nextcloudData.getPassword()
                );
                Map<String, Object> result = new HashMap<>();
                result.put("connected", connected);
                result.put("message", connected ? "✅ Подключение успешно" : "❌ Ошибка подключения");
                return result;
        }
        return null;
    }

    private ModuleData buildModuleData(NextcloudData nextcloudData, ModuleConfig config) {
        ModuleData data = new ModuleData("NEXTCLOUD", "Nextcloud");
        Map<String, Object> content = new HashMap<>();
        content.put("nextcloudData", nextcloudData);

        if (isConfigured(nextcloudData)) {
            content.put("files", nextcloudService.getFiles(
                    nextcloudData.getServerUrl(),
                    nextcloudData.getUsername(),
                    nextcloudData.getPassword(),
                    nextcloudData.getPath(),
                    nextcloudData.getMaxFiles()
            ));

            if (nextcloudData.isShowStorage()) {
                NextcloudStorage storage = nextcloudService.getStorage(
                        nextcloudData.getServerUrl(),
                        nextcloudData.getUsername(),
                        nextcloudData.getPassword()
                );
                content.put("storage", storage);
            }
        } else {
            content.put("error", "Настройте подключение к Nextcloud");
        }

        data.setContent(content);
        data.setConfig(config);
        return data;
    }

    private NextcloudData getNextcloudData(ModuleConfig config) {
        String settingsJson = config.getString("nextcloudData");
        if (settingsJson != null && !settingsJson.isEmpty()) {
            try {
                return objectMapper.readValue(settingsJson, NextcloudData.class);
            } catch (Exception e) {
                System.err.println("Error parsing nextcloud data: " + e.getMessage());
                e.printStackTrace();
            }
        }
        return new NextcloudData();
    }

    private void saveNextcloudData(ModuleConfig config, NextcloudData nextcloudData) {
        try {
            String json = objectMapper.writeValueAsString(nextcloudData);
            config.put("nextcloudData", json);
            System.out.println("Saved nextcloud data: " + json);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private boolean isConfigured(NextcloudData data) {
        return data.getServerUrl() != null && !data.getServerUrl().isEmpty() &&
                data.getUsername() != null && !data.getUsername().isEmpty() &&
                data.getPassword() != null && !data.getPassword().isEmpty();
    }
}