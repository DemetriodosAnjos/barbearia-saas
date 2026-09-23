import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    host: "0.0.0.0",
    allowedHosts: "all",
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/tests/setup.js",
  },
});
