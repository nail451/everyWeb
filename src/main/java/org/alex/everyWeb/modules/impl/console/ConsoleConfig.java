package org.alex.everyWeb.modules.impl.console;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.server.standard.ServletServerContainerFactoryBean;

@Configuration
@EnableWebSocket
public class ConsoleConfig implements WebSocketConfigurer {

    @Autowired
    private ConsoleWebSocketHandler consoleHandler;

    @Autowired
    private ConsoleHandshakeInterceptor consoleHandshakeInterceptor;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(consoleHandler, "/ws/console")
                .addInterceptors(consoleHandshakeInterceptor)
                .setAllowedOrigins("*"); // локальная сеть
    }

    @Bean
    public ServletServerContainerFactoryBean createWebSocketContainer() {
        ServletServerContainerFactoryBean container = new ServletServerContainerFactoryBean();
        container.setMaxSessionIdleTimeout(0L);
        return container;
    }
}