import { describe, it, expect, beforeEach } from 'vitest';
import { openDb } from '../../src/db/db.js';
import { propertiesRepo } from '../../src/db/repositories/properties.js';

describe('propertiesRepo', () => {
  let db;
  let repo;
  beforeEach(() => {
    db = openDb(':memory:');
    repo = propertiesRepo(db);
  });

  it('creates and reads a property', () => {
    const id = repo.create({ address: '123 Main St', propertyType: 'sfr', units: 1 });
    const p = repo.getById(id);
    expect(p.address).toBe('123 Main St');
    expect(p.property_type).toBe('sfr');
    expect(p.units).toBe(1);
  });

  it('defaults units to 1 and type to sfr', () => {
    const id = repo.create({ address: '456 Elm St' });
    const p = repo.getById(id);
    expect(p.units).toBe(1);
    expect(p.property_type).toBe('sfr');
  });

  it('lists properties newest first', () => {
    repo.create({ address: 'First' });
    repo.create({ address: 'Second' });
    const list = repo.list();
    expect(list).toHaveLength(2);
  });

  it('updates fields in place', () => {
    const id = repo.create({ address: 'Old' });
    repo.update(id, { address: 'New', notes: 'renamed' });
    const p = repo.getById(id);
    expect(p.address).toBe('New');
    expect(p.notes).toBe('renamed');
  });

  it('rejects invalid property_type', () => {
    expect(() => repo.create({ address: 'x', propertyType: 'garbage' })).toThrow();
  });

  it('rejects zero units', () => {
    expect(() => repo.create({ address: 'x', units: 0 })).toThrow();
  });

  it('deletes a property', () => {
    const id = repo.create({ address: 'x' });
    repo.delete(id);
    expect(repo.getById(id)).toBeUndefined();
  });
});
