package org.alex.everyWeb.modules.impl.link;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.alex.everyWeb.link.service.LinksService;
import org.alex.everyWeb.modules.api.ModuleConfig;
import org.alex.everyWeb.modules.api.ModuleData;
import org.alex.everyWeb.modules.api.ModuleInfo;
import org.alex.everyWeb.modules.core.Module;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

/**
 * Модуль LINK - отображение ссылок с индивидуальными настройками.
 * Настройки хранятся в ModuleEntity.settings в формате JSON.
 */
@Component
public class LinkModule extends Module {

    @Autowired
    private LinksService linksService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public ModuleInfo getInfo() {
        ModuleInfo info = new ModuleInfo();
        info.setType("LINK");
        info.setName("Ссылки");
        info.setDescription("Отображение ссылок с настраиваемым внешним видом");
        info.setIcon("🔗");
        info.setVersion("1.0.0");
        info.setAuthor("System");
        info.setEnabled(true);
        info.setConfigurable(true);
        info.setCssClass("link-widget");
        return info;
    }

    @Override
    public ModuleData createData(ModuleConfig config) {
        ModuleData data = new ModuleData("LINK", "Ссылки");

        LinkData linkData = getLinkData(config);

        Map<String, Object> content = new HashMap<>();
        content.put("linkData", linkData);
        content.put("settings", linkData);

        data.setContent(content);
        data.setConfig(config);

        return data;
    }

    @Override
    public ModuleData updateData(ModuleData data, ModuleConfig config) {
        LinkData linkData = getLinkData(config);

        Map<String, Object> content = new HashMap<>();
        content.put("linkData", linkData);
        content.put("settings", linkData);

        data.setContent(content);
        data.setConfig(config);

        return data;
    }

    @Override
    public Object handleAction(String action, Map<String, Object> params, ModuleConfig config) {
        LinkData linkData = getLinkData(config);

        switch (action) {
            case "updateSettings":
                return handleUpdateSettings(linkData, params, config);

            case "getSettings":
                return buildModuleData(linkData, config);

            default:
                Map<String, Object> error = new HashMap<>();
                error.put("error", "Неизвестное действие: " + action);
                return error;
        }
    }

    /**
     * Обработка обновления настроек.
     */
    private Object handleUpdateSettings(LinkData linkData, Map<String, Object> params, ModuleConfig config) {
        if (params.containsKey("iconSize")) {
            Integer value = toInteger(params.get("iconSize"));
            if (value != null) linkData.setIconSize(value);
        }

        if (params.containsKey("fontSize")) {
            Integer value = toInteger(params.get("fontSize"));
            if (value != null) linkData.setFontSize(value);
        }

        if (params.containsKey("blurAmount")) {
            Integer value = toInteger(params.get("blurAmount"));
            if (value != null) linkData.setBlurAmount(value);
        }

        if (params.containsKey("bgDarkness")) {
            Integer value = toInteger(params.get("bgDarkness"));
            if (value != null) linkData.setBgDarkness(value);
        }

        if (params.containsKey("hideBackground")) {
            Boolean value = toBoolean(params.get("hideBackground"));
            if (value != null) linkData.setHideBackground(value);
        }

        if (params.containsKey("alignment")) {
            String value = (String) params.get("alignment");
            if (value != null && !value.trim().isEmpty()) {
                linkData.setAlignment(value.trim());
            }
        }

        saveLinkData(config, linkData);
        return buildModuleData(linkData, config);
    }

    /**
     * Сборка ModuleData с текущими настройками.
     */
    private ModuleData buildModuleData(LinkData linkData, ModuleConfig config) {
        ModuleData data = new ModuleData("LINK", "Ссылки");
        Map<String, Object> content = new HashMap<>();
        content.put("linkData", linkData);
        content.put("settings", linkData);
        data.setContent(content);
        data.setConfig(config);
        return data;
    }

    /**
     * Получение LinkData из конфига.
     */
    private LinkData getLinkData(ModuleConfig config) {
        String settingsJson = config.getString("linkData");

        if (settingsJson != null && !settingsJson.isEmpty()) {
            try {
                LinkData data = objectMapper.readValue(settingsJson, LinkData.class);
                if (data != null && data.isValid()) {
                    return data;
                }
            } catch (Exception e) {
                System.err.println("Error parsing link data: " + e.getMessage());
                // Пробуем парсить как Map для обратной совместимости
                try {
                    Map<String, Object> map = objectMapper.readValue(
                            settingsJson,
                            new TypeReference<Map<String, Object>>() {}
                    );
                    LinkData data = new LinkData();
                    if (map.containsKey("iconSize")) {
                        data.setIconSize(toInteger(map.get("iconSize")));
                    }
                    if (map.containsKey("fontSize")) {
                        data.setFontSize(toInteger(map.get("fontSize")));
                    }
                    if (map.containsKey("blurAmount")) {
                        data.setBlurAmount(toInteger(map.get("blurAmount")));
                    }
                    if (map.containsKey("bgDarkness")) {
                        data.setBgDarkness(toInteger(map.get("bgDarkness")));
                    }
                    return data;
                } catch (Exception ex) {
                    System.err.println("Error parsing link data as map: " + ex.getMessage());
                }
            }
        }

        // Возвращаем настройки по умолчанию
        return new LinkData();
    }

    /**
     * Сохранение LinkData в конфиг.
     */
    private void saveLinkData(ModuleConfig config, LinkData linkData) {
        try {
            String json = objectMapper.writeValueAsString(linkData);
            config.put("linkData", json);
            System.out.println("Saved link data: " + json);
        } catch (Exception e) {
            System.err.println("Error saving link data: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Безопасное преобразование в Integer.
     */
    private Integer toInteger(Object value) {
        if (value == null) return null;
        if (value instanceof Number) {
            return ((Number) value).intValue();
        }
        try {
            return Integer.parseInt(value.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /**
     * Безопасное преобразование в Boolean.
     */
    private Boolean toBoolean(Object value) {
        if (value == null) return null;
        if (value instanceof Boolean) {
            return (Boolean) value;
        }
        String str = value.toString().toLowerCase();
        return "true".equals(str) || "1".equals(str) || "yes".equals(str);
    }
}