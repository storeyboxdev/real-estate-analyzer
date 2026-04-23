import { remainingBalance } from '../formulas/amortization.js';
import { irr, mirr } from '../formulas/tvm.js';

// Builds a multi-year pro forma on top of the single-year outputs. Pure JS —
// no side effects, no imports from Electron / DB / fs.
//
// Per-year mechanics:
//   grossRent_y = baseGSI * (1 + rentGrowthRate)^(y-1)
//   vacancyAdj_y = grossRent_y * (1 - vacancyPct)
//   opex_y = baseOpex * (1 + expenseGrowthRate)^(y-1)
//   noi_y  = vacancyAdj_y - opex_y           (override.noi wins when set)
//   cf_y   = noi_y - annualDebtService        (override.cashFlow wins when set)
//   propertyValue_y = purchasePrice * (1 + appreciationRate)^y
//   remainingBalance_y = closed-form from amortization
//   equity_y = propertyValue_y - remainingBalance_y
//
// Cash-flow series for IRR/MIRR: [t=0: -totalCashInvested, t=1..n: cf_y, at t=n
// add net sale proceeds when includeSale is true].
export function buildProjection(inputs, baseOutputs, cfg, settings) {
  const {
    purchasePrice,
    interestRate,
    loanTermYears,
    vacancyPct,
  } = inputs;

  const {
    holdYears,
    appreciationRate,
    rentGrowthRate,
    expenseGrowthRate,
    includeSale,
    sellingCostPct,
    yearOverrides = {},
  } = cfg;

  const financeRate = cfg.mirrFinanceRate ?? settings.currentMortgageRate;
  const reinvestRate = cfg.mirrReinvestRate ?? settings.requiredCoCReturn;

  const {
    grossScheduledIncome: baseGSI,
    operatingExpenses: baseOpex,
    annualDebtService,
    loanAmount,
    totalCashInvested,
  } = baseOutputs;

  const years = [];
  const cashFlowSeries = [-totalCashInvested];

  for (let y = 1; y <= holdYears; y++) {
    const grossRent = baseGSI * Math.pow(1 + rentGrowthRate, y - 1);
    const egi = grossRent * (1 - vacancyPct);
    const opex = baseOpex * Math.pow(1 + expenseGrowthRate, y - 1);
    let noi = egi - opex;

    const override = yearOverrides[String(y)] ?? yearOverrides[y];
    let overridden = false;
    let cashFlow;
    if (override && Number.isFinite(override.cashFlow)) {
      // Full cash-flow override: take user's number as-is and let NOI stay as computed.
      cashFlow = override.cashFlow;
      overridden = true;
    } else {
      if (override && Number.isFinite(override.noi)) {
        noi = override.noi;
        overridden = true;
      }
      cashFlow = noi - annualDebtService;
    }

    const propertyValue = purchasePrice * Math.pow(1 + appreciationRate, y);
    const balance = remainingBalance(loanAmount, interestRate, loanTermYears, y * 12);
    const equity = propertyValue - balance;

    years.push({
      year: y,
      grossRent,
      effectiveGrossIncome: egi,
      operatingExpenses: opex,
      noi,
      debtService: annualDebtService,
      cashFlow,
      overridden,
      propertyValue,
      remainingBalance: balance,
      equity,
      note: override?.note ?? null,
    });

    cashFlowSeries.push(cashFlow);
  }

  // Sale lumped into the final year's cash flow.
  let netSaleProceeds = null;
  if (includeSale && years.length > 0) {
    const last = years[years.length - 1];
    netSaleProceeds = last.propertyValue * (1 - sellingCostPct) - last.remainingBalance;
    cashFlowSeries[cashFlowSeries.length - 1] += netSaleProceeds;
  }

  const equityAtExit = years.length > 0 ? years[years.length - 1].equity : 0;
  const initialEquity = purchasePrice - loanAmount; // == downPayment
  const totalEquityBuilt = equityAtExit - initialEquity;

  return {
    irr: irr(cashFlowSeries),
    mirr: mirr(cashFlowSeries, financeRate, reinvestRate),
    equityAtExit,
    totalEquityBuilt,
    netSaleProceeds,
    years,
    cashFlowSeries,
  };
}
