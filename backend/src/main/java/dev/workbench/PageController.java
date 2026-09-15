package dev.workbench;

import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.result.view.Rendering;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Mono;

@Controller
public class PageController {
    private final ArticleService articles;

    public PageController(ArticleService articles) {
        this.articles = articles;
    }

    @GetMapping("/")
    Mono<Rendering> home(@RequestParam(defaultValue = "1") int page) {
        return articles.list(null, "", "", page)
                .map(result ->
                        Rendering.view("index").modelAttribute("result", result).build());
    }

    @GetMapping("/articles/{id}")
    Mono<Rendering> article(@PathVariable String id) {
        return articles.get(id, null)
                .map(article -> Rendering.view("article")
                        .modelAttribute("article", article)
                        .build())
                .onErrorResume(
                        ResponseStatusException.class,
                        error -> Mono.just(Rendering.view("not-found")
                                .status(HttpStatus.NOT_FOUND)
                                .build()));
    }

    @GetMapping(
            value = {
                "/console/",
                "/console/login",
                "/console/articles",
                "/console/articles/new",
                "/console/articles/{id}"
            },
            produces = MediaType.TEXT_HTML_VALUE)
    @ResponseBody
    Resource console() {
        var resource = new ClassPathResource("static/console/index.html");
        if (!resource.exists())
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "请先构建 ui，或通过前端开发服务访问工作台");
        return resource;
    }
}
