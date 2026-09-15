package dev.workbench;

import java.time.Instant;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.reactive.TransactionalOperator;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Component
@ConditionalOnProperty(name = "workbench.demo-data", havingValue = "true", matchIfMissing = true)
public class DemoData implements ApplicationRunner {
    private final DatabaseClient db;
    private final PasswordEncoder encoder;
    private final TransactionalOperator transaction;
    private final String password;

    public DemoData(
            DatabaseClient db,
            PasswordEncoder encoder,
            org.springframework.transaction.ReactiveTransactionManager manager,
            @Value("${workbench.demo-password}") String password) {
        this.db = db;
        this.encoder = encoder;
        this.transaction = TransactionalOperator.create(manager);
        this.password = password;
    }

    @Override
    public void run(ApplicationArguments arguments) {
        var users = List.of(
                new String[] {"alice", "林晓", "author"},
                new String[] {"bob", "陈远", "author"},
                new String[] {"editor", "周宁", "editor"},
                new String[] {"reviewer", "苏晴", "reviewer"},
                new String[] {"publisher", "许言", "publisher"},
                new String[] {"manager", "内容负责人", "editor,reviewer,publisher"});
        String hash = encoder.encode(password);
        Flux.fromIterable(users)
                .concatMap(user -> db.sql(
                                "INSERT INTO users(id,username,display_name,password_hash,roles) SELECT :id,:username,:name,:password,:roles WHERE NOT EXISTS (SELECT 1 FROM users WHERE username=:username)")
                        .bind("id", "user-" + user[0])
                        .bind("username", user[0])
                        .bind("name", user[1])
                        .bind("password", hash)
                        .bind("roles", user[2])
                        .fetch()
                        .rowsUpdated())
                .then(seed(
                        "article-welcome",
                        "把想法写下来，让协作发生",
                        "一处安静的写作空间，让每一份好内容被看见。",
                        "欢迎来到文章工作台。\n\n这里汇集团队的观察、经验与新想法。你可以整理草稿、编辑文章，也可以在公开站点阅读已经发布的内容。\n\n写作从一个清晰的问题开始。把背景说清楚，用具体事实支撑观点，再邀请同事一起完善。",
                        "alice",
                        true))
                .then(seed(
                        "article-open-day",
                        "团队开放日：把计划变成相遇",
                        "关于下一次团队开放日的筹备想法。",
                        "我们计划在下个月组织一次开放日。\n\n上午安排项目分享，下午留给自由交流。场地和具体时间还需要进一步确认。",
                        "alice",
                        false))
                .then(seed(
                        "article-field-notes",
                        "一次用户访谈的现场笔记",
                        "从真实场景中发现值得解决的问题。",
                        "今天的访谈让我们重新理解了用户的工作流程。\n\n下一步是梳理问题，形成可以验证的改进假设。",
                        "bob",
                        false))
                .as(transaction::transactional)
                .block(); // Application startup only; never on a request/event-loop thread.
    }

    private Mono<Long> seed(String id, String title, String excerpt, String body, String author, boolean published) {
        Instant now = Instant.now();
        var query = db.sql(
                        "INSERT INTO articles(id,title,excerpt,body,author_id,status,created_at,updated_at,published_at) SELECT :id,:title,:excerpt,:body,:author,:status,:now,:now,:published WHERE NOT EXISTS (SELECT 1 FROM articles WHERE id=:id)")
                .bind("id", id)
                .bind("title", title)
                .bind("excerpt", excerpt)
                .bind("body", body)
                .bind("author", "user-" + author)
                .bind("status", published ? "published" : "draft")
                .bind("now", now);
        return (published ? query.bind("published", now) : query.bindNull("published", Instant.class))
                .fetch()
                .rowsUpdated();
    }
}
