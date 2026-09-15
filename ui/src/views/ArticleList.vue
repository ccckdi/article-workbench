<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { api } from "../api";
import { useAuth } from "../stores/auth";
import type { Article, ListResult } from "../types";
import { DateUtils } from "../utils/date";
import StatusDot from "../components/StatusDot.vue";
import Empty from "../components/Empty.vue";
const auth = useAuth();
const route = useRoute();
const router = useRouter();
const dates = new DateUtils();
const data = ref<ListResult<Article> | null>(null);
const search = ref("");
const error = ref("");
const loading = ref(true);
const page = computed(() => Number(route.query.page || 1));
const status = computed(() => String(route.query.status || ""));
let requestId = 0;
async function load() {
  const current = ++requestId;
  loading.value = true;
  error.value = "";
  search.value = String(route.query.q || "");
  try {
    const result = await api<ListResult<Article>>(
      `/articles?${new URLSearchParams({ q: search.value, ...(status.value ? { status: status.value } : {}), page: String(page.value) })}`,
    );
    if (current === requestId) data.value = result;
  } catch (e) {
    if (current === requestId) error.value = (e as Error).message;
  } finally {
    if (current === requestId) loading.value = false;
  }
}
watch(() => route.fullPath, load, { immediate: true });
function filter(value: string) {
  router.push({
    query: {
      ...(search.value ? { q: search.value } : {}),
      ...(value ? { status: value } : {}),
    },
  });
}
</script>
<template>
  <header class="page-header">
    <div>
      <p class="eyebrow">CONTENT LIBRARY</p>
      <h1>文章</h1>
      <p class="muted">每一个想法，都值得被认真记录。</p>
    </div>
    <RouterLink
      v-if="
        auth.user?.roles.some((role) => ['author', 'editor'].includes(role))
      "
      class="button primary"
      to="/articles/new"
      >＋ 新建文章</RouterLink
    >
  </header>
  <section class="library">
    <div class="toolbar">
      <div class="tabs" aria-label="文章状态">
        <button
          v-for="option in [
            { value: '', label: '全部文章' },
            { value: 'draft', label: '草稿' },
            { value: 'published', label: '已发布' },
          ]"
          :key="option.value"
          :class="{ selected: status === option.value }"
          @click="filter(option.value)"
        >
          {{ option.label }}
        </button>
      </div>
      <form class="search-form" @submit.prevent="filter(status)">
        <input
          v-model="search"
          aria-label="搜索文章"
          placeholder="搜索文章标题"
        /><button aria-label="搜索">⌕</button>
      </form>
    </div>
    <div class="list-heading">
      <span>标题与内容</span><span>作者</span><span>状态</span
      ><span>最近更新</span><span></span>
    </div>
    <div v-if="error" class="notice error" role="alert">
      {{ error }} <button @click="load">重试</button>
    </div>
    <div v-if="loading" class="loading" role="status">正在加载内容…</div>
    <template v-else
      ><RouterLink
        v-for="article in data?.items || []"
        :key="article.id"
        class="article-row"
        :to="`/articles/${article.id}`"
        ><div class="article-title">
          <span class="document-mark">文</span>
          <div>
            <h2>{{ article.title }}</h2>
            <p>
              {{
                article.excerpt ||
                article.body.slice(0, 140) ||
                "还没有正文内容"
              }}
            </p>
          </div>
        </div>
        <span class="row-author">{{ article.authorName }}</span
        ><StatusDot
          :state="article.status === 'published' ? 'success' : 'default'"
          :text="article.status === 'published' ? '已发布' : '草稿'"
        /><time>{{ dates.format(article.updatedAt, "M月D日 HH:mm") }}</time
        ><span class="row-arrow">→</span></RouterLink
      ><Empty
        v-if="!error && !data?.items.length"
        title="没有找到文章"
        message="创建一篇文章，或尝试其他筛选条件。"
    /></template>
    <footer class="list-footer">
      <span>共 {{ data?.total || 0 }} 篇文章</span>
      <div>
        <button
          :disabled="page <= 1 || loading"
          @click="router.push({ query: { ...route.query, page: page - 1 } })"
        >
          上一页</button
        ><span>第 {{ page }} 页</span
        ><button
          :disabled="!data || page * data.size >= data.total || loading"
          @click="router.push({ query: { ...route.query, page: page + 1 } })"
        >
          下一页
        </button>
      </div>
    </footer>
  </section>
</template>
