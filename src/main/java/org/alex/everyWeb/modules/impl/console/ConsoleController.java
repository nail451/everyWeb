package org.alex.everyWeb.modules.impl.console;

import org.alex.everyWeb.page.service.PageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/console")
public class ConsoleController {

    @Autowired
    private ConsoleTokenService tokenService;

    @Autowired
    private PageService pageService;

    @PostMapping("/token")
    public ResponseEntity<?> getToken(@RequestBody TokenRequest req) {
        boolean ok = pageService.verifyPassword(req.pageId(), req.password());
        if (!ok) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid password"));
        }
        String token = tokenService.createToken();
        return ResponseEntity.ok(Map.of("token", token, "expiresIn", 60));
    }

    public record TokenRequest(Long pageId, String password) {}
}