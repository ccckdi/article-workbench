package dev.workbench;

import jakarta.validation.Valid;
import java.security.Principal;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api")
public class ArticleController {
    private final ArticleService articles;
    private final AccountRepository accounts;
    private final DatabaseClient db;

    public ArticleController(ArticleService articles, AccountRepository accounts, DatabaseClient db) {
        this.articles = articles;
        this.accounts = accounts;
        this.db = db;
    }

    private Mono<Account> account(Principal principal) {
        return accounts.findByUsername(principal.getName())
                .switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "请先登录")));
    }

    @GetMapping("/health")
    Mono<Map<String, String>> health() {
        return db.sql("SELECT 1").fetch().first().map(row -> Map.of("status", "ok"));
    }

    @GetMapping("/articles")
    Mono<ListResult<Article>> list(
            Principal principal,
            @RequestParam(defaultValue = "") String q,
            @RequestParam(defaultValue = "") String status,
            @RequestParam(defaultValue = "1") int page) {
        return account(principal).flatMap(user -> articles.list(user, q, status, page));
    }

    @GetMapping("/articles/{id}")
    Mono<Map<String, Article>> get(Principal principal, @PathVariable String id) {
        return account(principal).flatMap(user -> articles.get(id, user)).map(article -> Map.of("article", article));
    }

    @PostMapping("/articles")
    @ResponseStatus(HttpStatus.CREATED)
    Mono<Map<String, Article>> create(Principal principal, @Valid @RequestBody Article.Input input) {
        return account(principal)
                .flatMap(user -> articles.create(input, user))
                .map(article -> Map.of("article", article));
    }

    @PutMapping("/articles/{id}")
    Mono<Map<String, Article>> update(
            Principal principal, @PathVariable String id, @Valid @RequestBody Article.Input input) {
        return account(principal)
                .flatMap(user -> articles.update(id, input, user))
                .map(article -> Map.of("article", article));
    }

    @PostMapping("/articles/{id}/publish")
    Mono<Map<String, Article>> publish(Principal principal, @PathVariable String id) {
        return account(principal)
                .flatMap(user -> articles.publish(id, true, user))
                .map(article -> Map.of("article", article));
    }

    @PostMapping("/articles/{id}/unpublish")
    Mono<Map<String, Article>> unpublish(Principal principal, @PathVariable String id) {
        return account(principal)
                .flatMap(user -> articles.publish(id, false, user))
                .map(article -> Map.of("article", article));
    }

    @GetMapping("/public/articles")
    Mono<ListResult<Article>> publicList(
            @RequestParam(defaultValue = "") String q, @RequestParam(defaultValue = "1") int page) {
        return articles.list(null, q, "", page);
    }

    @GetMapping("/public/articles/{id}")
    Mono<Map<String, Article>> publicArticle(@PathVariable String id) {
        return articles.get(id, null).map(article -> Map.of("article", article));
    }
}
