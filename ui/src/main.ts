import { createApp } from "vue";
import { createPinia } from "pinia";
import { createRouter, createWebHistory } from "vue-router";
import App from "./App.vue";
import Login from "./views/Login.vue";
import Workspace from "./views/Workspace.vue";
import ArticleList from "./views/ArticleList.vue";
import ArticleEditor from "./views/ArticleEditor.vue";
import NotFound from "./views/NotFound.vue";
import { useAuth } from "./stores/auth";
import "./tailwind.css";
import "./style.css";

const app = createApp(App);
app.use(createPinia());
const router = createRouter({
  history: createWebHistory("/console/"),
  routes: [
    { path: "/login", component: Login },
    {
      path: "/",
      component: Workspace,
      children: [
        { path: "", redirect: "/articles" },
        { path: "articles", component: ArticleList },
        { path: "articles/new", component: ArticleEditor },
        { path: "articles/:id", component: ArticleEditor },
      ],
    },
    { path: "/:pathMatch(.*)*", component: NotFound },
  ],
});
router.beforeEach(async (to) => {
  const auth = useAuth();
  try {
    await auth.refresh();
  } catch {
    return true;
  }
  if (!auth.user && to.path !== "/login")
    return { path: "/login", query: { next: to.fullPath } };
  if (auth.user && to.path === "/login") return "/articles";
});
app.use(router);
app.mount("#app");
