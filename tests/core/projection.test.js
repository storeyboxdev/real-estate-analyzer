import { describe, it, expect } from 'vitest';
import { analyze } from '../../src/core/analysis/analyze.js';
import { buildProjection } from '../../src/core/analysis/projection.js';

const baseInputs = {
  purchasePrice: 200000,
  closingCostPct: 0.03,
  closingCostPerUnit: 0,
  rehabBudget: 0,
  initialMissedRent: 0,
  downPaymentPct: 0.25,
  loanTermYears: 30,
  interestRate: 0.07,
  unitRents: [1800],
  otherIncomeMonthly: 0,
  vacancyPct: 0.05,
  managementPct: 0.10,
  maintenancePct: 0.05,
  capexPct: 0.05,
  taxesAnnual: 3000,
  insuranceAnnual: 1200,
  hoaAnnual: 0,
  utilitiesAnnual: 0,
  otherOpexAnnual: 0,
};

const baseSettings = { currentMortgageRate: 0.07, requiredCoCReturn: 0.08 };

function baseOutputs() {
  return analyze(baseInputs);
}

describe('buildProjection — shape and invariants', () => {
  const cfg = {
    holdYears: 5,
    appreciationRate: 0.03,
    rentGrowthRate: 0.02,
    expenseGrowthRate: 0.02,
    includeSale: true,
    sellingCostPct: 0.06,
    yearOverrides: {},
  };
  const p = buildProjection(baseInputs, baseOutputs(), cfg, baseSettings);

  it('produces one year row per hold year', () => {
    expect(p.years).toHaveLength(5);
    expect(p.years[0].year).toBe(1);
    expect(p.years[4].year).toBe(5);
  });

  it('cashFlowSeries has holdYears + 1 entries (year 0 is the initial outflow)', () => {
    expect(p.cashFlowSeries).toHaveLength(6);
    expect(p.cashFlowSeries[0]).toBe(-baseOutputs().totalCashInvested);
  });

  it('property value grows by the appreciation rate each year', () => {
    // year 1 = purchase * 1.03^1; year 5 = purchase * 1.03^5
    expect(p.years[0].propertyValue).toBeCloseTo(200000 * 1.03, 4);
    expect(p.years[4].propertyValue).toBeCloseTo(200000 * Math.pow(1.03, 5), 4);
  });

  it('year-1 gross rent and opex equal the base values (no growth yet at y=1)', () => {
    const o = baseOutputs();
    expect(p.years[0].grossRent).toBeCloseTo(o.grossScheduledIncome, 4);
    expect(p.years[0].operatingExpenses).toBeCloseTo(o.operatingExpenses, 4);
  });

  it('equity grows as loan amortizes and value appreciates', () => {
    // Year-over-year equity should monotonically increase in this scenario.
    for (let i = 1; i < p.years.length; i++) {
      expect(p.years[i].equity).toBeGreaterThan(p.years[i - 1].equity);
    }
  });

  it('produces a finite IRR and MIRR for a well-behaved stream', () => {
    expect(Number.isFinite(p.irr)).toBe(true);
    expect(Number.isFinite(p.mirr)).toBe(true);
    // 5-year hold + 3% appreciation + sale typically lands IRR in single-to-low-double digits for this deal
    expect(p.irr).toBeGreaterThan(0);
    expect(p.irr).toBeLessThan(0.5);
  });

  it('netSaleProceeds equals (value × (1 − sellingCost)) − remainingBalance in final year', () => {
    const final = p.years[4];
    const expected = final.propertyValue * (1 - 0.06) - final.remainingBalance;
    expect(p.netSaleProceeds).toBeCloseTo(expected, 2);
  });
});

describe('buildProjection — include-sale toggle', () => {
  const common = {
    holdYears: 5,
    appreciationRate: 0.03,
    rentGrowthRate: 0.02,
    expenseGrowthRate: 0.02,
    sellingCostPct: 0.06,
    yearOverrides: {},
  };
  const withSale = buildProjection(
    baseInputs,
    baseOutputs(),
    { ...common, includeSale: true },
    baseSettings,
  );
  const noSale = buildProjection(
    baseInputs,
    baseOutputs(),
    { ...common, includeSale: false },
    baseSettings,
  );

  it('no-sale mode has netSaleProceeds null', () => {
    expect(noSale.netSaleProceeds).toBeNull();
  });

  it('IRR is meaningfully higher with a sale (sale injects equity at t=n)', () => {
    expect(withSale.irr).toBeGreaterThan(noSale.irr);
  });
});

describe('buildProjection — year overrides', () => {
  const baseCfg = {
    holdYears: 3,
    appreciationRate: 0.03,
    rentGrowthRate: 0.02,
    expenseGrowthRate: 0.02,
    includeSale: false,
    sellingCostPct: 0.06,
  };

  it('cashFlow override replaces the computed value and flags the year', () => {
    const p = buildProjection(
      baseInputs,
      baseOutputs(),
      { ...baseCfg, yearOverrides: { '2': { cashFlow: -5000, note: 'new roof' } } },
      baseSettings,
    );
    expect(p.years[1].cashFlow).toBe(-5000);
    expect(p.years[1].overridden).toBe(true);
    expect(p.years[1].note).toBe('new roof');
    // Year 1 and 3 not overridden
    expect(p.years[0].overridden).toBe(false);
    expect(p.years[2].overridden).toBe(false);
  });

  it('noi override recomputes cashFlow = override.noi − debtService', () => {
    const p = buildProjection(
      baseInputs,
      baseOutputs(),
      { ...baseCfg, yearOverrides: { '1': { noi: 12000 } } },
      baseSettings,
    );
    const y = p.years[0];
    expect(y.noi).toBe(12000);
    expect(y.cashFlow).toBeCloseTo(12000 - y.debtService, 4);
    expect(y.overridden).toBe(true);
  });

  it('cashFlow override beats noi override when both present', () => {
    const p = buildProjection(
      baseInputs,
      baseOutputs(),
      { ...baseCfg, yearOverrides: { '1': { cashFlow: 999, noi: 12000 } } },
      baseSettings,
    );
    expect(p.years[0].cashFlow).toBe(999);
  });
});

describe('buildProjection — MIRR rates fall back to settings', () => {
  it('uses settings defaults when mirrFinanceRate / mirrReinvestRate are missing', () => {
    const cfg = {
      holdYears: 5,
      appreciationRate: 0.03,
      rentGrowthRate: 0.02,
      expenseGrowthRate: 0.02,
      includeSale: true,
      sellingCostPct: 0.06,
      yearOverrides: {},
    };
    const p = buildProjection(baseInputs, baseOutputs(), cfg, baseSettings);
    expect(Number.isFinite(p.mirr)).toBe(true);
  });
});
