package dev.workbench;

import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.server.ServerWebInputException;

@RestControllerAdvice(assignableTypes = {ArticleController.class, SessionController.class})
public class ApiErrors {
    @ExceptionHandler(ServerWebInputException.class)
    ResponseEntity<Map<String, String>> invalid(ServerWebInputException error) {
        return ResponseEntity.badRequest().body(Map.of("message", "请求字段不符合要求"));
    }

    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<Map<String, String>> status(ResponseStatusException error) {
        return ResponseEntity.status(error.getStatusCode())
                .body(Map.of("message", error.getReason() == null ? "请求无法完成" : error.getReason()));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<Map<String, String>> unexpected(Exception error) {
        org.slf4j.LoggerFactory.getLogger(ApiErrors.class).error("API request failed", error);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "服务暂时无法处理请求"));
    }
}
