import type { Article } from './schema'

export type ArticleRow = {
  slug: string
  title: string
  summary: string
  body_md: string
  source_url: string
  source_name: string
  tags: string
  published_at: string
}

export type ArticleListRow = Pick<
  ArticleRow,
  'slug' | 'title' | 'summary' | 'source_name' | 'published_at'
>

export async function listArticles(db: D1Database, limit = 50): Promise<ArticleListRow[]> {
  const { results } = await db
    .prepare(
      'SELECT slug, title, summary, source_name, published_at FROM articles ORDER BY published_at DESC LIMIT ?',
    )
    .bind(limit)
    .all<ArticleListRow>()
  return results
}

export async function getArticle(db: D1Database, slug: string): Promise<ArticleRow | null> {
  return db.prepare('SELECT * FROM articles WHERE slug = ?').bind(slug).first<ArticleRow>()
}

export async function upsertArticle(db: D1Database, a: Article): Promise<void> {
  await db
    .prepare(
      `INSERT INTO articles (slug, title, summary, body_md, source_url, source_name, tags, published_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
       ON CONFLICT (slug) DO UPDATE SET
         title = ?2, summary = ?3, body_md = ?4, source_url = ?5,
         source_name = ?6, tags = ?7, published_at = ?8, updated_at = datetime('now')`,
    )
    .bind(
      a.slug,
      a.title,
      a.summary,
      a.body_md,
      a.source_url,
      a.source_name,
      JSON.stringify(a.tags),
      a.published_at,
    )
    .run()
}

export async function deleteArticle(db: D1Database, slug: string): Promise<boolean> {
  const res = await db.prepare('DELETE FROM articles WHERE slug = ?').bind(slug).run()
  return res.meta.changes > 0
}
