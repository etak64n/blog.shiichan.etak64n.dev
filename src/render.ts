import { marked } from 'marked'
import type { ArticleListRow, ArticleRow } from './db'

const SITE_TITLE = 'sheechan blog'

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  )

const fmtDate = (iso: string) => iso.slice(0, 10)

function layout(title: string, main: string): string {
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
  :root { color-scheme: light dark; }
  body { max-width: 46rem; margin: 0 auto; padding: 1.5rem 1rem 4rem; font-family: -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Noto Sans JP", sans-serif; line-height: 1.8; }
  header a { text-decoration: none; color: inherit; }
  header h1 { font-size: 1.3rem; margin-bottom: 2rem; }
  .meta { font-size: .85rem; opacity: .7; }
  .badge { display: inline-block; border: 1px solid currentColor; border-radius: 999px; padding: 0 .6em; font-size: .75rem; margin-right: .5em; }
  article.card { margin: 2rem 0; }
  article.card h2 { margin: 0 0 .3rem; font-size: 1.1rem; }
  pre { overflow-x: auto; padding: 1em; border-radius: 8px; background: rgba(127,127,127,.12); }
  code { font-family: ui-monospace, SFMono-Regular, monospace; }
  img { max-width: 100%; }
</style>
</head>
<body>
<header><a href="/"><h1>${esc(SITE_TITLE)}</h1></a></header>
<main>${main}</main>
</body>
</html>`
}

export function renderIndexPage(rows: ArticleListRow[]): string {
  const cards = rows
    .map(
      (r) => `
<article class="card">
  <h2><a href="/posts/${esc(r.slug)}">${esc(r.title)}</a></h2>
  <p class="meta"><span class="badge">${esc(r.source_name)}</span>${esc(fmtDate(r.published_at))}</p>
  <p>${esc(r.summary)}</p>
</article>`,
    )
    .join('\n')
  return layout(SITE_TITLE, cards || '<p>まだ記事がありません。</p>')
}

export async function renderArticlePage(row: ArticleRow): Promise<string> {
  // body_md was validated HTML-free at ingest, so the only HTML here comes from marked
  const bodyHtml = await marked.parse(row.body_md)
  const main = `
<article>
  <h1>${esc(row.title)}</h1>
  <p class="meta"><span class="badge">${esc(row.source_name)}</span>${esc(fmtDate(row.published_at))} ・ <a href="${esc(row.source_url)}" rel="noopener">原文を読む</a></p>
  ${bodyHtml}
</article>`
  return layout(`${row.title} | ${SITE_TITLE}`, main)
}
