package org.alex.everyWeb.modules.impl.weather;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

@Service
public class WeatherService {

    private final WebClient webClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public WeatherService() {
        this.webClient = WebClient.builder().build();
    }

    public Map<String, Object> getWeather(String city, String units) {
        Map<String, Object> result = new HashMap<>();

        try {
            if (city == null || city.trim().isEmpty()) {
                result.put("error", "Город не указан");
                return result;
            }

            // 1. Получаем координаты города
            double[] coords = getCoordinates(city.trim());
            if (coords == null) {
                result.put("error", "Город не найден: " + city);
                result.put("city", city);
                return result;
            }

            double lat = coords[0];
            double lon = coords[1];

            System.out.println("Weather for: " + city + " (lat: " + lat + ", lon: " + lon + ")");

            // 2. Получаем погоду по координатам
            String response = webClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .scheme("https")
                            .host("api.open-meteo.com")
                            .path("/v1/forecast")
                            .queryParam("latitude", lat)
                            .queryParam("longitude", lon)
                            .queryParam("current_weather", true)
                            .queryParam("hourly", "temperature_2m,relative_humidity_2m,wind_speed_10m,pressure_msl")
                            .queryParam("daily", "weathercode,temperature_2m_max,temperature_2m_min,sunrise,sunset")
                            .queryParam("timezone", "auto")
                            .queryParam("forecast_days", 1)
                            .build())
                    .retrieve()
                    .onStatus(status -> status.isError(), clientResponse -> {
                        return clientResponse.bodyToMono(String.class)
                                .flatMap(error -> Mono.error(new RuntimeException("Weather API error: " + error)));
                    })
                    .bodyToMono(String.class)
                    .block();

            if (response != null) {
                JsonNode root = objectMapper.readTree(response);
                result = parseWeatherResponse(root, city, units);
            } else {
                result.put("error", "Не удалось получить данные о погоде");
                result.put("city", city);
            }

        } catch (Exception e) {
            System.err.println("Error getting weather: " + e.getMessage());
            e.printStackTrace();
            result.put("error", "Ошибка получения погоды: " + e.getMessage());
            result.put("city", city);
        }

