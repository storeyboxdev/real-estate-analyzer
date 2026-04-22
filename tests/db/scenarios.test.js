import { describe, it, expect, beforeEach } from 'vitest';
import { openDb } from '../../src/db/db.js';
import { propertiesRepo } from '../../src/db/repositories/properties.js';
import { scenariosRepo } from '../../src/db/repositories/scenarios.js';
import { revisionsRepo } from '../../src/db/repositories/revisions.js';

describe('scenariosRepo', () => {
  let db;
  let props;
  let scens;
  let propertyId;
  beforeEach(() => {
    db = openDb(':memory:');
    props = propertiesRepo(db);
    scens = scenariosRepo(db);
    propertyId = props.create({ address: '1 Test Lane' });
  });

  it('creates a scenario under a property', () => {
    const id = scens.create(propertyId, { name: 'asking' });
    const s = scens.getById(id);
    expect(s.name).toBe('asking');
    expect(s.property_id).toBe(propertyId);
    expect(s.is_current).toBe(0);
  });

  it('rejects duplicate name within the same property', () => {
    scens.create(propertyId, { name: 'asking' });
    expect(() => scens.create(propertyId, { name: 'asking' })).toThrow();
  });

  it('allows the same name across different properties', () => {
    const other = props.create({ address: '2 Other Rd' });
    scens.create(propertyId, { name: 'asking' });
    expect(() => scens.create(other, { name: 'asking' })).not.toThrow();
  });

  it('enforces one current scenario per property', () => {
    const a = scens.create(propertyId, { name: 'a', isCurrent: true });
    const b = scens.create(propertyId, { name: 'b' });
    scens.setCurrent(b);
    expect(scens.getById(a).is_current).toBe(0);
    expect(scens.getById(b).is_current).toBe(1);
    expect(scens.getCurrent(propertyId).id).toBe(b);
  });

  it('creating with isCurrent=true demotes any existing current', () => {
    const a = scens.create(propertyId, { name: 'a', isCurrent: true });
    const b = scens.create(propertyId, { name: 'b', isCurrent: true });
    expect(scens.getById(a).is_current).toBe(0);
    expect(scens.getById(b).is_current).toBe(1);
  });

  it('cascades to revisions when a scenario is deleted', () => {
    const scenarioId = scens.create(propertyId, { name: 'asking' });
    const revs = revisionsRepo(db);
    revs.append(scenarioId, { inputs: { a: 1 }, outputs: { b: 2 } });
    scens.delete(scenarioId);
    expect(revs.listForScenario(scenarioId)).toHaveLength(0);
  });

  it('cascades to scenarios when a property is deleted', () => {
    scens.create(propertyId, { name: 'asking' });
    props.delete(propertyId);
    expect(scens.listForProperty(propertyId)).toHaveLength(0);
  });
});
