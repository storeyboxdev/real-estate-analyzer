import { describe, it, expect } from 'vitest';
import { capRate, cocReturn, dscr, grm } from '../../src/core/formulas/returns.js';

describe('capRate', () => {
  it('is NOI / price', () => {
    expect(capRate(20000, 250000)).toBeCloseTo(0.08, 6);
  });
});

describe('cocReturn', () => {
  it('is annual cash flow / total cash invested', () => {
    expect(cocReturn(5000, 50000)).toBeCloseTo(0.1, 6);
  });
});

describe('dscr', () => {
  it('is NOI / annual debt service', () => {
    expect(dscr(20000, 15000)).toBeCloseTo(1.3333, 4);
  });

  it('is Infinity when there is no debt service', () => {
    expect(dscr(20000, 0)).toBe(Infinity);
  });
});

describe('grm', () => {
  it('is price / gross annual rent', () => {
    expect(grm(250000, 30000)).toBeCloseTo(8.3333, 4);
  });
});
