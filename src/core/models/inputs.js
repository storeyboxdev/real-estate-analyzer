import { z } from 'zod';

const pct = z.number().min(0).max(1);
const nonNeg = z.number().min(0);
// Growth rates can run negative (deflation, rent compression) and positive beyond
// 50% in the rare case, so we don't clamp them like percentages of price.
const rate = z.number().min(-0.5).max(1);

// Per-year override: at least one of cashFlow or noi may be present. If
// cashFlow is set, it replaces the computed figure for that year outright;
// noi is a narrower override that still lets debt service flow through.
export const YearOverrideSchema = z.object({
  cashFlow: z.number().optional(),
  noi: z.number().optional(),
  note: z.string().optional(),
});

export const ProjectionConfigSchema = z.object({
  holdYears: z.number().int().min(1).max(50).default(5),
  appreciationRate: rate.default(0.03),
  rentGrowthRate: rate.default(0.02),
  expenseGrowthRate: rate.default(0.02),
  includeSale: z.boolean().default(true),
  sellingCostPct: pct.default(0.06),
  // MIRR rates — defaults filled from settings at analyze() time when missing.
  mirrFinanceRate: pct.optional(),
  mirrReinvestRate: pct.optional(),
  // Per-year overrides keyed by year number as a string ("1", "2", ...).
  yearOverrides: z.record(z.string(), YearOverrideSchema).default({}),
});

export const ScenarioInputsSchema = z.object({
  // Purchase
  purchasePrice: z.number().positive(),
  // Closing costs: if `closingCostPerUnit` is > 0, it's used exclusively.
  // Otherwise `closingCostPct` is applied to the purchase price.
  closingCostPct: pct.default(0.03),
  closingCostPerUnit: nonNeg.default(0),
  rehabBudget: nonNeg.default(0),          // repairs needed to reach rent-ready
  initialMissedRent: nonNeg.default(0),    // missed rent + holding costs during setup

  // Financing
  downPaymentPct: pct.default(0.25),
  loanTermYears: z.number().int().positive().default(30),
  interestRate: pct, // annual, e.g. 0.07 for 7%

  // Income (per unit monthly rent; single-family = array of length 1)
  unitRents: z.array(nonNeg).min(1),
  otherIncomeMonthly: nonNeg.default(0),

  // Operating assumptions
  vacancyPct: pct.default(0.05),
  managementPct: pct.default(0.10),
  maintenancePct: pct.default(0.05),
  capexPct: pct.default(0.05),

  // Fixed annual operating expenses
  taxesAnnual: nonNeg.default(0),
  insuranceAnnual: nonNeg.default(0),
  hoaAnnual: nonNeg.default(0),
  utilitiesAnnual: nonNeg.default(0),
  otherOpexAnnual: nonNeg.default(0),

  // Optional multi-year projection block. When absent, analyze() returns the
  // single-year outputs only (backwards-compatible with existing saved revisions).
  projection: ProjectionConfigSchema.optional(),
});

export const SettingsSchema = z.object({
  currentMortgageRate: pct.default(0.07),
  requiredCapRate: pct.default(0.07),
  requiredCoCReturn: pct.default(0.08),
  defaultDownPaymentPct: pct.default(0.25),
  defaultLoanTermYears: z.number().int().positive().default(30),
  defaultClosingCostPct: pct.default(0.03),
  defaultClosingCostPerUnit: nonNeg.default(0),
  defaultVacancyPct: pct.default(0.05),
  defaultManagementPct: pct.default(0.10),
  defaultMaintenancePct: pct.default(0.05),
  defaultCapexPct: pct.default(0.05),
});

export const ScenarioOutputsSchema = z.object({
  // Financing breakdown
  loanAmount: z.number(),
  downPayment: z.number(),
  closingCosts: z.number(),
  totalCashInvested: z.number(),
  monthlyPayment: z.number(),
  annualDebtService: z.number(),

  // Income & expenses
  grossScheduledIncome: z.number(),
  effectiveGrossIncome: z.number(),
  operatingExpenses: z.number(),
  noi: z.number(),

  // Returns
  annualCashFlow: z.number(),
  monthlyCashFlow: z.number(),
  capRate: z.number(),
  cocReturn: z.number(),
  dscr: z.number(),
  grm: z.number(),

  // Pass/fail vs. hurdle
  meetsCapRate: z.boolean(),
  meetsCoCReturn: z.boolean(),

  // Populated only when inputs.projection was provided. See projection.js.
  projection: z.object({
    irr: z.number(),
    mirr: z.number(),
    equityAtExit: z.number(),
    totalEquityBuilt: z.number(),
    netSaleProceeds: z.number().nullable(),
    years: z.array(z.record(z.string(), z.any())),
    cashFlowSeries: z.array(z.number()),
  }).optional(),
});

export function parseInputs(raw) {
  return ScenarioInputsSchema.parse(raw);
}

export function parseSettings(raw) {
  return SettingsSchema.parse(raw);
}
