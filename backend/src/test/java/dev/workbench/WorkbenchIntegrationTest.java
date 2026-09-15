package dev.workbench;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpMethod;
import org.springframework.test.web.reactive.server.WebTestClient;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {"spring.r2dbc.url=r2dbc:h2:mem:///workbench-test?DB_CLOSE_DELAY=-1", "workbench.demo-data=true"})
class WorkbenchIntegrationTest {
    @Value("${local.server.port}")
    int port;

    WebTestClient client;

    @BeforeEach
    void client() {
        client =
                WebTestClient.bindToServer().baseUrl("http://127.0.0.1:" + port).build();
    }

    class Session {
        final Map<String, String> cookies = new HashMap<>();
        String csrf;

        void token() {
            var result = client.get()
                    .uri("/api/csrf")
                    .cookies(c -> cookies.forEach(c::add))
                    .exchange()
                    .expectStatus()
                    .isOk()
                    .expectBody(Map.class)
                    .returnResult();
            result.getResponseCookies()
                    .forEach((key, values) -> cookies.put(key, values.getFirst().getValue()));
            csrf = (String) result.getResponseBody().get("token");
        }

        WebTestClient.ResponseSpec request(HttpMethod method, String path, Object body) {
            token();
            var request = client.method(method)
                    .uri(path)
                    .cookies(c -> cookies.forEach(c::add))
                    .header("X-XSRF-TOKEN", csrf);
            return body == null ? request.exchange() : request.bodyValue(body).exchange();
        }

        Session login(String name) {
            var result = request(
                            HttpMethod.POST, "/api/session", Map.of("username", name, "password", "Workbench2026!"))
                    .expectStatus()
                    .isOk()
                    .expectBody(Map.class)
                    .returnResult();
            result.getResponseCookies()
                    .forEach((key, values) -> cookies.put(key, values.getFirst().getValue()));
            assertThat(((Map<?, ?>) result.getResponseBody().get("user")).containsKey("passwordHash"))
                    .isFalse();
            return this;
        }
    }

    Map<String, String> input(String title) {
        return Map.of("title", title, "excerpt", "摘要", "body", "正文\n第二段");
    }

    String create(Session session) {
        var result = session.request(HttpMethod.POST, "/api/articles", input("测试文章 " + UUID.randomUUID()))
                .expectStatus()
                .isCreated()
                .expectBody(Map.class)
                .returnResult();
        return (String) ((Map<?, ?>) result.getResponseBody().get("article")).get("id");
    }

    @Test
    void sessionAndCsrf() {
        client.post()
                .uri("/api/session")
                .bodyValue(Map.of("username", "alice", "password", "Workbench2026!"))
                .exchange()
                .expectStatus()
                .isForbidden();
        var session = new Session();
        session.request(HttpMethod.POST, "/api/session", Map.of("username", "alice", "password", "wrong"))
                .expectStatus()
                .isUnauthorized();
        session.login("alice");
        session.request(HttpMethod.GET, "/api/session", null)
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.user.username")
                .isEqualTo("alice");
        session.request(HttpMethod.DELETE, "/api/session", null).expectStatus().isNoContent();
        session.request(HttpMethod.GET, "/api/articles", null).expectStatus().isUnauthorized();
    }

    @Test
    void authorsCannotReadOrWriteOtherDrafts() {
        client.get().uri("/api/articles").exchange().expectStatus().isUnauthorized();
        client.get()
                .uri("/api/public/articles/article-open-day")
                .exchange()
                .expectStatus()
                .isNotFound();
        var alice = new Session().login("alice");
        alice.request(HttpMethod.GET, "/api/articles/article-field-notes", null)
                .expectStatus()
                .isNotFound();
        alice.request(HttpMethod.PUT, "/api/articles/article-field-notes", input("越权修改"))
                .expectStatus()
                .isNotFound();
    }

    @Test
    void writePublishReadAndUnpublish() {
        var author = new Session().login("alice");
        var publisher = new Session().login("publisher");
        var editor = new Session().login("editor");
        String id = create(author);
        author.request(HttpMethod.POST, "/api/articles/" + id + "/publish", null)
                .expectStatus()
                .isForbidden();
        editor.request(HttpMethod.PUT, "/api/articles/" + id, input("编辑后的标题"))
                .expectStatus()
                .isOk();
        publisher
                .request(HttpMethod.PUT, "/api/articles/" + id, input("禁止发布者编辑"))
                .expectStatus()
                .isForbidden();
        var first = publisher
                .request(HttpMethod.POST, "/api/articles/" + id + "/publish", null)
                .expectStatus()
                .isOk()
                .expectBody(Map.class)
                .returnResult()
                .getResponseBody();
        var second = publisher
                .request(HttpMethod.POST, "/api/articles/" + id + "/publish", null)
                .expectStatus()
                .isOk()
                .expectBody(Map.class)
                .returnResult()
                .getResponseBody();
        assertThat(second).isEqualTo(first);
        client.get()
                .uri("/api/public/articles/" + id)
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.article.title")
                .isEqualTo("编辑后的标题");
        publisher
                .request(HttpMethod.POST, "/api/articles/" + id + "/unpublish", null)
                .expectStatus()
                .isOk();
        client.get().uri("/api/public/articles/" + id).exchange().expectStatus().isNotFound();
    }

    @Test
    void reviewerReadOnlyAndInputValidation() {
        var reviewer = new Session().login("reviewer");
        reviewer.request(HttpMethod.GET, "/api/articles", null).expectStatus().isOk();
        reviewer.request(HttpMethod.POST, "/api/articles", input("无权创建"))
                .expectStatus()
                .isForbidden();
        reviewer.request(HttpMethod.PUT, "/api/articles/article-open-day", input("无权修改"))
                .expectStatus()
                .isForbidden();
        var author = new Session().login("alice");
        var injection = new HashMap<>(input("注入"));
        injection.put("authorId", "user-bob");
        author.request(HttpMethod.POST, "/api/articles", injection)
                .expectStatus()
                .isBadRequest();
        author.request(HttpMethod.POST, "/api/articles", input("   "))
                .expectStatus()
                .isBadRequest();
        author.request(HttpMethod.GET, "/api/articles?page=-1", null)
                .expectStatus()
                .isBadRequest();
    }

    @Test
    void publicHtmlEscapesContentAndHidesDrafts() {
        var manager = new Session().login("manager");
        String id = create(manager);
        manager.request(
                        HttpMethod.PUT,
                        "/api/articles/" + id,
                        Map.of(
                                "title",
                                "<script>bad()</script>",
                                "excerpt",
                                "<b>摘要</b>",
                                "body",
                                "<script>window.injected=true</script>"))
                .expectStatus()
                .isOk();
        client.get().uri("/articles/" + id).exchange().expectStatus().isNotFound();
        manager.request(HttpMethod.POST, "/api/articles/" + id + "/publish", null)
                .expectStatus()
                .isOk();
        var html = client.get()
                .uri("/articles/" + id)
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody(String.class)
                .returnResult()
                .getResponseBody();
        assertThat(html).contains("&lt;script&gt;").doesNotContain("<script>bad()");
        client.get().uri("/").exchange().expectStatus().isOk().expectHeader().contentTypeCompatibleWith("text/html");
    }
}
