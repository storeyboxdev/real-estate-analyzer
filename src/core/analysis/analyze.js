import { monthlyPayment } from '../formulas/amortization.js';
import {
  grossScheduledIncome,
  effectiveGrossIncome,
  operatingExpenses,
  noi as calcNoi,
  annualCashFlow,
} from '../formulas/cashflow.js';
import { capRate, cocReturn, dscr, grm } from '../formulas/returns.js';
import { ScenarioInputsSchema, SettingsSchema } from '../models/inputs.js';

// Single entry point: given validated inputs + settings, return all metrics.
// Pure function — no I/O, no DB, no Electron.
export function analyze(rawInputs, rawSettings = {}) {
  const inputs = ScenarioInputsSchema.parse(rawInputs);
  const settings = SettingsSchema.parse(rawSettings);

  const {
    purchasePrice,
    closingCostPct,
    closingCostPerUnit,
    rehabBudget,
    downPaymentPct,
    loanTermYears,
    interestRate,
    unitRents,
    otherIncomeMonthly,
    vacancyPct,
    managementPct,
    maintenancePct,
    capexPct,
    taxesAnnual,
    insuranceAnnual,
    hoaAnnual,
    utilitiesAnnual,
    otherOpexAnnual,
  } = inputs;

  const downPayment = purchasePrice * downPaymentPct;
  const loanAmount = purchasePrice - downPayment;
  // Closing costs may come from a % of price, a flat per-unit amount, or both.
  const closingCosts = purchasePrice * closingCostPct + unitRents.length * closingCostPerUnit;
  const totalCashInvested = downPayment + closingCosts + rehabBudget;

  const monthlyPmt = monthlyPayment(loanAmount, interestRate, loanTermYears);
  const annualDebtService = monthlyPmt * 12;

  const gsi = grossScheduledIncome({ unitRents, otherIncomeMonthly });
  const egi = effectiveGrossIncome(gsi, vacancyPct);
  const opex = operatingExpenses({
    egi,
    managementPct,
    maintenancePct,
    capexPct,
    taxesAnnual,
    insuranceAnnual,
    hoaAnnual,
    utilitiesAnnual,
    otherOpexAnnual,
  });
  const noi = calcNoi(egi, opex);
  const annualCF = annualCashFlow(noi, annualDebtService);

  const cap = capRate(noi, purchasePrice);
  const coc = cocReturn(annualCF, totalCashInvested);

  return {
    loanAmount,
    downPayment,
    closingCosts,
    totalCashInvested,
    monthlyPayment: monthlyPmt,
    annualDebtService,

    grossScheduledIncome: gsi,
    effectiveGrossIncome: egi,
    operatingExpenses: opex,
    noi,

    annualCashFlow: annualCF,
    monthlyCashFlow: annualCF / 12,
    capRate: cap,
    cocReturn: coc,
    dscr: dscr(noi, annualDebtService),
    grm: grm(purchasePrice, gsi),

    meetsCapRate: cap >= settings.requiredCapRate,
    meetsCoCReturn: coc >= settings.requiredCoCReturn,
  };
}
