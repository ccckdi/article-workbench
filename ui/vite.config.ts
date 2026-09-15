import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  base: "/console/",
  plugins: [vue()],
  server: {
    port: 3000,
    strictPort: true,
    proxy: { "/api": `http://127.0.0.1:${process.env.API_PORT || 8090}` },
  },
  build: { outDir: "dist" },
});
