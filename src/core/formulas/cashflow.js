// Operating cash flow primitives. Everything is annualized.

export function grossScheduledIncome({ unitRents = [], otherIncomeMonthly = 0 }) {
  const rentSum = unitRents.reduce((a, b) => a + b, 0);
  return (rentSum + otherIncomeMonthly) * 12;
}

export function effectiveGrossIncome(gsi, vacancyPct) {
  return gsi * (1 - vacancyPct);
}

// Sums annualized operating expenses. Percentage-based expenses (management,
// maintenance, capex) apply to EGI; fixed expenses are passed as annual dollars.
export function operatingExpenses({
  egi,
  managementPct = 0,
  maintenancePct = 0,
  capexPct = 0,
  taxesAnnual = 0,
  insuranceAnnual = 0,
  hoaAnnual = 0,
  utilitiesAnnual = 0,
  otherOpexAnnual = 0,
}) {
  const variable = egi * (managementPct + maintenancePct + capexPct);
  const fixed = taxesAnnual + insuranceAnnual + hoaAnnual + utilitiesAnnual + otherOpexAnnual;
  return variable + fixed;
}

// NOI = EGI - operating expenses. Debt service is NOT included by definition.
export function noi(egi, opex) {
  return egi - opex;
}

// Annual pre-tax cash flow = NOI - annual debt service.
export function annualCashFlow(noiValue, annualDebtService) {
  return noiValue - annualDebtService;
}
