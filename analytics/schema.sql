-- One row per page view. No IP addresses are stored.
CREATE TABLE IF NOT EXISTS views (
  id        TEXT PRIMARY KEY,   -- random id made by the browser for this view
  ts        INTEGER NOT NULL,   -- epoch ms
  day       TEXT NOT NULL,      -- YYYY-MM-DD in Korea time
  sid       TEXT NOT NULL,      -- per-tab session id (sessionStorage)
  visitor   TEXT NOT NULL,      -- daily-rotating hash, cannot be reversed to an IP
  path      TEXT NOT NULL,
  title     TEXT,
  ref_host  TEXT,               -- referring site (e.g. scholar.google.com)
  ref       TEXT,
  utm       TEXT,
  country   TEXT,
  region    TEXT,
  city      TEXT,
  org       TEXT,               -- network owner from the IP (e.g. "Kyungpook National University")
  asn       INTEGER,
  domain    TEXT,               -- organization domain from reverse DNS (e.g. knu.ac.kr)
  net       TEXT,               -- 'org' | 'isp' | 'hosting'
  device    TEXT,
  browser   TEXT,
  os        TEXT,
  lang      TEXT,
  screen    INTEGER,
  duration  INTEGER DEFAULT 0   -- seconds the page was visible
);
CREATE INDEX IF NOT EXISTS views_day ON views(day);
CREATE INDEX IF NOT EXISTS views_sid ON views(sid);
