package dev.workbench;

import static org.assertj.core.api.Assertions.*;

import java.util.List;
import org.junit.jupiter.api.Test;

class ListResultTest {
    @Test
    void pagingBoundaries() {
        var first = new ListResult<>(1, 20, 21, List.of("a"));
        assertThat(first.isFirst()).isTrue();
        assertThat(first.hasNext()).isTrue();
        assertThat(first.getTotalPages()).isEqualTo(2);
        var last = new ListResult<>(2, 20, 21, List.of("b"));
        assertThat(last.hasPrevious()).isTrue();
        assertThat(last.isLast()).isTrue();
        assertThat(ListResult.first(last)).contains("b");
        assertThat(new ListResult<>(0, 0, 0, null).items()).isEmpty();
        assertThatThrownBy(() -> new ListResult<>(1, 20, -1, List.of())).isInstanceOf(IllegalArgumentException.class);
    }
}
