import { marked } from 'marked'
import type { ArticleListRow, ArticleRow, SourceCount, TagCount } from './db'

const SITE_TITLE = 'sheechan blog'
const SITE_ORIGIN = 'https://blog.sheechan.etak64n.dev'
const SITE_DESCRIPTION =
  'AWS・Cloudflare・OpenAI・Anthropic の最新テックニュースを、しぃちゃんが毎日わかりやすくお届けするブログ'

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  )

const fmtDate = (iso: string) => iso.slice(0, 10)

export function parseTags(json: string): string[] {
  try {
    const v = JSON.parse(json)
    return Array.isArray(v) ? v.filter((t): t is string => typeof t === 'string') : []
  } catch {
    return []
  }
}

// Brand accent per source; falls back to the site cyan for unknown sources
function sourceColor(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('aws') || n.includes('amazon')) return '#ff9900'
  if (n.includes('cloudflare')) return '#f6821f'
  if (n.includes('openai')) return '#4ecb9b'
  if (n.includes('anthropic')) return '#d97757'
  if (n.includes('windows') || n.includes('microsoft')) return '#4cc2ff'
  return '#3fd2ff'
}

const FAVICON =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#071120"/><rect width="64" height="64" rx="14" fill="none" stroke="#3fd2ff" stroke-width="3"/><text x="32" y="44" font-family="monospace" font-size="34" font-weight="bold" fill="#3fd2ff" text-anchor="middle">s_</text></svg>`,
  )

