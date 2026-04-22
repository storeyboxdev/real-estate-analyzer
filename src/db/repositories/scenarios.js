export function scenariosRepo(db) {
  const insertStmt = db.prepare(
    `INSERT INTO scenarios (property_id, name, is_current)
     VALUES (@propertyId, @name, @isCurrent)`,
  );
  const listStmt = db.prepare(
    'SELECT * FROM scenarios WHERE property_id = ? ORDER BY created_at ASC',
  );
  const getStmt = db.prepare('SELECT * FROM scenarios WHERE id = ?');
  const clearCurrentStmt = db.prepare(
    'UPDATE scenarios SET is_current = 0 WHERE property_id = ? AND id != ?',
  );
  const setCurrentStmt = db.prepare('UPDATE scenarios SET is_current = 1 WHERE id = ?');
  const renameStmt = db.prepare(
    "UPDATE scenarios SET name = ?, updated_at = datetime('now') WHERE id = ?",
  );
  const touchStmt = db.prepare("UPDATE scenarios SET updated_at = datetime('now') WHERE id = ?");
  const deleteStmt = db.prepare('DELETE FROM scenarios WHERE id = ?');
  const getCurrentStmt = db.prepare(
    'SELECT * FROM scenarios WHERE property_id = ? AND is_current = 1',
  );

  // "Current" is exclusive per property — enforced by a partial unique index in schema.sql,
  // but we also clear siblings atomically in a transaction for clarity.
  const setCurrent = db.transaction((scenarioId) => {
    const scenario = getStmt.get(scenarioId);
    if (!scenario) throw new Error(`scenario ${scenarioId} not found`);
    clearCurrentStmt.run(scenario.property_id, scenarioId);
    setCurrentStmt.run(scenarioId);
  });

  return {
    create(propertyId, { name, isCurrent = false }) {
      if (isCurrent) {
        return db.transaction(() => {
          clearCurrentStmt.run(propertyId, -1);
          const info = insertStmt.run({ propertyId, name, isCurrent: 1 });
          return info.lastInsertRowid;
        })();
      }
      const info = insertStmt.run({ propertyId, name, isCurrent: 0 });
      return info.lastInsertRowid;
    },

    listForProperty(propertyId) {
      return listStmt.all(propertyId);
    },

    getById(id) {
      return getStmt.get(id);
    },

    getCurrent(propertyId) {
      return getCurrentStmt.get(propertyId);
    },

    setCurrent(scenarioId) {
      setCurrent(scenarioId);
    },

    rename(scenarioId, newName) {
      renameStmt.run(newName, scenarioId);
    },

    touch(scenarioId) {
      touchStmt.run(scenarioId);
    },

    delete(scenarioId) {
      deleteStmt.run(scenarioId);
    },
  };
}
