package org.alex.everyWeb.link.service;

import jakarta.transaction.Transactional;
import org.alex.everyWeb.link.model.Link;
import org.alex.everyWeb.link.repository.DTO.LinkDTO;
import org.alex.everyWeb.link.repository.DTO.LinkResponseDTO;
import org.alex.everyWeb.link.repository.LinkRepository;
import org.alex.everyWeb.page.model.Page;
import org.alex.everyWeb.page.repository.PageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@Transactional
public class LinksService {

    @Autowired
    private LinkRepository linksRepository;

    @Autowired
    private PageRepository pageRepository;

    private static final Pattern FAVICON_PATTERN = Pattern.compile(
            "<link[^>]*rel=[\"'](?:shortcut )?icon[\"'][^>]*href=[\"']([^\"']+)[\"']",
            Pattern.CASE_INSENSITIVE
    );

    public Link getLinkById(Long linkId) {
        return linksRepository.findById(linkId)
                .orElseThrow(() -> new RuntimeException("Link not found: " + linkId));
    }

    // ===== ОСНОВНОЙ МЕТОД С ПОЛНЫМИ ПАРАМЕТРАМИ =====
    public LinkResponseDTO addLink(Long pageId, String title, String url, String icon,
                                   String iconType, String customImage) {
        Page page = pageRepository.findById(pageId)
                .orElseThrow(() -> new RuntimeException("Page not found: " + pageId));

        Link link = new Link();
        link.setTitle(title);
        link.setUrl(url);
        link.setIcon(icon != null ? icon : "🔗");
        link.setIconType(iconType != null ? iconType : "emoji");
        link.setCustomImage(customImage);
        link.setPage(page);

        Integer maxPosition = linksRepository.findMaxPositionByPageId(pageId);
        link.setPosition(maxPosition != null ? maxPosition + 1 : 0);

        Link savedLink = linksRepository.save(link);
        return convertToResponseDTO(savedLink);
    }

    // ===== ПЕРЕГРУЖЕННЫЙ МЕТОД ДЛЯ ПРОСТОГО ИСПОЛЬЗОВАНИЯ =====
    public LinkResponseDTO addLink(Long pageId, String title, String url, String icon) {
        return addLink(pageId, title, url, icon, "emoji", null);
    }

    // ===== ПЕРЕГРУЖЕННЫЙ МЕТОД БЕЗ ИКОНКИ (автоматически подставит favicon) =====
    public LinkResponseDTO addLink(Long pageId, String title, String url) {
        // Пробуем получить favicon
        String favicon = getFavicon(url);
        String icon = favicon != null ? favicon : "🔗";
        String iconType = favicon != null ? "favicon" : "emoji";
        return addLink(pageId, title, url, icon, iconType, null);
    }

    public LinkResponseDTO updateLink(Long linkId, String title, String url, String icon,
                                      String iconType, String customImage) {
        Link link = linksRepository.findById(linkId)
                .orElseThrow(() -> new RuntimeException("Link not found: " + linkId));

        if (title != null && !title.trim().isEmpty()) {
            link.setTitle(title.trim());
        }
        if (url != null && !url.trim().isEmpty()) {
            link.setUrl(url.trim());
        }
        if (icon != null) {
            link.setIcon(icon);
        }
        if (iconType != null) {
            link.setIconType(iconType);
        }
        if (customImage != null) {
            link.setCustomImage(customImage);
        }

        Link updatedLink = linksRepository.save(link);
        return convertToResponseDTO(updatedLink);
    }

    public void deleteLink(Long linkId) {
        linksRepository.deleteById(linkId);
    }

    public List<LinkDTO> getLinksByPageId(Long pageId) {
        return linksRepository.findByPageIdOrderByPositionAsc(pageId)
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public void reorderLinks(Long pageId, List<Long> linkIds) {
        List<Link> links = linksRepository.findByPageIdOrderByPositionAsc(pageId);
        for (int i = 0; i < linkIds.size(); i++) {
            final int position = i;
            Link link = links.stream()
                    .filter(l -> l.getId().equals(linkIds.get(position)))
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException("Link not found"));
            link.setPosition(position);
            linksRepository.save(link);
        }
    }

