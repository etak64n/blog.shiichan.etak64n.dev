-- Per-day view tallies, one row per (article, day). Kept tiny by aggregating
-- into daily buckets rather than storing a row per hit; powers "popular this
-- week" via a 7-day SUM.
CREATE TABLE IF NOT EXISTS article_views (
  slug TEXT NOT NULL,
  day TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (slug, day)
);

CREATE INDEX IF NOT EXISTS idx_article_views_day ON article_views (day);
