package dev.workbench;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public record Article(
        String id,
        String title,
        String excerpt,
        String body,
        String authorId,
        String authorName,
        String status,
        Instant createdAt,
        Instant updatedAt,
        Instant publishedAt) {
    public String summary() {
        if (!excerpt.isBlank()) return excerpt;
        String text = body.replaceAll("\\s+", " ").strip();
        return text.length() > 140 ? text.substring(0, 140) + "…" : text;
    }

    public record Input(
            @NotBlank @Size(max = 200) String title,
            @NotNull @Size(max = 500) String excerpt,
            @NotNull @Size(max = 50000) String body) {}
}
