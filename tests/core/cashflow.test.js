import { describe, it, expect } from 'vitest';
import {
  grossScheduledIncome,
  effectiveGrossIncome,
  operatingExpenses,
  noi,
  annualCashFlow,
} from '../../src/core/formulas/cashflow.js';

describe('grossScheduledIncome', () => {
  it('annualizes monthly rents plus other income', () => {
    expect(grossScheduledIncome({ unitRents: [1500, 1500], otherIncomeMonthly: 100 })).toBe(
      (1500 + 1500 + 100) * 12,
    );
  });

  it('works for a single-family property', () => {
    expect(grossScheduledIncome({ unitRents: [2000] })).toBe(24000);
  });
});

describe('effectiveGrossIncome', () => {
  it('discounts GSI by vacancy', () => {
    expect(effectiveGrossIncome(36000, 0.05)).toBeCloseTo(34200, 4);
  });
});

describe('operatingExpenses', () => {
  it('applies variable % to EGI and adds fixed dollars', () => {
    const opex = operatingExpenses({
      egi: 30000,
      managementPct: 0.08,
      maintenancePct: 0.05,
      capexPct: 0.05,
      taxesAnnual: 3000,
      insuranceAnnual: 1200,
    });
    // 30000 * 0.18 + 4200 = 5400 + 4200 = 9600
    expect(opex).toBeCloseTo(9600, 4);
  });
});

describe('noi and annualCashFlow', () => {
  it('noi = egi - opex', () => {
    expect(noi(30000, 9600)).toBe(20400);
  });

  it('annualCashFlow = noi - debt service', () => {
    expect(annualCashFlow(20400, 14400)).toBe(6000);
  });
});
