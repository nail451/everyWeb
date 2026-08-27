package org.alex.everyWeb.link.controller;

import org.alex.everyWeb.link.model.Link;
import org.alex.everyWeb.link.repository.DTO.LinkDTO;
import org.alex.everyWeb.link.repository.DTO.LinkRequestDTO;
import org.alex.everyWeb.link.repository.DTO.LinkResponseDTO;
import org.alex.everyWeb.link.service.LinksService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/links")
public class LinksController {

    @Autowired
    private LinksService linksService;

    // ===== ДОБАВЛЕНИЕ ССЫЛКИ =====
    @PostMapping("/add")
    public ResponseEntity<?> addLink(@RequestBody LinkRequestDTO request) {
        try {
            String title = request.getTitle();
            String url = request.getUrl();
            String icon = request.getIcon();
            String iconType = request.getIconType();
            String customImage = request.getCustomImage();
            Long pageId = request.getPageId();

            if (pageId == null) {
                return ResponseEntity.badRequest().body("Page ID is required");
            }
            if (title == null || title.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("Title is required");
            }
            if (url == null || url.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("URL is required");
            }

            url = url.trim();
            if (!url.startsWith("http://") && !url.startsWith("https://")) {
                url = "https://" + url;
            }

            LinkResponseDTO link = linksService.addLink(
                    pageId,
                    title.trim(),
                    url,
                    icon,
                    iconType,
                    customImage
            );
            return ResponseEntity.ok(link);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }

    // ===== ПОЛУЧЕНИЕ ССЫЛОК ПО СТРАНИЦЕ =====
    @GetMapping("/page/{pageId}")
    public ResponseEntity<?> getLinksByPage(@PathVariable Long pageId) {
        try {
            List<LinkDTO> links = linksService.getLinksByPageId(pageId);
            return ResponseEntity.ok(links);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }

    @GetMapping("/{linkId}")
    public ResponseEntity<?> getLink(@PathVariable Long linkId) {
        try {
            Link link = linksService.getLinkById(linkId);
            return ResponseEntity.ok(link);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("Link not found: " + e.getMessage());
        }
    }

    @PutMapping("/{linkId}")
    public ResponseEntity<?> updateLink(@PathVariable Long linkId,
                                        @RequestBody LinkRequestDTO request) {
        try {
            LinkResponseDTO link = linksService.updateLink(
                    linkId,
                    request.getTitle(),
                    request.getUrl(),
                    request.getIcon(),
                    request.getIconType(),
                    request.getCustomImage()
            );
            return ResponseEntity.ok(link);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }

    @DeleteMapping("/{linkId}")
    public ResponseEntity<?> deleteLink(@PathVariable Long linkId) {
        try {
            linksService.deleteLink(linkId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }

    @GetMapping("/favicon")
    public ResponseEntity<?> getFavicon(@RequestParam String url) {
        try {
            String favicon = linksService.getFavicon(url);
            if (favicon != null) {
                return ResponseEntity.ok(favicon);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }
}