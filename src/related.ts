// Related articles: the articles that share the most tags with an article, the
// newest first among equals, filled up with the newest articles when too few
// share a tag.
//
// Tags are a JSON array in a column, so SQL cannot find the articles that share a
// tag without opening every article. The ranking runs here instead, over one light
// read of every article, and article_related keeps the result: an article page
// then reads its list and the listed articles, a handful of rows.

export type RelatedCandidate = {
  slug: string
  tags: string[]
  published_at: string
  created_at: string
  rowid: number
}

// Newest first, in the order of the article lists.
function newerFirst(a: RelatedCandidate, b: RelatedCandidate): number {
  return b.published_at.localeCompare(a.published_at) || b.created_at.localeCompare(a.created_at) || b.rowid - a.rowid
}

export function rankRelated(slug: string, tags: string[], candidates: RelatedCandidate[], limit = 4): string[] {
  const wanted = new Set(tags)
  const others = candidates.filter((c) => c.slug !== slug)
  const shared = new Map(others.map((c) => [c.slug, c.tags.filter((t) => wanted.has(t)).length]))
  const sharedOf = (c: RelatedCandidate) => shared.get(c.slug) ?? 0
  const picked = others
    .filter((c) => sharedOf(c) > 0)
    .sort((a, b) => sharedOf(b) - sharedOf(a) || newerFirst(a, b))
    .slice(0, limit)
  if (picked.length < limit) {
    const taken = new Set(picked.map((c) => c.slug))
    const newest = others.filter((c) => !taken.has(c.slug)).sort(newerFirst)
    picked.push(...newest.slice(0, limit - picked.length))
  }
  return picked.map((c) => c.slug)
}
