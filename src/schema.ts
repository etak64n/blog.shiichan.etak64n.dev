import { z } from 'zod'

// Markdown only: raw HTML would be an XSS vector at render time
const noRawHtml = (s: string) => !/<\s*[a-zA-Z!/]/.test(s)

// Code regions are exempt from the body checks: marked escapes everything
// inside <pre><code> and <code>, so a TypeScript sample containing
// `Promise<void>` is text, not markup, and the bare `<[a-zA-Z]` test above
// would otherwise reject it. Stripping deliberately stays on the conservative
// side of marked's own tokenization, so anything it would render as live HTML
// still reaches the checks:
//   - only a fence indented 0-3 columns opens a code region, as in CommonMark
//     (a fence inside a blockquote is not recognized; its body stays checked)
//   - an unclosed fence runs to end of input, exactly as marked treats it
//   - inline spans are matched within a single line, so a span marked would
//     read across a line break is left in the checked text rather than hidden
function stripCode(md: string): string {
  const kept: string[] = []
  let fence: { char: string; len: number } | null = null
  for (const line of md.split('\n')) {
    const marker = /^ {0,3}(`{3,}|~{3,})/.exec(line)
    if (fence) {
      // A closing fence is the same character, at least as long, nothing after it
      if (marker && marker[1][0] === fence.char && marker[1].length >= fence.len) {
        if (/^ {0,3}(?:`{3,}|~{3,})[ \t]*$/.test(line)) fence = null
      }
      continue
    }
    if (marker) {
      fence = { char: marker[1][0], len: marker[1].length }
      continue
    }
    // Inline spans: matched backtick runs of equal length, single line only
    kept.push(line.replace(/(`+)[^\n]*?\1/g, ' '))
  }
  return kept.join('\n')
}

// Reject markdown links/images whose URL uses a dangerous scheme
// (javascript:, data:, vbscript:). marked does not sanitize these, so a
// `[x](javascript:...)` link would render as an executable href. This is the
// entry-side guard; render.ts neutralizes anything that slips through.
const DANGEROUS_URL = /\]\(\s*(?:javascript|data|vbscript)\s*:/i
const safeMarkdownUrls = (s: string) => !DANGEROUS_URL.test(s)
const mdRefine = (msg: string) => ({ message: msg })
const cleanText = (max: number) =>
  z
    .string()
    .min(1)
    .max(max)
    .refine(noRawHtml, mdRefine('raw HTML not allowed'))
    .refine(safeMarkdownUrls, mdRefine('unsafe link scheme not allowed'))

// Bodies are the only field rendered through marked, and the only one that
// carries code samples, so the code-region exemption applies here alone.
// summary / og_title / source_name stay strict: they are always esc()'d at
// render time, so nothing is gained by loosening them.
const cleanBody = z
  .string()
  .min(100)
  .max(64_000)
  .refine((s) => noRawHtml(stripCode(s)), mdRefine('raw HTML not allowed'))
  .refine((s) => safeMarkdownUrls(stripCode(s)), mdRefine('unsafe link scheme not allowed'))

export const articleSchema = z.object({
  slug: z
    .string()
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().min(1).max(300),
  summary: cleanText(1000),
  body_md: cleanBody,
  // Optional English translation (same safety checks). Present once the
  // article has been translated; the site falls back to Japanese otherwise.
  title_en: z.string().min(1).max(300).optional(),
  summary_en: cleanText(1000).optional(),
  body_md_en: cleanBody.optional(),
  // Emotion for the hero illustration; the renderer falls back to "happy"
  emotion: z.enum(['happy', 'confused', 'thinking', 'smug', 'energetic']).optional(),
  // Importance 1-5 from an engineer's perspective (5 = genuinely interesting
  // technical update, 1 = business/announcement). Drives the star rating.
  importance: z.number().int().min(1).max(5).optional(),
  // Locally-cached Open Graph image filename (served from /ogp/); optional.
  og_image: z
    .string()
    .max(200)
    .regex(/^[A-Za-z0-9._-]+$/)
    .optional(),
  // The source article's own title (shown in the Index table's original column).
  og_title: z.string().max(300).refine(noRawHtml, mdRefine('raw HTML not allowed')).optional(),
  // Host allowlist is checked in the handler (list lives in cloudflare.config.ts)
  source_url: z.url(),
  // Not an enum: sources will grow over time (watcher's sources.json is the source of truth)
  source_name: z.string().min(1).max(40).refine(noRawHtml, mdRefine('raw HTML not allowed')),
  tags: z.array(z.string().min(1).max(40)).max(8).default([]),
  published_at: z.iso.datetime({ offset: true }),
})

export type Article = z.infer<typeof articleSchema>
