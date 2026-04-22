// Headline return metrics. Inputs are already-computed dollar figures.

// Cap rate = NOI / purchase price. Independent of financing.
export function capRate(noi, purchasePrice) {
  if (purchasePrice === 0) return NaN;
  return noi / purchasePrice;
}

// Cash-on-cash return = annual pre-tax cash flow / total cash invested.
export function cocReturn(annualCashFlow, totalCashInvested) {
  if (totalCashInvested === 0) return NaN;
  return annualCashFlow / totalCashInvested;
}

// Debt-service coverage ratio = NOI / annual debt service. >1 means the
// property covers its mortgage from operations alone.
export function dscr(noi, annualDebtService) {
  if (annualDebtService === 0) return Infinity;
  return noi / annualDebtService;
}

// Gross rent multiplier = price / gross annual rent. Lower is cheaper per $ of rent.
export function grm(purchasePrice, grossAnnualRent) {
  if (grossAnnualRent === 0) return NaN;
  return purchasePrice / grossAnnualRent;
}
