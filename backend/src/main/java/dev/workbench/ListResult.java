package dev.workbench;

import java.util.Collections;
import java.util.Iterator;
import java.util.List;
import java.util.Optional;
import java.util.function.Supplier;
import java.util.stream.Stream;
import org.springframework.util.Assert;

/**
 * Adapted from Halo v2.26.1 run.halo.app.extension.ListResult (GPL-3.0). Uses a record and omits Halo's runtime
 * schema-class generation. See THIRD_PARTY_NOTICES.md.
 */
public record ListResult<T>(int page, int size, long total, List<T> items) implements Iterable<T>, Supplier<Stream<T>> {
    public ListResult {
        Assert.isTrue(total >= 0, "Total elements must be greater than or equal to 0");
        page = Math.max(0, page);
        size = Math.max(0, size);
        items = items == null ? Collections.emptyList() : items;
    }

    public boolean isFirst() {
        return !hasPrevious();
    }

    public boolean isLast() {
        return !hasNext();
    }

    public boolean hasNext() {
        return page > 0 && page < getTotalPages();
    }

    public boolean hasPrevious() {
        return page > 1;
    }

    public long getTotalPages() {
        return size == 0 ? 1 : (total + size - 1) / size;
    }

    public Iterator<T> iterator() {
        return items.iterator();
    }

    public Stream<T> get() {
        return items.stream();
    }

    public static <T> Optional<T> first(ListResult<T> result) {
        return Optional.ofNullable(result)
                .map(ListResult::items)
                .filter(items -> !items.isEmpty())
                .map(List::getFirst);
    }
}
