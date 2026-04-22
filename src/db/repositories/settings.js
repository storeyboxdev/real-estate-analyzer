import { SettingsSchema } from '../../core/models/inputs.js';

// Key/value table with a typed view. SettingsSchema applies defaults + validation.
export function settingsRepo(db) {
  const getStmt = db.prepare('SELECT value FROM settings WHERE key = ?');
  const setStmt = db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
  );
  const allStmt = db.prepare('SELECT key, value FROM settings');
  const deleteStmt = db.prepare('DELETE FROM settings WHERE key = ?');

  function deserialize(value) {
    // Values are stored as JSON so numbers/booleans round-trip through TEXT.
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  return {
    get(key) {
      const row = getStmt.get(key);
      return row ? deserialize(row.value) : undefined;
    },

    set(key, value) {
      setStmt.run(key, JSON.stringify(value));
    },

    delete(key) {
      deleteStmt.run(key);
    },

    // Raw key/value map, useful for `settings show`.
    allRaw() {
      const out = {};
      for (const row of allStmt.all()) out[row.key] = deserialize(row.value);
      return out;
    },

    // Parsed settings object — fills in defaults for anything missing.
    get parsed() {
      return SettingsSchema.parse(this.allRaw());
    },

    // Persist any fields not already set. Safe to call on every startup.
    seedDefaults() {
      const defaults = SettingsSchema.parse({});
      const existing = this.allRaw();
      for (const [key, value] of Object.entries(defaults)) {
        if (existing[key] === undefined) this.set(key, value);
      }
    },
  };
}