const STYLE = `
:root {
  color-scheme: dark;
  --bg: #040810;
  --panel: #0a1322;
  --panel-2: #0d1a30;
  --line: #1b2a47;
  --line-bright: #2b4570;
  --text: #d7e2f5;
  --dim: #7e93b8;
  --cyan: #3fd2ff;
  --cyan-soft: #9be1ff;
  --blue: #4f8dff;
  --mono: 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
  --sans: 'IBM Plex Sans JP', -apple-system, BlinkMacSystemFont, 'Hiragino Sans', 'Noto Sans JP', sans-serif;
  --display: 'Chakra Petch', var(--mono);
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  font-family: var(--sans);
  color: var(--text);
  line-height: 1.8;
  background:
    radial-gradient(1100px 480px at 50% -120px, rgba(63, 130, 255, .17), transparent 70%),
    var(--bg);
}
body::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background:
    linear-gradient(rgba(102, 148, 230, .05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(102, 148, 230, .05) 1px, transparent 1px);
  background-size: 36px 36px;
  mask-image: linear-gradient(#000, transparent 90%);
  -webkit-mask-image: linear-gradient(#000, transparent 90%);
}
::selection { background: rgba(63, 210, 255, .3); }
a { color: var(--cyan); }
.wrap { max-width: 1140px; margin: 0 auto; padding: 0 20px; }

/* ---- header ---- */
.site-header {
  position: sticky; top: 0; z-index: 10;
  background: rgba(4, 8, 16, .78);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--line);
}
.site-header .wrap { display: flex; align-items: center; justify-content: space-between; height: 56px; }
.logo {
  font-family: var(--display); font-weight: 700; font-size: 1.05rem;
  letter-spacing: .04em; color: var(--text); text-decoration: none;
}
.logo .dot { color: var(--cyan); }
.logo .cursor { color: var(--cyan); animation: blink 1.2s steps(1) infinite; }
.site-nav { display: flex; gap: 1.4em; font-family: var(--mono); font-size: .78rem; letter-spacing: .08em; }
.site-nav a { color: var(--dim); text-decoration: none; text-transform: uppercase; }
.site-nav a:hover { color: var(--cyan); }

/* ---- hero ---- */
.hero { padding: 64px 0 40px; }
.hero .eyebrow {
  font-family: var(--mono); font-size: .75rem; letter-spacing: .18em;
  color: var(--cyan); text-transform: uppercase; margin: 0 0 .8em;
}
.hero h1 {
  font-family: var(--display); font-weight: 700; text-transform: uppercase;
  font-size: clamp(2.1rem, 6vw, 3.4rem); line-height: 1.05; letter-spacing: .02em;
  margin: 0 0 .35em;
  background: linear-gradient(92deg, #eaf6ff 10%, var(--cyan-soft) 45%, var(--blue) 90%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.hero .lede { color: var(--dim); max-width: 40em; margin: 0 0 1.6em; }
.stats { display: flex; flex-wrap: wrap; gap: 10px; }
.stat {
  font-family: var(--mono); font-size: .74rem; letter-spacing: .06em;
  border: 1px solid var(--line-bright); border-radius: 6px;
  padding: .35em .9em; color: var(--dim); background: rgba(13, 26, 48, .5);
}
.stat b { color: var(--cyan); font-weight: 600; margin-left: .5em; }

/* ---- layout ---- */
.cols { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 30px; padding-bottom: 70px; }
@media (max-width: 920px) { .cols { grid-template-columns: 1fr; } }
.section-title {
  font-family: var(--display); font-weight: 600; font-size: .82rem;
  letter-spacing: .2em; text-transform: uppercase; color: var(--dim);
  margin: 2.2em 0 1em; display: flex; align-items: center; gap: .7em;
}
.section-title::before { content: '▍'; color: var(--cyan); }
.section-title:first-child { margin-top: 0; }

/* ---- cards ---- */
.card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(265px, 1fr)); gap: 14px; }
.card {
  position: relative; display: flex; flex-direction: column; gap: .6em;
  background: var(--panel); border: 1px solid var(--line); border-radius: 12px;
  padding: 18px 20px;
  transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease;
  animation: rise .5s cubic-bezier(.2, .7, .3, 1) backwards;
}
.card:hover {
  transform: translateY(-3px);
  border-color: rgba(63, 210, 255, .55);
  box-shadow: 0 6px 26px rgba(63, 210, 255, .12);
}
.card h2, .card h3 { margin: 0; font-size: 1rem; line-height: 1.55; font-weight: 700; }
.card h2 a, .card h3 a { color: var(--text); text-decoration: none; }
.card h2 a::after, .card h3 a::after { content: ''; position: absolute; inset: 0; }
.card .summary {
  margin: 0; font-size: .85rem; color: var(--dim);
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
}
.card.featured {
  border-color: var(--line-bright);
  background: linear-gradient(155deg, rgba(63, 210, 255, .09), rgba(79, 141, 255, .04) 45%, transparent 75%), var(--panel);
  padding: 26px 28px;
}
.card.featured h2 { font-size: 1.3rem; }
.card.featured .summary { -webkit-line-clamp: unset; font-size: .92rem; }
.latest-label {
  align-self: flex-start; font-family: var(--mono); font-size: .68rem; font-weight: 600;
  letter-spacing: .16em; color: #04212e; background: var(--cyan);
  border-radius: 4px; padding: .15em .8em;
}
.meta {
  display: flex; flex-wrap: wrap; align-items: center; gap: .45em 1em;
  font-family: var(--mono); font-size: .72rem; color: var(--dim); letter-spacing: .03em;
}
.src { display: inline-flex; align-items: center; gap: .55em; }
.src i {
  width: 8px; height: 8px; border-radius: 2px; flex: none;
  background: var(--src-color, var(--cyan)); box-shadow: 0 0 8px var(--src-color, var(--cyan));
}
.tag-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: auto; }
.tag {
  position: relative; z-index: 2;
  font-family: var(--mono); font-size: .7rem; letter-spacing: .02em;
  color: var(--cyan-soft); text-decoration: none;
  border: 1px solid var(--line); border-radius: 999px; padding: .05em .75em;
  background: rgba(63, 210, 255, .05);
  transition: border-color .15s ease, color .15s ease;
}
.tag:hover { border-color: var(--cyan); color: var(--cyan); }
.tag.big { font-size: .78rem; padding: .25em 1em; }
.tag .n { color: var(--dim); margin-left: .5em; }

/* ---- sidebar ---- */
.panel {
  background: var(--panel); border: 1px solid var(--line); border-radius: 12px;
  padding: 20px 22px; margin-bottom: 18px;
  animation: rise .5s cubic-bezier(.2, .7, .3, 1) backwards;
}
.panel .section-title { margin: 0 0 1em; }
.panel .tag-row { margin: 0; }
.src-list { list-style: none; margin: 0; padding: 0; font-size: .82rem; }
.src-list li { display: flex; align-items: center; gap: .6em; padding: .3em 0; color: var(--text); }
.src-list .n { margin-left: auto; font-family: var(--mono); font-size: .72rem; color: var(--dim); }
.about-text { margin: 0; font-size: .82rem; color: var(--dim); }
.about-text b { color: var(--cyan-soft); font-weight: 600; }

/* ---- article page ---- */
.article-wrap { max-width: 800px; margin: 0 auto; padding: 44px 20px 80px; }
.backlink {
  font-family: var(--mono); font-size: .76rem; letter-spacing: .08em;
  color: var(--dim); text-decoration: none;
}
.backlink:hover { color: var(--cyan); }
.article-title { font-size: clamp(1.4rem, 4vw, 1.9rem); line-height: 1.45; margin: .7em 0 .8em; }
.article-meta {
  display: flex; flex-wrap: wrap; align-items: center; gap: .6em 1.2em;
  border: 1px solid var(--line); border-radius: 10px; background: var(--panel);
  padding: .7em 1.2em; margin-bottom: 2.5em;
}
.article-meta .spacer { flex: 1; }
.mdlink {
  font-family: var(--mono); font-size: .72rem; font-weight: 600; letter-spacing: .06em;
  color: var(--cyan); text-decoration: none;
  border: 1px solid rgba(63, 210, 255, .4); border-radius: 6px; padding: .2em .8em;
  transition: background .15s ease;
}
.mdlink:hover { background: rgba(63, 210, 255, .12); }
.srclink { font-family: var(--mono); font-size: .72rem; color: var(--dim); text-decoration: none; }
.srclink:hover { color: var(--cyan); }

.prose { font-size: 1rem; }
.prose h2 {
  font-size: 1.25rem; line-height: 1.5; margin: 2.4em 0 .9em;
  padding-bottom: .45em; border-bottom: 1px solid var(--line);
}
.prose h3 { font-size: 1.08rem; margin: 2em 0 .8em; }
.prose h2::before, .prose h3::before {
  font-family: var(--mono); font-weight: 400; color: var(--cyan); opacity: .65;
}
.prose h2::before { content: '## '; }
.prose h3::before { content: '### '; }
.prose p { margin: 1.1em 0; }
.prose strong { color: #fff; }
.prose a { text-decoration-color: rgba(63, 210, 255, .5); text-underline-offset: 3px; }
.prose code {
  font-family: var(--mono); font-size: .86em; color: var(--cyan-soft);
  background: rgba(63, 210, 255, .08); border: 1px solid rgba(63, 210, 255, .15);
  border-radius: 5px; padding: .08em .45em;
}
.prose pre {
  background: #081020; border: 1px solid var(--line); border-radius: 10px;
  padding: 1em 1.3em; overflow-x: auto; line-height: 1.6;
}
.prose pre code { background: none; border: none; padding: 0; color: #c9dcf7; font-size: .84rem; }
.prose blockquote {
  margin: 1.4em 0; padding: .2em 0 .2em 1.1em;
  border-left: 3px solid var(--blue); color: var(--dim);
}
.prose ul, .prose ol { padding-left: 1.6em; }
.prose li { margin: .4em 0; }
.prose li::marker { color: var(--cyan); }
.prose hr { border: none; border-top: 1px solid var(--line); margin: 2.5em 0; }
.prose table { border-collapse: collapse; width: 100%; display: block; overflow-x: auto; font-size: .88rem; }
.prose th, .prose td { border: 1px solid var(--line); padding: .5em .9em; text-align: left; }
.prose th { background: var(--panel-2); font-family: var(--mono); font-size: .78rem; }
.prose img { max-width: 100%; border-radius: 10px; }

/* ---- tag page / misc ---- */
.page-head { padding: 52px 0 8px; }
.page-head h1 {
  font-family: var(--mono); font-weight: 600; font-size: clamp(1.6rem, 5vw, 2.4rem);
  margin: 0 0 .2em;
  background: linear-gradient(92deg, var(--cyan-soft), var(--blue));
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.page-head .count { font-family: var(--mono); font-size: .8rem; color: var(--dim); letter-spacing: .1em; }
.list-section { padding: 26px 0 70px; }
.notfound { text-align: center; padding: 120px 0 140px; }
.notfound h1 { font-family: var(--mono); font-size: 2rem; color: var(--cyan); margin: 0 0 .4em; }
.notfound p { color: var(--dim); }

/* ---- footer ---- */
.site-footer { border-top: 1px solid var(--line); padding: 26px 0 40px; }
.site-footer .wrap {
  display: flex; flex-wrap: wrap; gap: .5em 2em; justify-content: space-between;
  font-family: var(--mono); font-size: .72rem; color: var(--dim); letter-spacing: .05em;
}

@keyframes rise { from { opacity: 0; transform: translateY(14px); } }
@keyframes blink { 50% { opacity: 0; } }
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
  html { scroll-behavior: auto; }
}
`