    // ===== ПОЛУЧЕНИЕ FAVICON =====
    public String getFavicon(String domain) {
        try {
            // Нормализуем URL
            String url = domain;
            if (!url.startsWith("http://") && !url.startsWith("https://")) {
                url = "https://" + url;
            }

            // Извлекаем домен
            java.net.URL parsedUrl = new java.net.URL(url);
            String baseUrl = parsedUrl.getProtocol() + "://" + parsedUrl.getHost();

            // Пробуем получить favicon через стандартный путь
            String faviconUrl = baseUrl + "/favicon.ico";
            if (checkUrlExists(faviconUrl)) {
                return faviconUrl;
            }

            // Пробуем найти через HTML
            String html = fetchHtml(url);
            if (html != null) {
                Matcher matcher = FAVICON_PATTERN.matcher(html);
                if (matcher.find()) {
                    String iconPath = matcher.group(1);
                    if (iconPath.startsWith("//")) {
                        return "https:" + iconPath;
                    } else if (iconPath.startsWith("/")) {
                        return baseUrl + iconPath;
                    } else if (iconPath.startsWith("http")) {
                        return iconPath;
                    } else {
                        return baseUrl + "/" + iconPath;
                    }
                }
            }

            // Пробуем другие варианты
            String[] variants = {
                    baseUrl + "/favicon.png",
                    baseUrl + "/apple-touch-icon.png",
                    baseUrl + "/apple-touch-icon-precomposed.png"
            };

            for (String variant : variants) {
                if (checkUrlExists(variant)) {
                    return variant;
                }
            }

            return null;
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }

    private boolean checkUrlExists(String urlString) {
        try {
            HttpURLConnection connection = (HttpURLConnection) new URL(urlString).openConnection();
            connection.setRequestMethod("HEAD");
            connection.setConnectTimeout(3000);
            connection.setReadTimeout(3000);
            int responseCode = connection.getResponseCode();
            return responseCode == HttpURLConnection.HTTP_OK;
        } catch (Exception e) {
            return false;
        }
    }

    private String fetchHtml(String urlString) {
        try {
            URL url = new URL(urlString);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("GET");
            connection.setConnectTimeout(5000);
            connection.setReadTimeout(5000);
            connection.setRequestProperty("User-Agent", "Mozilla/5.0");

            BufferedReader reader = new BufferedReader(
                    new InputStreamReader(connection.getInputStream())
            );
            StringBuilder content = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                content.append(line);
                if (content.length() > 50000) break; // Ограничиваем размер
            }
            reader.close();
            return content.toString();
        } catch (Exception e) {
            return null;
        }
    }

    private LinkDTO convertToDTO(Link link) {
        LinkDTO dto = new LinkDTO();
        dto.setId(link.getId());
        dto.setTitle(link.getTitle());
        dto.setUrl(link.getUrl());
        dto.setIcon(link.getIcon());
        dto.setIconType(link.getIconType());      // ← ДОБАВИТЬ
        dto.setCustomImage(link.getCustomImage()); // ← ДОБАВИТЬ
        dto.setPosition(link.getPosition());
        return dto;
    }

    private LinkResponseDTO convertToResponseDTO(Link link) {
        LinkResponseDTO dto = new LinkResponseDTO();
        dto.setId(link.getId());
        dto.setTitle(link.getTitle());
        dto.setUrl(link.getUrl());
        dto.setIcon(link.getIcon());
        dto.setIconType(link.getIconType());      // ← ДОБАВИТЬ
        dto.setCustomImage(link.getCustomImage()); // ← ДОБАВИТЬ
        dto.setPosition(link.getPosition());
        dto.setPageId(link.getPage().getId());
        return dto;
    }
}