import { z } from 'zod';

const pct = z.number().min(0).max(1);
const nonNeg = z.number().min(0);

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
  managementPct: pct.default(0.08),
  maintenancePct: pct.default(0.05),
  capexPct: pct.default(0.05),

  // Fixed annual operating expenses
  taxesAnnual: nonNeg.default(0),
  insuranceAnnual: nonNeg.default(0),
  hoaAnnual: nonNeg.default(0),
  utilitiesAnnual: nonNeg.default(0),
  otherOpexAnnual: nonNeg.default(0),
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
  defaultManagementPct: pct.default(0.08),
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
});

export function parseInputs(raw) {
  return ScenarioInputsSchema.parse(raw);
}

export function parseSettings(raw) {
  return SettingsSchema.parse(raw);
}
