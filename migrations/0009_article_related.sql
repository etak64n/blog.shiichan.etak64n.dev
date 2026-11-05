-- The related articles of each article, as a JSON array of slugs. An article page
-- reads its list and the listed articles, a handful of rows, instead of comparing
-- the tags of every article (src/related.ts). WITHOUT ROWID keeps one B-tree, so
-- a list costs one row to write.
CREATE TABLE IF NOT EXISTS article_related (
  slug TEXT PRIMARY KEY,
  related TEXT NOT NULL,
  computed_at TEXT NOT NULL DEFAULT (datetime('now'))
) WITHOUT ROWID;
