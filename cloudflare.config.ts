// Worker configuration that the Cloudflare CLI (cf) reads.
//
// `cf dev` runs in the "development" mode, and `cf build` and `cf deploy` in the
// "production" mode. The account comes from CLOUDFLARE_ACCOUNT_ID in .env, which
// cf reads. Vite serves public/ as the static assets (vite.config.ts), so this
// file names no assets folder.

import { bindings, defineConfig } from "cf/config";

export default defineConfig(({ mode }) => ({
  worker: {
    name: "blog-shiichan",
    compatibilityDate: "2026-07-07",
    compatibilityFlags: ["nodejs_compat"],
    entrypoint: "./src/index.ts",
    observability: { enabled: true, headSamplingRate: 1 },
    // The old sheechan domain answers with a 301 to the shiichan domain (src/index.ts).
    domains: ["blog.shiichan.etak64n.dev", "blog.sheechan.etak64n.dev"],
    env: {
      OIDC_AUDIENCE: bindings.text("https://blog.shiichan.etak64n.dev"),
      ALLOWED_OIDC_SUB: bindings.text("repo:etak64n/shiichan-reporter:ref:refs/heads/main"),
      // The hosts that the source_url of a post may have.
      ALLOWED_SOURCE_HOSTS: bindings.json([
        "aws.amazon.com",
        "blog.cloudflare.com",
        "developers.cloudflare.com",
        "developers.openai.com",
        "openai.com",
        "www.anthropic.com",
        "anthropic.com",
        "claude.com",
        "github.com",
        "jpwinsup.github.io",
      ]),
      // Under `cf dev`, the ingest API also accepts this bearer token from .env.
      // Production has none, which turns it off (src/auth.ts).
      DEV_BEARER_TOKEN: mode === "development" ? bindings.secret() : bindings.text(""),
      // `pnpm db:migrate:remote` and `pnpm db:migrate:local` (package.json) apply migrations/ to this database.
      DB: bindings.d1({ name: "blog-shiichan", id: "70259ab4-400c-47dd-81d9-05068a866fee" }),
    },
  },
}));
