package dev.workbench;

import io.r2dbc.spi.Row;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Mono;

@Service
public class ArticleService {
    private static final String SELECT =
            "SELECT a.*, u.display_name AS author_name FROM articles a JOIN users u ON a.author_id=u.id";
    private final DatabaseClient db;

    public ArticleService(DatabaseClient db) {
        this.db = db;
    }

    public Mono<ListResult<Article>> list(Account user, String keyword, String status, int page) {
        if (page < 1
                || page > 10000
                || keyword.length() > 200
                || !status.isEmpty() && !status.equals("draft") && !status.equals("published")) {
            return Mono.error(new ResponseStatusException(HttpStatus.BAD_REQUEST, "查询条件不符合要求"));
        }
        String scope = user == null ? "a.status='published'" : user.canSeeTeam() ? "1=1" : "a.author_id=:author";
        String where =
                " WHERE " + scope + " AND a.title LIKE :keyword" + (status.isEmpty() ? "" : " AND a.status=:status");
        var count = query("SELECT COUNT(*) AS total FROM articles a" + where, user, keyword, status)
                .map((row, metadata) -> row.get("total", Long.class))
                .one();
        var items = query(
                        SELECT + where + " ORDER BY a.updated_at DESC, a.id LIMIT 20 OFFSET :offset",
                        user,
                        keyword,
                        status)
                .bind("offset", (page - 1) * 20)
                .map((row, metadata) -> map(row))
                .all()
                .collectList();
        return Mono.zip(count, items).map(result -> new ListResult<>(page, 20, result.getT1(), result.getT2()));
    }

    private DatabaseClient.GenericExecuteSpec query(String sql, Account user, String keyword, String status) {
        var query = db.sql(sql).bind("keyword", "%" + keyword + "%");
        if (user != null && !user.canSeeTeam()) query = query.bind("author", user.id());
        if (!status.isEmpty()) query = query.bind("status", status);
        return query;
    }

    public Mono<Article> get(String id, Account user) {
        return db.sql(SELECT + " WHERE a.id=:id")
                .bind("id", id)
                .map((row, metadata) -> map(row))
                .one()
                .filter(article -> user == null
                        ? article.status().equals("published")
                        : user.canSeeTeam() || article.authorId().equals(user.id()))
                .switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.NOT_FOUND, "文章不存在或无权访问")));
    }

    public Mono<Article> create(Article.Input input, Account user) {
        if (!user.hasRole("author") && !user.hasRole("editor")) return forbidden("当前账号没有写作权限");
        String id = UUID.randomUUID().toString();
        Instant now = Instant.now();
        return db.sql(
                        "INSERT INTO articles(id,title,excerpt,body,author_id,created_at,updated_at) VALUES(:id,:title,:excerpt,:body,:author,:now,:now)")
                .bind("id", id)
                .bind("title", input.title().strip())
                .bind("excerpt", input.excerpt().strip())
                .bind("body", input.body())
                .bind("author", user.id())
                .bind("now", now)
                .fetch()
                .rowsUpdated()
                .then(get(id, user));
    }

    public Mono<Article> update(String id, Article.Input input, Account user) {
        return get(id, user).flatMap(article -> {
            if (!user.hasRole("editor") && !article.authorId().equals(user.id())) return forbidden("当前账号没有编辑权限");
            return db.sql("UPDATE articles SET title=:title,excerpt=:excerpt,body=:body,updated_at=:now WHERE id=:id")
                    .bind("title", input.title().strip())
                    .bind("excerpt", input.excerpt().strip())
                    .bind("body", input.body())
                    .bind("now", Instant.now())
                    .bind("id", id)
                    .fetch()
                    .rowsUpdated()
                    .then(get(id, user));
        });
    }

    public Mono<Article> publish(String id, boolean publish, Account user) {
        if (!user.hasRole("publisher")) return forbidden("当前账号没有发布权限");
        String status = publish ? "published" : "draft";
        return get(id, user).flatMap(article -> {
            var sql = db.sql(
                            "UPDATE articles SET status=:status,published_at=:published,updated_at=:now WHERE id=:id AND status<>:status")
                    .bind("status", status)
                    .bind("now", Instant.now())
                    .bind("id", id);
            sql = publish ? sql.bind("published", Instant.now()) : sql.bindNull("published", Instant.class);
            return sql.fetch().rowsUpdated().then(get(id, user));
        });
    }

    private <T> Mono<T> forbidden(String message) {
        return Mono.error(new ResponseStatusException(HttpStatus.FORBIDDEN, message));
    }

    private Article map(Row row) {
        OffsetDateTime published = row.get("published_at", OffsetDateTime.class);
        return new Article(
                row.get("id", String.class),
                row.get("title", String.class),
                row.get("excerpt", String.class),
                row.get("body", String.class),
                row.get("author_id", String.class),
                row.get("author_name", String.class),
                row.get("status", String.class),
                row.get("created_at", OffsetDateTime.class).toInstant(),
                row.get("updated_at", OffsetDateTime.class).toInstant(),
                published == null ? null : published.toInstant());
    }
}
