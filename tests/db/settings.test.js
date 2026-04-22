import { describe, it, expect, beforeEach } from 'vitest';
import { openDb } from '../../src/db/db.js';
import { settingsRepo } from '../../src/db/repositories/settings.js';

describe('settingsRepo', () => {
  let db;
  let repo;
  beforeEach(() => {
    db = openDb(':memory:');
    repo = settingsRepo(db);
  });

  it('stores and retrieves typed values', () => {
    repo.set('currentMortgageRate', 0.0725);
    expect(repo.get('currentMortgageRate')).toBe(0.0725);
  });

  it('overwrites on set', () => {
    repo.set('currentMortgageRate', 0.07);
    repo.set('currentMortgageRate', 0.08);
    expect(repo.get('currentMortgageRate')).toBe(0.08);
  });

  it('seedDefaults fills missing keys but does not overwrite existing', () => {
    repo.set('currentMortgageRate', 0.09);
    repo.seedDefaults();
    expect(repo.get('currentMortgageRate')).toBe(0.09);
    expect(repo.get('requiredCapRate')).toBeGreaterThan(0);
  });

  it('parsed view applies schema defaults when empty', () => {
    const parsed = repo.parsed;
    expect(parsed.currentMortgageRate).toBeGreaterThan(0);
    expect(parsed.defaultLoanTermYears).toBe(30);
  });

  it('delete removes a key', () => {
    repo.set('x', 1);
    repo.delete('x');
    expect(repo.get('x')).toBeUndefined();
  });
});
