import { describe, it, expect, beforeEach } from 'vitest';
import { openDb } from '../../src/db/db.js';
import { propertiesRepo } from '../../src/db/repositories/properties.js';
import { scenariosRepo } from '../../src/db/repositories/scenarios.js';
import { revisionsRepo } from '../../src/db/repositories/revisions.js';

describe('revisionsRepo', () => {
  let db;
  let revs;
  let scenarioId;
  beforeEach(() => {
    db = openDb(':memory:');
    const propertyId = propertiesRepo(db).create({ address: 'x' });
    scenarioId = scenariosRepo(db).create(propertyId, { name: 'asking' });
    revs = revisionsRepo(db);
  });

  it('appends and hydrates inputs/outputs JSON', () => {
    const id = revs.append(scenarioId, {
      inputs: { purchasePrice: 200000 },
      outputs: { capRate: 0.08 },
      note: 'initial',
    });
    const r = revs.getById(id);
    expect(r.inputs.purchasePrice).toBe(200000);
    expect(r.outputs.capRate).toBe(0.08);
    expect(r.note).toBe('initial');
  });

  it('latest returns the most recently appended revision', () => {
    revs.append(scenarioId, { inputs: { v: 1 }, outputs: {} });
    revs.append(scenarioId, { inputs: { v: 2 }, outputs: {} });
    revs.append(scenarioId, { inputs: { v: 3 }, outputs: {} });
    expect(revs.latest(scenarioId).inputs.v).toBe(3);
  });

  it('listForScenario returns all revisions newest first', () => {
    revs.append(scenarioId, { inputs: { v: 1 }, outputs: {} });
    revs.append(scenarioId, { inputs: { v: 2 }, outputs: {} });
    const list = revs.listForScenario(scenarioId);
    expect(list).toHaveLength(2);
    expect(list[0].inputs.v).toBe(2);
  });

  it('returns undefined when no revisions exist', () => {
    expect(revs.latest(scenarioId)).toBeUndefined();
  });
});
