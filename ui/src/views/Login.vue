<script setup lang="ts">
import { publicUrl } from "../public-url";
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuth } from "../stores/auth";
import Brand from "../components/Brand.vue";
const auth = useAuth();
const route = useRoute();
const router = useRouter();
const username = ref("");
const password = ref("");
const error = ref("");
const busy = ref(false);
async function submit() {
  busy.value = true;
  error.value = "";
  try {
    await auth.login(username.value, password.value);
    const next = String(route.query.next || "/articles");
    await router.replace(next.startsWith("/articles") ? next : "/articles");
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <div class="login-page">
    <section class="login-story">
      <Brand />
      <div>
        <p class="eyebrow">THOUGHTS INTO WORDS</p>
        <h1>让好的想法，<br />有一个开始。</h1>
        <p>在这里写下观察、分享经验，<br />让内容连接每一个人。</p>
        <div class="story-lines"><span></span><span></span><span></span></div>
      </div>
      <span class="muted">写作 · 协作 · 分享</span>
    </section>
    <main class="login-form">
      <a class="back-link" :href="publicUrl()">← 浏览公开站点</a>
      <div>
        <p class="eyebrow">欢迎回来</p>
        <h2>登录工作台</h2>
        <p class="muted">继续记录，继续创造。</p>
        <form @submit.prevent="submit">
          <label
            >账号<input
              v-model="username"
              autocomplete="username"
              required
              placeholder="输入账号" /></label
          ><label
            >密码<input
              v-model="password"
              type="password"
              autocomplete="current-password"
              required
              placeholder="输入密码"
          /></label>
          <div v-if="error" class="notice error" role="alert">{{ error }}</div>
          <button class="primary full" :disabled="busy">
            {{ busy ? "正在登录…" : "登录 →" }}
          </button>
        </form>
      </div>
    </main>
  </div>
</template>
