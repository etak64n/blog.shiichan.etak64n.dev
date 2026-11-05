import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";

// The Cloudflare plugin reads cloudflare.config.ts, runs the Worker in the
// Workers runtime during `cf dev`, and builds it. Vite serves public/ as the
// static assets of the Worker.
export default defineConfig({
  plugins: [cloudflare()],
});
