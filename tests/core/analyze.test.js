import { describe, it, expect } from 'vitest';
import { analyze } from '../../src/core/analysis/analyze.js';

// A minimal single-family buy-and-hold scenario exercising every metric.
const baseInputs = {
  purchasePrice: 200000,
  closingCostPct: 0.03,
  rehabBudget: 0,
  downPaymentPct: 0.25,
  loanTermYears: 30,
  interestRate: 0.07,
  unitRents: [1800],
  otherIncomeMonthly: 0,
  vacancyPct: 0.05,
  managementPct: 0.08,
  maintenancePct: 0.05,
  capexPct: 0.05,
  taxesAnnual: 3000,
  insuranceAnnual: 1200,
  hoaAnnual: 0,
  utilitiesAnnual: 0,
  otherOpexAnnual: 0,
};

describe('analyze — end-to-end', () => {
  const result = analyze(baseInputs);

  it('computes financing breakdown', () => {
    expect(result.downPayment).toBe(50000);
    expect(result.loanAmount).toBe(150000);
    expect(result.closingCosts).toBe(6000);
    expect(result.totalCashInvested).toBe(56000);
  });

  it('computes monthly and annual debt service', () => {
    // $150k at 7% for 30 years ≈ $997.95/mo
    expect(result.monthlyPayment).toBeCloseTo(997.95, 1);
    expect(result.annualDebtService).toBeCloseTo(result.monthlyPayment * 12, 6);
  });

  it('computes NOI from income less opex', () => {
    expect(result.grossScheduledIncome).toBe(21600);
    // EGI = 21600 * 0.95 = 20520
    expect(result.effectiveGrossIncome).toBeCloseTo(20520, 4);
    // Variable opex = 20520 * 0.18 = 3693.6; fixed = 4200; total = 7893.6
    expect(result.operatingExpenses).toBeCloseTo(7893.6, 4);
    expect(result.noi).toBeCloseTo(20520 - 7893.6, 4);
  });

  it('computes cap rate, CoC, DSCR, GRM', () => {
    expect(result.capRate).toBeCloseTo(result.noi / 200000, 6);
    expect(result.cocReturn).toBeCloseTo(result.annualCashFlow / 56000, 6);
    expect(result.dscr).toBeCloseTo(result.noi / result.annualDebtService, 6);
    expect(result.grm).toBeCloseTo(200000 / 21600, 4);
  });

  it('flags whether the deal meets hurdle rates', () => {
    const strict = analyze(baseInputs, { requiredCapRate: 0.2, requiredCoCReturn: 0.2 });
    expect(strict.meetsCapRate).toBe(false);
    expect(strict.meetsCoCReturn).toBe(false);

    const generous = analyze(baseInputs, { requiredCapRate: 0.01, requiredCoCReturn: 0.01 });
    expect(generous.meetsCapRate).toBe(true);
  });

  it('rejects invalid inputs', () => {
    expect(() => analyze({ ...baseInputs, purchasePrice: -1 })).toThrow();
    expect(() => analyze({ ...baseInputs, unitRents: [] })).toThrow();
    expect(() => analyze({ ...baseInputs, downPaymentPct: 1.5 })).toThrow();
  });
});

describe('analyze — multi-family', () => {
  it('sums per-unit rents', () => {
    const result = analyze({ ...baseInputs, unitRents: [1500, 1500, 1500, 1500] });
    expect(result.grossScheduledIncome).toBe(1500 * 4 * 12);
  });
});

describe('analyze — closing costs', () => {
  it('uses the % of price by default', () => {
    const r = analyze({ ...baseInputs, closingCostPct: 0.03, closingCostPerUnit: 0 });
    expect(r.closingCosts).toBe(6000);
  });

  it('supports a per-unit flat amount', () => {
    const r = analyze({
      ...baseInputs,
      closingCostPct: 0,
      closingCostPerUnit: 1500,
      unitRents: [1200, 1200, 1200, 1200],
    });
    expect(r.closingCosts).toBe(1500 * 4);
  });

  it('uses per-unit exclusively when both are provided (no double-counting)', () => {
    const r = analyze({
      ...baseInputs,
      closingCostPct: 0.02,
      closingCostPerUnit: 1000,
      unitRents: [1500, 1500],
    });
    // Per-unit wins: 2 * 1000 = 2000. The 0.02 * 200000 = 4000 from the pct is ignored.
    expect(r.closingCosts).toBe(2000);
  });

  it('falls back to the pct when per-unit is 0', () => {
    const r = analyze({
      ...baseInputs,
      closingCostPct: 0.04,
      closingCostPerUnit: 0,
      unitRents: [1500, 1500],
    });
    expect(r.closingCosts).toBe(0.04 * 200000);
  });
});

describe('analyze — initial acquisition costs', () => {
  it('rolls rehab budget and missed rent into totalCashInvested', () => {
    const r = analyze({ ...baseInputs, rehabBudget: 8000, initialMissedRent: 3600 });
    // Base: down 50000 + closing 6000 + rehab 8000 + missed rent 3600 = 67,600
    expect(r.totalCashInvested).toBe(50000 + 6000 + 8000 + 3600);
  });

  it('does not change NOI, cap rate, or DSCR when acquisition costs change', () => {
    const without = analyze({ ...baseInputs, rehabBudget: 0, initialMissedRent: 0 });
    const withCosts = analyze({ ...baseInputs, rehabBudget: 8000, initialMissedRent: 3600 });
    expect(withCosts.noi).toBe(without.noi);
    expect(withCosts.capRate).toBe(without.capRate);
    expect(withCosts.dscr).toBe(without.dscr);
    // But cash-on-cash falls because total cash invested rose
    expect(withCosts.cocReturn).toBeLessThan(without.cocReturn);
  });
});
