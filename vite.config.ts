/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

// Strict Content Security Policy for the built site. Left out of `npm run dev`
// because Vite's dev server injects inline scripts.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data: https:",
  "connect-src 'self' https: http://localhost:* http://127.0.0.1:*",
  "manifest-src 'self'",
  "worker-src 'self'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

const csp = (): Plugin => ({
  name: "course-desk-csp",
  apply: "build",
  transformIndexHtml: (html) =>
    html.replace("<!--csp-->", `<meta http-equiv="Content-Security-Policy" content="${CSP}">`),
});

export default defineConfig(({ mode }) => ({
  base: "./",
  plugins: [react(), csp()],
  // `--mode single` inlines fonts and icons so the build can become one HTML file
  // (used for the sample-data preview page).
  build: { target: "es2020", assetsInlineLimit: mode === "single" ? 100_000_000 : 0 },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
}));
