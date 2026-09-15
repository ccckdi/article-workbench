<script setup lang="ts">
import { publicUrl } from "../public-url";
import { computed, onBeforeUnmount, ref, watch } from "vue";
import {
  onBeforeRouteLeave,
  onBeforeRouteUpdate,
  useRoute,
  useRouter,
} from "vue-router";
import { api } from "../api";
import { useAuth } from "../stores/auth";
import type { Article, ArticleInput } from "../types";
import { DateUtils } from "../utils/date";
import StatusDot from "../components/StatusDot.vue";
import { useEditing } from "../stores/editing";
const editing = useEditing();
const auth = useAuth();
const route = useRoute();
const router = useRouter();
const dates = new DateUtils();
const id = computed(() => (route.params.id ? String(route.params.id) : null));
const blank = (): ArticleInput => ({ title: "", excerpt: "", body: "" });
const article = ref<Article | null>(null);
const draft = ref<ArticleInput>(blank());
const baseline = ref("");
const loading = ref(false);
const busy = ref(false);
const error = ref("");
const message = ref("");
const dirty = computed(() => JSON.stringify(draft.value) !== baseline.value);
watch(
  dirty,
  (value) => {
    editing.dirty = value;
  },
  { immediate: true },
);
onBeforeUnmount(() => {
  editing.dirty = false;
});
const editable = computed(
  () =>
    auth.user?.roles.includes("editor") ||
    (article.value
      ? article.value.authorId === auth.user?.id
      : auth.user?.roles.includes("author")),
);
function loadArticle(value: Article) {
  article.value = value;
  draft.value = {
    title: value.title,
    excerpt: value.excerpt,
    body: value.body,
  };
  baseline.value = JSON.stringify(draft.value);
}
let currentRequest = 0;
watch(
  id,
  async (value) => {
    const request = ++currentRequest;
    article.value = null;
    draft.value = blank();
    baseline.value = JSON.stringify(draft.value);
    error.value = "";
    message.value = "";
    if (!value) return;
    loading.value = true;
    try {
      const data = await api<{ article: Article }>(`/articles/${value}`);
      if (request === currentRequest) loadArticle(data.article);
    } catch (e) {
      if (request === currentRequest) error.value = (e as Error).message;
    } finally {
      if (request === currentRequest) loading.value = false;
    }
  },
  { immediate: true },
);
function mayLeave() {
  return (
    !auth.user ||
    !dirty.value ||
    busy.value ||
    window.confirm("有未保存的内容，确定离开吗？")
  );
}
onBeforeRouteLeave(mayLeave);
onBeforeRouteUpdate(mayLeave);
const warn = (event: BeforeUnloadEvent) => {
  if (dirty.value) event.preventDefault();
};
window.addEventListener("beforeunload", warn);
onBeforeUnmount(() => {
  currentRequest++;
  window.removeEventListener("beforeunload", warn);
});
async function save() {
  if (!editable.value) return;
  busy.value = true;
  error.value = "";
  message.value = "";
  try {
    const data = await api<{ article: Article }>(
      id.value ? `/articles/${id.value}` : "/articles",
      { method: id.value ? "PUT" : "POST", body: JSON.stringify(draft.value) },
    );
    loadArticle(data.article);
    if (!id.value) await router.replace(`/articles/${data.article.id}`);
    message.value = "已保存";
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
async function publish() {
  if (!article.value || dirty.value) return;
  busy.value = true;
  error.value = "";
  message.value = "";
  try {
    const data = await api<{ article: Article }>(
      `/articles/${article.value.id}/${article.value.status === "published" ? "unpublish" : "publish"}`,
      { method: "POST" },
    );
    loadArticle(data.article);
    message.value =
      article.value?.status === "published" ? "文章已发布" : "文章已取消发布";
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <div :data-dirty="dirty">
    <div class="editor-top">
      <RouterLink class="back-link" to="/articles">← 返回文章</RouterLink
      ><span class="muted">{{ dirty ? "有未保存的修改" : "修改已保存" }}</span>
    </div>
    <div v-if="loading" class="loading" role="status">正在加载内容…</div>
    <template v-else
      ><div v-if="error" class="notice error" role="alert">{{ error }}</div>
      <div v-if="message" class="notice success" role="status">
        {{ message }}
      </div>
      <form v-if="!id || article" class="editor-form" @submit.prevent="save">
        <header class="editor-header">
          <div>
            <p class="eyebrow">WRITING SPACE</p>
            <h1>{{ id ? "文章内容" : "新的想法，从这里开始" }}</h1>
          </div>
          <div class="editor-actions">
            <StatusDot
              v-if="article"
              :state="article.status === 'published' ? 'success' : 'default'"
              :text="article.status === 'published' ? '已发布' : '草稿'"
            /><button
              v-if="editable"
              class="primary"
              :disabled="busy || !draft.title.trim()"
            >
              {{ busy ? "处理中…" : "保存文章" }}
            </button>
          </div>
        </header>
        <div class="editor-grid">
          <section class="writing-card">
            <label class="field-label" for="title">文章标题</label
            ><input
              id="title"
              v-model="draft.title"
              class="title-input"
              placeholder="一个清晰、有力量的标题"
              required
              maxlength="200"
              :disabled="!editable || busy"
            /><label class="field-label" for="body">正文</label
            ><textarea
              id="body"
              v-model="draft.body"
              class="body-input"
              placeholder="写下你的内容…"
              maxlength="50000"
              :disabled="!editable || busy"
            ></textarea>
            <div class="word-count">
              {{ draft.body.length.toLocaleString() }} 字符
            </div>
          </section>
          <aside class="article-settings">
            <section class="settings-card">
              <h2>文章摘要</h2>
              <p>用一小段话概括文章内容。</p>
              <textarea
                v-model="draft.excerpt"
                aria-label="文章摘要"
                placeholder="留空时展示正文开头"
                maxlength="500"
                :disabled="!editable || busy"
              ></textarea>
            </section>
            <section v-if="article" class="settings-card">
              <h2>文章信息</h2>
              <dl>
                <dt>作者</dt>
                <dd>{{ article.authorName }}</dd>
                <dt>最近更新</dt>
                <dd>{{ dates.format(article.updatedAt, "M月D日 HH:mm") }}</dd>
              </dl>
              <a
                v-if="article.status === 'published'"
                class="button secondary full"
                :href="publicUrl(`/articles/${article.id}`)"
                target="_blank"
                rel="noopener"
                >查看公开文章 ↗</a
              ><button
                v-if="auth.user?.roles.includes('publisher')"
                type="button"
                class="full"
                :class="
                  article.status === 'published' ? 'secondary' : 'primary'
                "
                :disabled="busy || dirty"
                @click="publish"
              >
                {{ article.status === "published" ? "取消发布" : "发布文章" }}
              </button>
              <p v-if="dirty && auth.user?.roles.includes('publisher')">
                请先保存修改，再进行发布操作。
              </p>
            </section>
          </aside>
        </div>
      </form></template
    >
  </div>
</template>
