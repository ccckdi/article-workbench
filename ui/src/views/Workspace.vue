<script setup lang="ts">
import { publicUrl } from "../public-url";
import { ref } from "vue";
import { useRouter } from "vue-router";
import Brand from "../components/Brand.vue";
import { useAuth } from "../stores/auth";
import { roleNames } from "../types";
import { useEditing } from "../stores/editing";
const editing = useEditing();
const auth = useAuth();
const router = useRouter();
const error = ref("");
async function logout() {
  if (editing.dirty && !window.confirm("有未保存的修改，确定退出登录吗？"))
    return;
  try {
    await auth.logout();
    await router.replace("/login");
  } catch (e) {
    error.value = (e as Error).message;
  }
}
</script>
<template>
  <div class="workspace">
    <aside class="sidebar">
      <Brand />
      <p class="nav-label">内容空间</p>
      <nav>
        <RouterLink class="nav-item active" to="/articles"
          ><span>▤</span>文章管理</RouterLink
        ><a class="nav-item" :href="publicUrl()"><span>↗</span>公开站点</a>
      </nav>
      <div class="sidebar-bottom">
        <div v-if="auth.user" class="user-card">
          <span class="avatar">{{ auth.user.displayName[0] }}</span>
          <div>
            <strong>{{ auth.user.displayName }}</strong
            ><small>{{
              auth.user.roles.map((role) => roleNames[role]).join(" / ")
            }}</small>
          </div>
        </div>
        <button class="text-button" @click="logout">退出登录</button>
        <div v-if="error" class="notice error" role="alert">{{ error }}</div>
      </div>
    </aside>
    <main class="workspace-main"><RouterView /></main>
  </div>
</template>
