package org.alex.everyWeb.modules.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.alex.everyWeb.modules.api.ModuleConfig;
import org.alex.everyWeb.modules.api.ModuleData;
import org.alex.everyWeb.modules.api.ModuleInfo;
import org.alex.everyWeb.modules.core.Module;
import org.alex.everyWeb.modules.impl.weather.WeatherData;
import org.alex.everyWeb.modules.impl.weather.WeatherService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Component
public class WeatherModule extends Module {

    @Autowired
    private WeatherService weatherService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public ModuleInfo getInfo() {
        ModuleInfo info = new ModuleInfo();
        info.setType("WEATHER");
        info.setName("Погода");
        info.setDescription("Показывает погоду в выбранном городе");
        info.setIcon("🌤️");
        info.setVersion("1.0.0");
        info.setAuthor("System");
        info.setEnabled(true);
        info.setConfigurable(true);
        info.setCssClass("weather-module");
        return info;
    }

    @Override
    public ModuleData createData(ModuleConfig config) {
        ModuleData data = new ModuleData("WEATHER", "Погода");
        WeatherData weatherData = getWeatherData(config);
        Map<String, Object> content = new HashMap<>();
        content.put("weatherData", weatherData);
        content.put("weatherInfo", weatherService.getWeather(weatherData.getCity(), weatherData.getUnits()));
        data.setContent(content);
        data.setConfig(config);
        return data;
    }

    @Override
    public ModuleData updateData(ModuleData data, ModuleConfig config) {
        WeatherData weatherData = getWeatherData(config);
        Map<String, Object> content = new HashMap<>();
        content.put("weatherData", weatherData);
        content.put("weatherInfo", weatherService.getWeather(weatherData.getCity(), weatherData.getUnits()));
        data.setContent(content);
        data.setConfig(config);
        return data;
    }

    @Override
    public Object handleAction(String action, Map<String, Object> params, ModuleConfig config) {
        WeatherData weatherData = getWeatherData(config);

        switch (action) {
            case "updateSettings":
                String city = (String) params.get("city");
                String units = (String) params.get("units");
                Boolean showWind = (Boolean) params.get("showWind");
                Boolean showHumidity = (Boolean) params.get("showHumidity");
                Boolean showPressure = (Boolean) params.get("showPressure");

                if (city != null && !city.trim().isEmpty()) {
                    weatherData.setCity(city.trim());
                }
                if (units != null) {
                    weatherData.setUnits(units);
                }
                if (showWind != null) {
                    weatherData.setShowWind(showWind);
                }
                if (showHumidity != null) {
                    weatherData.setShowHumidity(showHumidity);
                }
                if (showPressure != null) {
                    weatherData.setShowPressure(showPressure);
                }

                saveWeatherData(config, weatherData);
                return buildModuleData(weatherData, config);

            case "refresh":
                return buildModuleData(weatherData, config);
        }
        return null;
    }

    private ModuleData buildModuleData(WeatherData weatherData, ModuleConfig config) {
        ModuleData data = new ModuleData("WEATHER", "Погода");
        Map<String, Object> content = new HashMap<>();
        content.put("weatherData", weatherData);
        content.put("weatherInfo", weatherService.getWeather(weatherData.getCity(), weatherData.getUnits()));
        data.setContent(content);
        data.setConfig(config);
        return data;
    }

    private WeatherData getWeatherData(ModuleConfig config) {
        String settingsJson = config.getString("weatherData");
        if (settingsJson != null && !settingsJson.isEmpty()) {
            try {
                return objectMapper.readValue(settingsJson, WeatherData.class);
            } catch (Exception e) {
                System.err.println("Error parsing weather data: " + e.getMessage());
                e.printStackTrace();
            }
        }
        return new WeatherData();
    }

    private void saveWeatherData(ModuleConfig config, WeatherData weatherData) {
        try {
            String json = objectMapper.writeValueAsString(weatherData);
            config.put("weatherData", json);
            System.out.println("Saved weather data: " + json);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}