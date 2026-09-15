package org.alex.everyWeb.modules.impl.nextcloud;

import org.alex.everyWeb.modules.entity.ModuleEntity;
import org.alex.everyWeb.modules.repository.ModuleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.fasterxml.jackson.databind.ObjectMapper;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@RestController
@RequestMapping("/api/nextcloud")
public class NextcloudController {

    @Autowired
    private ModuleRepository moduleRepository;

    @Autowired
    private NextcloudService nextcloudService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @GetMapping("/{moduleId}/download")
    public ResponseEntity<Resource> download(@PathVariable Long moduleId,
                                             @RequestParam("path") String filePath) {
        try {
            ModuleEntity module = moduleRepository.findById(moduleId)
                    .orElseThrow(() -> new RuntimeException("Module not found"));

            if (!"NEXTCLOUD".equals(module.getType())) {
                return ResponseEntity.badRequest().build();
            }

            NextcloudData data = parseData(module.getSettings());
            if (data.getServerUrl() == null || data.getUsername() == null || data.getPassword() == null) {
                return ResponseEntity.badRequest().build();
            }

            Resource resource = nextcloudService.downloadFile(
                    data.getServerUrl(), data.getUsername(), data.getPassword(), filePath);

            if (resource == null) {
                return ResponseEntity.notFound().build();
            }

            String fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
            String encodedName = URLEncoder.encode(fileName, StandardCharsets.UTF_8)
                    .replace("+", "%20");

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename*=UTF-8''" + encodedName)
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .body(resource);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    private NextcloudData parseData(String settingsJson) {
        try {
            if (settingsJson == null || settingsJson.isEmpty()) return new NextcloudData();
            Map<String, Object> map = objectMapper.readValue(settingsJson,
                    new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {});
            Object ncObj = map.get("nextcloudData");
            if (ncObj instanceof String) {
                return objectMapper.readValue((String) ncObj, NextcloudData.class);
            } else if (ncObj instanceof Map) {
                return objectMapper.convertValue(ncObj, NextcloudData.class);
            }
        } catch (Exception e) {
            System.err.println("Error parsing nextcloudData: " + e.getMessage());
        }
        return new NextcloudData();
    }
}