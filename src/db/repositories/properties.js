export function propertiesRepo(db) {
  const insertStmt = db.prepare(
    `INSERT INTO properties (address, property_type, units, notes)
     VALUES (@address, @propertyType, @units, @notes)`,
  );
  const listStmt = db.prepare('SELECT * FROM properties ORDER BY created_at DESC');
  const getStmt = db.prepare('SELECT * FROM properties WHERE id = ?');
  const deleteStmt = db.prepare('DELETE FROM properties WHERE id = ?');
  const updateStmt = db.prepare(
    `UPDATE properties
        SET address = COALESCE(@address, address),
            property_type = COALESCE(@propertyType, property_type),
            units = COALESCE(@units, units),
            notes = COALESCE(@notes, notes)
      WHERE id = @id`,
  );

  return {
    create({ address, propertyType = 'sfr', units = 1, notes = null }) {
      const info = insertStmt.run({ address, propertyType, units, notes });
      return info.lastInsertRowid;
    },

    list() {
      return listStmt.all();
    },

    getById(id) {
      return getStmt.get(id);
    },

    update(id, fields) {
      updateStmt.run({
        id,
        address: fields.address ?? null,
        propertyType: fields.propertyType ?? null,
        units: fields.units ?? null,
        notes: fields.notes ?? null,
      });
    },

    delete(id) {
      deleteStmt.run(id);
    },
  };
}