type LayoutOpts = {
  title: string
  description?: string
  canonicalPath?: string
  head?: string
}

function layout(opts: LayoutOpts, main: string): string {
  const description = opts.description ?? SITE_DESCRIPTION
  const canonical = opts.canonicalPath ? `${SITE_ORIGIN}${opts.canonicalPath}` : undefined
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(opts.title)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:title" content="${esc(opts.title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:site_name" content="${esc(SITE_TITLE)}">
${canonical ? `<meta property="og:url" content="${esc(canonical)}">\n<link rel="canonical" href="${esc(canonical)}">` : ''}
<link rel="icon" href="${FAVICON}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@600;700&family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet">
${opts.head ?? ''}
<style>${STYLE}</style>
</head>
<body>
<header class="site-header">
  <div class="wrap">
    <a class="logo" href="/">sheechan<span class="dot">.</span>blog<span class="cursor">▍</span></a>
    <nav class="site-nav"><a href="/">Posts</a><a href="/#tags">Tags</a></nav>
  </div>
</header>
${main}
<footer class="site-footer">
  <div class="wrap">
    <span>${esc(SITE_TITLE)} — auto-generated tech news, written by sheechan</span>
    <span>daily update 10:07 JST / Hono + Cloudflare Workers + D1</span>
  </div>
</footer>
</body>
</html>`
}

function tagChip(tag: string, count?: number, big = false): string {
  const n = count !== undefined ? `<span class="n">${count}</span>` : ''
  return `<a class="tag${big ? ' big' : ''}" href="/tags/${encodeURIComponent(tag)}">#${esc(tag)}${n}</a>`
}

function sourceBadge(name: string): string {
  return `<span class="src" style="--src-color:${sourceColor(name)}"><i></i>${esc(name)}</span>`
}

function articleCard(r: ArticleListRow, index: number, featured = false): string {
  const tags = parseTags(r.tags)
  const chips = tags
    .slice(0, featured ? 8 : 4)
    .map((t) => tagChip(t))
    .join('')
  const delay = Math.min(index * 45, 500)
  const heading = featured ? 'h2' : 'h3'
  return `
<article class="card${featured ? ' featured' : ''}" style="animation-delay:${delay}ms">
  ${featured ? '<span class="latest-label">LATEST</span>' : ''}
  <${heading}><a href="/posts/${esc(r.slug)}">${esc(r.title)}</a></${heading}>
  <p class="meta">${sourceBadge(r.source_name)}<span>${esc(fmtDate(r.published_at))}</span></p>
  <p class="summary">${esc(r.summary)}</p>
  ${chips ? `<p class="tag-row">${chips}</p>` : ''}
</article>`
}

export function renderIndexPage(
  rows: ArticleListRow[],
  tags: TagCount[],
  sources: SourceCount[],
): string {
  const totalArticles = sources.reduce((sum, s) => sum + s.count, 0)
  const [latest, ...rest] = rows

  const hero = `
<section class="hero wrap">
  <p class="eyebrow">// daily tech report — fully automated</p>
  <h1>Sheechan<br>Tech Report</h1>
  <p class="lede">${esc(SITE_DESCRIPTION)}だよ。むずかしいニュースも、しぃちゃんと一緒ならこわくない!</p>
  <div class="stats">
    <span class="stat">ARTICLES<b>${totalArticles}</b></span>
    <span class="stat">SOURCES<b>${sources.length}</b></span>
    <span class="stat">UPDATE<b>10:07 JST</b></span>
  </div>
</section>`

  const mainCol = latest
    ? `
<h2 class="section-title">Latest Post</h2>
${articleCard(latest, 0, true)}
${
  rest.length
    ? `<h2 class="section-title">All Posts</h2>
<div class="card-grid">${rest.map((r, i) => articleCard(r, i + 1)).join('\n')}</div>`
    : ''
}`
    : '<p>まだ記事がありません。</p>'

  const sideCol = `
<div class="panel" id="tags" style="animation-delay:120ms">
  <h2 class="section-title">Tags</h2>
  <p class="tag-row">${tags.map((t) => tagChip(t.tag, t.count)).join('')}</p>
</div>
<div class="panel" style="animation-delay:200ms">
  <h2 class="section-title">Sources</h2>
  <ul class="src-list">
    ${sources.map((s) => `<li><span class="src" style="--src-color:${sourceColor(s.source_name)}"><i></i></span>${esc(s.source_name)}<span class="n">${s.count}</span></li>`).join('\n    ')}
  </ul>
</div>
<div class="panel" style="animation-delay:280ms">
  <h2 class="section-title">About</h2>
  <p class="about-text">このブログは全自動。<b>しぃちゃん</b>が毎日 10:07 JST にテックソースを巡回して、新着ニュースをわかりやすい日本語で紹介しているよ。記事 URL の末尾に <b>.md</b> を付けると Markdown 原文がそのまま読めるからね!</p>
</div>`

  return layout(
    { title: SITE_TITLE, canonicalPath: '/' },
    `${hero}\n<div class="cols wrap"><main>${mainCol}</main><aside>${sideCol}</aside></div>`,
  )
}

export function renderTagPage(tag: string, rows: ArticleListRow[]): string {
  const main = `
<section class="page-head wrap">
  <p><a class="backlink" href="/">&larr; INDEX</a></p>
  <h1>#${esc(tag)}</h1>
  <p class="count">${rows.length} POST${rows.length === 1 ? '' : 'S'}</p>
</section>
<section class="list-section wrap">
  <div class="card-grid">${rows.map((r, i) => articleCard(r, i)).join('\n')}</div>
</section>`
  return layout(
    {
      title: `#${tag} | ${SITE_TITLE}`,
      description: `タグ「${tag}」の記事一覧`,
      canonicalPath: `/tags/${encodeURIComponent(tag)}`,
    },
    main,
  )
}

export async function renderArticlePage(row: ArticleRow): Promise<string> {
  // body_md was validated HTML-free at ingest, so the only HTML here comes from marked
  const bodyHtml = await marked.parse(row.body_md)
  const tags = parseTags(row.tags)
  const mdPath = `/posts/${row.slug}.md`
  const main = `
<div class="article-wrap">
  <p><a class="backlink" href="/">&larr; INDEX</a></p>
  <article>
    <h1 class="article-title">${esc(row.title)}</h1>
    <div class="article-meta">
      <p class="meta" style="margin:0">${sourceBadge(row.source_name)}<span>${esc(fmtDate(row.published_at))}</span></p>
      ${tags.map((t) => tagChip(t)).join('')}
      <span class="spacer"></span>
      <a class="srclink" href="${esc(row.source_url)}" rel="noopener">原文 &nearr;</a>
      <a class="mdlink" href="${esc(mdPath)}">RAW .md</a>
    </div>
    <div class="prose">${bodyHtml}</div>
  </article>
</div>`
  return layout(
    {
      title: `${row.title} | ${SITE_TITLE}`,
      description: row.summary,
      canonicalPath: `/posts/${row.slug}`,
      head: `<link rel="alternate" type="text/markdown" href="${esc(mdPath)}">`,
    },
    main,
  )
}

export function renderArticleMarkdown(row: ArticleRow): string {
  const tags = parseTags(row.tags)
  return [
    '---',
    `title: ${JSON.stringify(row.title)}`,
    `source: ${JSON.stringify(row.source_name)}`,
    `source_url: ${row.source_url}`,
    `published_at: ${row.published_at}`,
    `tags: ${JSON.stringify(tags)}`,
    '---',
    '',
    `# ${row.title}`,
    '',
    row.body_md.trim(),
    '',
  ].join('\n')
}

export function renderNotFoundPage(): string {
  return layout(
    { title: `404 | ${SITE_TITLE}` },
    `<div class="notfound wrap">
  <h1>404 // NOT FOUND</h1>
  <p>ごめんね、このページは見つからなかったよ。</p>
  <p><a class="backlink" href="/">&larr; INDEX</a></p>
</div>`,
  )
}
