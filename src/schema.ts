import { z } from 'zod'

// Markdown only: raw HTML would be an XSS vector at render time
const noRawHtml = (s: string) => !/<\s*[a-zA-Z!/]/.test(s)

export const articleSchema = z.object({
  slug: z
    .string()
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().min(1).max(300),
  summary: z.string().min(1).max(1000).refine(noRawHtml, { message: 'raw HTML not allowed' }),
  body_md: z.string().min(100).max(64_000).refine(noRawHtml, { message: 'raw HTML not allowed' }),
  // Host allowlist is checked in the handler (list lives in wrangler.jsonc vars)
  source_url: z.url(),
  // Not an enum: sources will grow over time (watcher's sources.json is the source of truth)
  source_name: z.string().min(1).max(40).refine(noRawHtml, { message: 'raw HTML not allowed' }),
  tags: z.array(z.string().min(1).max(40)).max(8).default([]),
  published_at: z.iso.datetime({ offset: true }),
})

export type Article = z.infer<typeof articleSchema>
