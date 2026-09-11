package org.alex.everyWeb.modules.impl.calendar;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ProductionCalendarService {

    private final WebClient webClient;
    private static final String ISDAYOFF_URL = "https://isdayoff.ru/api/getdata";

    @Autowired
    private ProductionCalendarDayRepository repository;

    public ProductionCalendarService() {
        this.webClient = WebClient.builder().build();
    }

    /**
     * Раз в месяц (1-го числа в 3:00) — проверяем, что данные на текущий год есть.
     * Если нет — докачиваем.
     */
    @Scheduled(cron = "0 0 3 1 * *")
    @Transactional
    public void ensureCurrentYearLoaded() {
        int currentYear = LocalDate.now().getYear();
        ensureYearLoaded(currentYear);
        // На всякий случай — следующий год (в декабре уже пора)
        ensureYearLoaded(currentYear + 1);
    }

    @Transactional
    public void ensureYearLoaded(int year) {
        long count = repository.countByYear(year);
        // Ожидаем примерно 365-366 записей на год
        if (count > 360) {
            return; // Уже загружено
        }

        System.out.println("📅 Loading production calendar for year " + year + "...");
        Map<LocalDate, String> data = fetchFromIsDayOff(year);

        if (data.isEmpty()) {
            System.out.println("⚠️ isdayoff.ru unavailable, using fallback (weekends only)");
            data = generateFallback(year);
        }

        // Сохраняем (если что-то уже было — обновляем)
        List<ProductionCalendarDay> existing = repository.findInRange(
                LocalDate.of(year, 1, 1),
                LocalDate.of(year, 12, 31)
        );
        Map<LocalDate, ProductionCalendarDay> existingMap = new HashMap<>();
        for (ProductionCalendarDay d : existing) {
            existingMap.put(d.getDate(), d);
        }

        List<ProductionCalendarDay> toSave = new ArrayList<>();
        for (Map.Entry<LocalDate, String> e : data.entrySet()) {
            ProductionCalendarDay day = existingMap.get(e.getKey());
            if (day == null) {
                day = new ProductionCalendarDay(e.getKey(), e.getValue());
            } else {
                day.setType(e.getValue());
            }
            toSave.add(day);
        }
        repository.saveAll(toSave);
        System.out.println("✅ Loaded " + toSave.size() + " days for year " + year);
    }

    /**
     * Запрос к isdayoff.ru по году.
     * Формат ответа: строка из 365/366 цифр.
     *   0 — рабочий
     *   1 — выходной/праздник
     *   2 — сокращённый
     *   4 — рабочий выходной (перенос)
     *   8 — дополнительный выходной
     */
    private Map<LocalDate, String> fetchFromIsDayOff(int year) {
        Map<LocalDate, String> result = new HashMap<>();

        try {
            String response = webClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .scheme("https")
                            .host("isdayoff.ru")
                            .path("/api/getdata")
                            .queryParam("year", year)
                            .queryParam("cc", "ru")
                            .build())
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            if (response == null || response.isEmpty() || response.startsWith("{")) {
                // Ошибка API — isdayoff возвращает JSON при проблемах
                return result;
            }

            response = response.trim();
            LocalDate date = LocalDate.of(year, 1, 1);
            for (int i = 0; i < response.length(); i++) {
                char c = response.charAt(i);
                String type = mapIsDayOffCode(c);
                if (type != null) {
                    result.put(date, type);
                }
                date = date.plusDays(1);
            }
        } catch (Exception e) {
            System.err.println("Error fetching production calendar: " + e.getMessage());
        }

        return result;
    }

    /**
     * Преобразование кода isdayoff в наш тип.
     */
    private String mapIsDayOffCode(char code) {
        switch (code) {
            case '0': return "WORKING";
            case '1': return "HOLIDAY";
            case '2': return "SHORTENED";
            case '4': return "WORKING";
            case '8': return "HOLIDAY";
            default:  return null;
        }
    }

    /**
     * Fallback: суббота и воскресенье — выходные, остальное — рабочие.
     */
    private Map<LocalDate, String> generateFallback(int year) {
        Map<LocalDate, String> result = new HashMap<>();
        LocalDate start = LocalDate.of(year, 1, 1);
        LocalDate end = LocalDate.of(year, 12, 31);

        LocalDate current = start;
        while (!current.isAfter(end)) {
            DayOfWeek dow = current.getDayOfWeek();
            String type = (dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY)
                    ? "HOLIDAY"
                    : "WORKING";
            result.put(current, type);
            current = current.plusDays(1);
        }
        return result;
    }

    /**
     * Получить данные за диапазон (для календаря).
     * Если в БД чего-то нет — докачиваем год.
     */
    @Transactional
    public List<ProductionCalendarDay> getDaysInRange(LocalDate from, LocalDate to) {
        if (from == null || to == null || from.isAfter(to)) {
            return List.of();
        }

        // Проверим, что год(ы) загружены
        int fromYear = from.getYear();
        int toYear = to.getYear();
        for (int y = fromYear; y <= toYear; y++) {
            ensureYearLoaded(y);
        }

        return repository.findByDateBetween(from, to);
    }
}