        return result;
    }

    private double[] getCoordinates(String city) {
        try {
            String response = webClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .scheme("https")
                            .host("geocoding-api.open-meteo.com")
                            .path("/v1/search")
                            .queryParam("name", city)
                            .queryParam("count", 1)
                            .queryParam("language", "ru")
                            .build())
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            if (response != null) {
                JsonNode root = objectMapper.readTree(response);
                JsonNode results = root.path("results");
                if (results.size() > 0) {
                    double lat = results.get(0).path("latitude").asDouble();
                    double lon = results.get(0).path("longitude").asDouble();
                    return new double[]{lat, lon};
                }
            }
        } catch (Exception e) {
            System.err.println("Error getting coordinates for " + city + ": " + e.getMessage());
        }
        return null;
    }

    private Map<String, Object> parseWeatherResponse(JsonNode root, String city, String units) {
        Map<String, Object> result = new HashMap<>();

        result.put("city", city);

        // Текущая погода
        JsonNode current = root.path("current_weather");
        if (!current.isMissingNode()) {
            double temp = current.path("temperature").asDouble();
            double windSpeed = current.path("windspeed").asDouble();
            int windDirection = current.path("winddirection").asInt();
            int weatherCode = current.path("weathercode").asInt();

            result.put("temperature", formatTemperature(temp, units));
            result.put("temperatureRaw", temp);
            result.put("windSpeed", formatWindSpeed(windSpeed, units));
            result.put("windDirection", formatWindDirection(windDirection));
            result.put("weatherCode", weatherCode);
            result.put("condition", getWeatherCondition(weatherCode));
            result.put("icon", getWeatherIcon(weatherCode));

            // Дополнительные данные из hourly
            JsonNode hourly = root.path("hourly");
            if (!hourly.isMissingNode()) {
                JsonNode time = hourly.path("time");
                JsonNode humidity = hourly.path("relative_humidity_2m");
                JsonNode pressure = hourly.path("pressure_msl");

                if (time.size() > 0) {
                    result.put("humidity", humidity.get(0).asInt() + "%");
                    result.put("pressure", Math.round(pressure.get(0).asDouble()) + " гПа");
                }
            }
        }

        // Ежедневные данные
        JsonNode daily = root.path("daily");
        if (!daily.isMissingNode()) {
            JsonNode maxTemp = daily.path("temperature_2m_max");
            JsonNode minTemp = daily.path("temperature_2m_min");
            JsonNode sunrise = daily.path("sunrise");
            JsonNode sunset = daily.path("sunset");

            if (maxTemp.size() > 0) {
                result.put("tempMax", formatTemperature(maxTemp.get(0).asDouble(), units));
                result.put("tempMin", formatTemperature(minTemp.get(0).asDouble(), units));
                result.put("sunrise", formatTime(sunrise.get(0).asText()));
                result.put("sunset", formatTime(sunset.get(0).asText()));
            }
        }

        return result;
    }

    private String getWeatherCondition(int code) {
        Map<Integer, String> conditions = new HashMap<>();
        conditions.put(0, "Ясно");
        conditions.put(1, "Преимущественно ясно");
        conditions.put(2, "Переменная облачность");
        conditions.put(3, "Пасмурно");
        conditions.put(45, "Туман");
        conditions.put(48, "Туман");
        conditions.put(51, "Легкая морось");
        conditions.put(53, "Умеренная морось");
        conditions.put(55, "Сильная морось");
        conditions.put(56, "Ледяная морось");
        conditions.put(57, "Ледяная морось");
        conditions.put(61, "Легкий дождь");
        conditions.put(63, "Умеренный дождь");
        conditions.put(65, "Сильный дождь");
        conditions.put(71, "Легкий снег");
        conditions.put(73, "Умеренный снег");
        conditions.put(75, "Сильный снег");
        conditions.put(80, "Ливень");
        conditions.put(81, "Ливень");
        conditions.put(82, "Сильный ливень");
        conditions.put(95, "Гроза");
        conditions.put(96, "Гроза с градом");
        conditions.put(99, "Гроза с градом");
        return conditions.getOrDefault(code, "Неизвестно");
    }

    private String getWeatherIcon(int code) {
        if (code == 0) return "☀️";
        if (code == 1) return "🌤️";
        if (code == 2) return "⛅";
        if (code == 3) return "☁️";
        if (code >= 45 && code <= 48) return "🌫️";
        if (code >= 51 && code <= 57) return "🌧️";
        if (code >= 61 && code <= 65) return "🌧️";
        if (code >= 71 && code <= 75) return "🌨️";
        if (code >= 80 && code <= 82) return "🌧️";
        if (code >= 95 && code <= 99) return "⛈️";
        return "🌤️";
    }

    private String formatTemperature(double temp, String units) {
        String symbol = "metric".equals(units) ? "°C" : "°F";
        return Math.round(temp) + symbol;
    }

    private String formatWindSpeed(double speed, String units) {
        String unit = "metric".equals(units) ? "м/с" : "mph";
        return String.format("%.1f %s", speed, unit);
    }

    private String formatWindDirection(int deg) {
        if (deg >= 337.5 || deg < 22.5) return "С";
        if (deg >= 22.5 && deg < 67.5) return "СВ";
        if (deg >= 67.5 && deg < 112.5) return "В";
        if (deg >= 112.5 && deg < 157.5) return "ЮВ";
        if (deg >= 157.5 && deg < 202.5) return "Ю";
        if (deg >= 202.5 && deg < 247.5) return "ЮЗ";
        if (deg >= 247.5 && deg < 292.5) return "З";
        if (deg >= 292.5 && deg < 337.5) return "СЗ";
        return "-";
    }

    private String formatTime(String time) {
        if (time == null || time.isEmpty()) return "--:--";
        try {
            LocalDateTime dt = LocalDateTime.parse(time.replace("Z", ""));
            return dt.format(DateTimeFormatter.ofPattern("HH:mm"));
        } catch (Exception e) {
            return time;
        }
    }
}