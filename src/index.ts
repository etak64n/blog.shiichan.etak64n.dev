import { Hono } from 'hono'
import { verifyIngestAuth } from './auth'
import { deleteArticle, getArticle, listArticles, upsertArticle } from './db'
import { renderArticlePage, renderIndexPage } from './render'
import { articleSchema } from './schema'

const MAX_BODY_BYTES = 100_000

const app = new Hono<{ Bindings: Env }>()

// ---- public pages ----

app.get('/', async (c) => {
  const articles = await listArticles(c.env.DB)
  c.header('cache-control', 'public, max-age=300')
  return c.html(renderIndexPage(articles))
})

app.get('/posts/:slug', async (c) => {
  const article = await getArticle(c.env.DB, c.req.param('slug'))
  if (!article) return c.notFound()
  c.header('cache-control', 'public, max-age=300')
  return c.html(await renderArticlePage(article))
})

// ---- ingest API (GitHub Actions OIDC) ----

app.use('/api/*', async (c, next) => {
  const auth = await verifyIngestAuth(c.req.header('authorization'), c.env)
  if (!auth.ok) return c.json({ error: auth.reason }, 401)
  await next()
})

app.post('/api/articles', async (c) => {
  const len = Number(c.req.header('content-length') ?? '0')
  if (!len || len > MAX_BODY_BYTES) {
    return c.json({ error: 'payload missing or too large' }, 413)
  }

  const body = await c.req.json().catch(() => null)
  const parsed = articleSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'validation failed', issues: parsed.error.issues }, 400)
  }

  const article = parsed.data
  const sourceHost = new URL(article.source_url).hostname
  if (!c.env.ALLOWED_SOURCE_HOSTS.some((h) => h === sourceHost)) {
    return c.json({ error: `source_url host not allowed: ${sourceHost}` }, 400)
  }

  await upsertArticle(c.env.DB, article)
  return c.json({ ok: true, slug: article.slug }, 201)
})

app.delete('/api/articles/:slug', async (c) => {
  const deleted = await deleteArticle(c.env.DB, c.req.param('slug'))
  if (!deleted) return c.json({ error: 'not found' }, 404)
  return c.json({ ok: true })
})

app.onError((err, c) => {
  console.log(JSON.stringify({ level: 'error', message: err.message, path: c.req.path }))
  return c.json({ error: 'internal error' }, 500)
})

export default app
