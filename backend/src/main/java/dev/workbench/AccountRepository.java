package dev.workbench;

import java.util.List;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Mono;

@Repository
public class AccountRepository {
    private final DatabaseClient db;

    public AccountRepository(DatabaseClient db) {
        this.db = db;
    }

    public Mono<Account> findByUsername(String username) {
        return db.sql("SELECT * FROM users WHERE username=:username")
                .bind("username", username)
                .map((row, metadata) -> new Account(
                        row.get("id", String.class),
                        row.get("username", String.class),
                        row.get("display_name", String.class),
                        row.get("password_hash", String.class),
                        List.of(row.get("roles", String.class).split(","))))
                .one();
    }
}
