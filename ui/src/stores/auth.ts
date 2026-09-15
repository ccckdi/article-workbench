import { defineStore } from "pinia";
import { ref } from "vue";
import { api } from "../api";
import type { User } from "../types";

export const useAuth = defineStore("auth", () => {
  const user = ref<User | null>(null);
  async function refresh() {
    user.value = (await api<{ user: User | null }>("/session")).user;
  }
  async function login(username: string, password: string) {
    user.value = (
      await api<{ user: User }>("/session", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      })
    ).user;
  }
  async function logout() {
    await api("/session", { method: "DELETE" });
    user.value = null;
  }
  return { user, refresh, login, logout };
});
