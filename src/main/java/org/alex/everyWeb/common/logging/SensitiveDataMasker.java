package org.alex.everyWeb.common.logging;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class SensitiveDataMasker {

    private final ObjectMapper objectMapper = new ObjectMapper();

    public Object mask(Object value) {
        if (value == null) return null;

        if (value instanceof Map<?, ?> map) {
            Map<String, Object> result = new HashMap<>();
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                String key = String.valueOf(entry.getKey());
                Object v = entry.getValue();
                if (isSensitiveKey(key) && v != null) {
                    result.put(key, "***");
                } else {
                    result.put(key, mask(v));
                }
            }
            return result;
        }

        if (value instanceof String str) {
            String trimmed = str.trim();
            if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
                try {
                    Map<String, Object> parsed = objectMapper.readValue(
                            trimmed, new TypeReference<Map<String, Object>>() {});
                    Object masked = mask(parsed);
                    return objectMapper.writeValueAsString(masked);
                } catch (Exception ignored) {}
            }
            return str;
        }

        if (value instanceof Iterable<?> iterable) {
            List<Object> result = new ArrayList<>();
            for (Object item : iterable) result.add(mask(item));
            return result;
        }

        if (value instanceof Object[] arr) {
            Object[] result = new Object[arr.length];
            for (int i = 0; i < arr.length; i++) result[i] = mask(arr[i]);
            return result;
        }

        return value;
    }

    public boolean isSensitiveKey(String key) {
        if (key == null) return false;
        String k = key.toLowerCase();
        return k.contains("password") || k.contains("token")
                || k.contains("apikey") || k.contains("api_key")
                || k.contains("secret") || k.equals("pass")
                || k.equals("pwd") || k.contains("endpoint")
                || k.contains("keys");
    }
}