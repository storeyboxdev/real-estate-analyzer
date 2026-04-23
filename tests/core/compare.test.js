import { describe, it, expect } from 'vitest';
import { compareScenarios } from '../../src/core/analysis/compare.js';

describe('compareScenarios', () => {
  const a = { label: 'asking', outputs: { capRate: 0.06, cocReturn: 0.02, dscr: 1.05, noi: 10000, annualCashFlow: 200, monthlyCashFlow: 17, totalCashInvested: 60000, monthlyPayment: 1200, grm: 10 } };
  const b = { label: 'my offer', outputs: { capRate: 0.08, cocReturn: 0.05, dscr: 1.25, noi: 12000, annualCashFlow: 2000, monthlyCashFlow: 167, totalCashInvested: 55000, monthlyPayment: 1100, grm: 9 } };
  const c = { label: 'dream', outputs: { capRate: 0.09, cocReturn: 0.04, dscr: 1.3, noi: 13000, annualCashFlow: 1800, monthlyCashFlow: 150, totalCashInvested: 50000, monthlyPayment: 1050, grm: 8 } };

  it('flags the best and worst of each metric', () => {
    const { rows } = compareScenarios([a, b, c]);
    const cap = rows.find((r) => r.metric === 'capRate');
    expect(cap.values[0].worst).toBe(true);           // a = 0.06
    expect(cap.values[2].best).toBe(true);            // c = 0.09

    const cash = rows.find((r) => r.metric === 'totalCashInvested');
    // lower is better; c wins
    expect(cash.values[2].best).toBe(true);
    expect(cash.values[0].worst).toBe(true);
  });

  it('does not flag when all values are equal', () => {
    const x = { label: 'x', outputs: { capRate: 0.07 } };
    const y = { label: 'y', outputs: { capRate: 0.07 } };
    const { rows } = compareScenarios([x, y]);
    const cap = rows.find((r) => r.metric === 'capRate');
    expect(cap.values.every((v) => !v.best && !v.worst)).toBe(true);
  });

  it('does not flag when only one entry is present', () => {
    const { rows } = compareScenarios([a]);
    const cap = rows.find((r) => r.metric === 'capRate');
    expect(cap.values[0].best).toBeUndefined();
    expect(cap.values[0].worst).toBeUndefined();
  });

  it('skips non-finite values in extrema calculation', () => {
    const weird = { label: 'weird', outputs: { dscr: Infinity, capRate: 0.05 } };
    const normal = { label: 'normal', outputs: { dscr: 1.2, capRate: 0.08 } };
    const { rows } = compareScenarios([weird, normal]);
    const dscr = rows.find((r) => r.metric === 'dscr');
    // Only one finite value — no best/worst flags
    expect(dscr.values[0].best).toBeUndefined();
    expect(dscr.values[1].best).toBeUndefined();
    // But capRate has two finite values, still flagged
    const cap = rows.find((r) => r.metric === 'capRate');
    expect(cap.values[1].best).toBe(true);
  });

  it('returns empty rows for empty input', () => {
    const { rows, entries } = compareScenarios([]);
    expect(rows).toEqual([]);
    expect(entries).toEqual([]);
  });
});
