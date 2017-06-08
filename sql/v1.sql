CREATE TABLE events (
  id TEXT PRIMARY KEY NOT NULL,
  date INTEGER DEFAULT (datetime('now')),
  event TEXT NOT NULL,
  domain TEXT NOT NULL,
  url TEXT,
  session TEXT,
  ip TEXT,
  note TEXT,
  isMobile TEXT,
  isDesktop TEXT,
  isBot TEXT,
  browser TEXT,
  version TEXT,
  os TEXT,
  platform TEXT
);

CREATE TABLE events_extra (
  event_id TEXT,
  key TEXT,
  value TEXT,
  FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE
);

PRAGMA user_version = 1;
