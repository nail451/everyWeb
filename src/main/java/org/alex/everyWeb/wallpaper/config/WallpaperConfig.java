package org.alex.everyWeb.wallpaper.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WallpaperConfig implements WebMvcConfigurer {

    @Value("${app.wallpaper.upload-dir:./wallpapers}")
    private String uploadDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Регистрируем ресурсы для доступа к загруженным обоям
        registry.addResourceHandler("/wallpapers/**")
                .addResourceLocations("file:" + uploadDir + "/")
                .setCachePeriod(3600); // Кеширование на 1 час
    }
}