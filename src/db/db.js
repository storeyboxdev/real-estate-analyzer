import Database from 'better-sqlite3';

// Schema is inlined (rather than read from disk) so it works identically under
// plain Node (CLI, vitest) and under an Electron-bundled main process. The
// original SQL lives at src/db/schema.sql for readability — keep them in sync.
const SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS properties (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  address       TEXT    NOT NULL,
  property_type TEXT    NOT NULL CHECK (property_type IN ('sfr', 'multifamily')),
  units         INTEGER NOT NULL DEFAULT 1 CHECK (units >= 1),
  notes         TEXT,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS scenarios (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name        TEXT    NOT NULL,
  is_current  INTEGER NOT NULL DEFAULT 0 CHECK (is_current IN (0, 1)),
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE (property_id, name)
);

CREATE UNIQUE INDEX IF NOT EXISTS scenarios_one_current_per_property
  ON scenarios (property_id) WHERE is_current = 1;

CREATE INDEX IF NOT EXISTS scenarios_property_idx ON scenarios (property_id);

CREATE TABLE IF NOT EXISTS scenario_revisions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  scenario_id  INTEGER NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  inputs_json  TEXT    NOT NULL,
  outputs_json TEXT    NOT NULL,
  note         TEXT
);

CREATE INDEX IF NOT EXISTS scenario_revisions_scenario_idx
  ON scenario_revisions (scenario_id, created_at DESC);
`;

export function openDb(filepath = ':memory:') {
  const db = new Database(filepath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  migrate(db);
  return db;
}

export function migrate(db) {
  db.exec(SCHEMA);
}
