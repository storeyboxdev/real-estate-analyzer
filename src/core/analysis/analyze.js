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
import { buildProjection } from './projection.js';

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
    initialMissedRent,
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
  // Closing costs: per-unit amount overrides the percentage when set. Users
  // generally think of closings as EITHER a % of price OR a flat $/door, not
  // both — summing them double-counts the same line items.
  const closingCosts =
    closingCostPerUnit > 0
      ? unitRents.length * closingCostPerUnit
      : purchasePrice * closingCostPct;
  // Initial acquisition cash: down + closing + repairs-until-rentable +
  // missed rent / holding costs during setup. All reduce cash-on-cash return
  // but do not affect NOI or cap rate (those reflect stabilized operations).
  const totalCashInvested = downPayment + closingCosts + rehabBudget + initialMissedRent;

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

  const outputs = {
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

  // Optional: fold in the multi-year projection if the inputs carry a config.
  // Existing saved revisions without a projection block are unaffected.
  if (inputs.projection) {
    outputs.projection = buildProjection(inputs, outputs, inputs.projection, settings);
  }

  return outputs;
}
