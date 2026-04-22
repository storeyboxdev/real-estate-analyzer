import { describe, it, expect } from 'vitest';
import { fv, pv, pmt, npv, irr } from '../../src/core/formulas/tvm.js';

describe('fv', () => {
  it('computes FV = PV * (1+i)^n for textbook example', () => {
    expect(fv(1000, 0.05, 10)).toBeCloseTo(1628.8946, 4);
  });

  it('returns the principal when n is 0', () => {
    expect(fv(1000, 0.05, 0)).toBe(1000);
  });

  it('returns the principal when the rate is 0', () => {
    expect(fv(1000, 0, 10)).toBe(1000);
  });
});

describe('pv', () => {
  it('is the inverse of fv', () => {
    const future = fv(1000, 0.05, 10);
    expect(pv(future, 0.05, 10)).toBeCloseTo(1000, 4);
  });
});

describe('pmt', () => {
  it('computes the classic $200k / 6% / 30yr mortgage payment', () => {
    // Monthly rate and term
    expect(pmt(200000, 0.06 / 12, 360)).toBeCloseTo(1199.1011, 4);
  });

  it('degenerates to principal / n when rate is 0', () => {
    expect(pmt(12000, 0, 12)).toBe(1000);
  });
});

describe('npv', () => {
  it('computes a known four-period NPV', () => {
    // -100 + 50/1.1 + 50/1.21 + 50/1.331 = 24.3425
    expect(npv(0.1, [-100, 50, 50, 50])).toBeCloseTo(24.3425, 3);
  });

  it('returns the sum of cash flows when rate is 0', () => {
    expect(npv(0, [-100, 50, 50, 50])).toBe(50);
  });
});

describe('irr', () => {
  it('finds the known IRR for [-100, 50, 50, 50]', () => {
    expect(irr([-100, 50, 50, 50])).toBeCloseTo(0.2337, 3);
  });

  it('returns NaN when all cash flows have the same sign', () => {
    expect(Number.isNaN(irr([100, 50, 50]))).toBe(true);
    expect(Number.isNaN(irr([-100, -50, -50]))).toBe(true);
  });

  it('NPV at the IRR is approximately zero', () => {
    const cfs = [-1000, 300, 400, 500];
    const r = irr(cfs);
    expect(npv(r, cfs)).toBeCloseTo(0, 4);
  });
});
