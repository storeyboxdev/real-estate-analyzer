// Append-only revision log. To "update" a scenario, append a new revision.
export function revisionsRepo(db) {
  const insertStmt = db.prepare(
    `INSERT INTO scenario_revisions (scenario_id, inputs_json, outputs_json, note)
     VALUES (@scenarioId, @inputs, @outputs, @note)`,
  );
  const listStmt = db.prepare(
    'SELECT * FROM scenario_revisions WHERE scenario_id = ? ORDER BY created_at DESC, id DESC',
  );
  const latestStmt = db.prepare(
    `SELECT * FROM scenario_revisions
      WHERE scenario_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT 1`,
  );
  const getStmt = db.prepare('SELECT * FROM scenario_revisions WHERE id = ?');

  function hydrate(row) {
    if (!row) return row;
    return {
      ...row,
      inputs: JSON.parse(row.inputs_json),
      outputs: JSON.parse(row.outputs_json),
    };
  }

  return {
    append(scenarioId, { inputs, outputs, note = null }) {
      const info = insertStmt.run({
        scenarioId,
        inputs: JSON.stringify(inputs),
        outputs: JSON.stringify(outputs),
        note,
      });
      return info.lastInsertRowid;
    },

    listForScenario(scenarioId) {
      return listStmt.all(scenarioId).map(hydrate);
    },

    latest(scenarioId) {
      return hydrate(latestStmt.get(scenarioId));
    },

    getById(id) {
      return hydrate(getStmt.get(id));
    },
  };
}
