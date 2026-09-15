import { defineStore } from "pinia";
import { ref } from "vue";
export const useEditing = defineStore("editing", () => ({ dirty: ref(false) }));
