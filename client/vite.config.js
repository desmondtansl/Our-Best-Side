import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  // Fast refresh needs a browser preamble, so it is disabled under Vitest.
  plugins: [react({ fastRefresh: !process.env.VITEST })],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.js",
  },
});
