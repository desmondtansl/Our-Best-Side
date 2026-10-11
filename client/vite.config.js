import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fillHeaders } from "./buildHeaders.js";

// Writes the API and photo addresses into the built _headers file (see
// buildHeaders.js). The build stops if VITE_BASE_URL isn't set, rather than
// publishing a site whose security policy blocks its own API.
const securityHeaders = (env) => {
  let outDir = "dist";
  return {
    name: "security-headers",
    apply: "build",
    configResolved(config) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      const file = join(outDir, "_headers");
      if (!existsSync(file)) return;
      const text = readFileSync(file, "utf8");
      writeFileSync(
        file,
        fillHeaders(text, { apiUrl: env.VITE_BASE_URL, imageOrigin: env.VITE_IMAGE_ORIGIN })
      );
    },
  };
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  return {
    // Fast refresh needs a browser preamble, so it is disabled under Vitest.
    plugins: [react({ fastRefresh: !process.env.VITEST }), securityHeaders(env)],
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: "./src/test/setup.js",
    },
  };
});
