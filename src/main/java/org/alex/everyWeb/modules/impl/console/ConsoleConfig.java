package org.alex.everyWeb.modules.impl.console;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

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
}