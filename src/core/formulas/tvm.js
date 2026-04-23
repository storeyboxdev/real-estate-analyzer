// Time value of money.
// All rates are per-period. A monthly analysis uses annualRate/12 and n in months.

export function fv(presentValue, ratePerPeriod, nPeriods) {
  return presentValue * Math.pow(1 + ratePerPeriod, nPeriods);
}

export function pv(futureValue, ratePerPeriod, nPeriods) {
  return futureValue / Math.pow(1 + ratePerPeriod, nPeriods);
}

// Level payment for an amortizing loan: PMT = P * i / (1 - (1+i)^-n)
export function pmt(principal, ratePerPeriod, nPeriods) {
  if (ratePerPeriod === 0) return principal / nPeriods;
  const i = ratePerPeriod;
  return (principal * i) / (1 - Math.pow(1 + i, -nPeriods));
}

// Net present value. cashFlows[0] is t=0 (typically a negative initial outlay).
export function npv(ratePerPeriod, cashFlows) {
  let total = 0;
  for (let t = 0; t < cashFlows.length; t++) {
    total += cashFlows[t] / Math.pow(1 + ratePerPeriod, t);
  }
  return total;
}

// Modified internal rate of return. Unlike IRR, MIRR has a unique solution for
// any cash-flow series with at least one outflow and one inflow, because it
// doesn't use the same rate for both sides — negative flows (outlays) are
// discounted to t=0 at `financeRate`, positives (returns) are compounded to
// t=n at `reinvestRate`, and MIRR is the single rate that bridges the two:
//
//   MIRR = (FV_positives / |PV_negatives|)^(1/n) − 1
//
// Matches Excel's MIRR(values, finance_rate, reinvest_rate) for standard inputs.
export function mirr(cashFlows, financeRate, reinvestRate) {
  if (!Array.isArray(cashFlows) || cashFlows.length < 2) return NaN;
  const n = cashFlows.length - 1;
  let fvPositives = 0;
  let pvNegatives = 0;
  for (let t = 0; t < cashFlows.length; t++) {
    const c = cashFlows[t];
    if (c > 0) fvPositives += c * Math.pow(1 + reinvestRate, n - t);
    else if (c < 0) pvNegatives += c / Math.pow(1 + financeRate, t);
  }
  if (fvPositives <= 0 || pvNegatives >= 0) return NaN;
  return Math.pow(fvPositives / -pvNegatives, 1 / n) - 1;
}

// Internal rate of return via bracketed bisection. Robust across the wide
// range of IRRs real-estate cash flows produce (including deeply negative
// rates when the stream barely recoups or under-recoups the initial outlay).
// Returns NaN when no sign change exists in the cash flows or no root sits
// within the search range.
export function irr(cashFlows, { tolerance = 1e-7, maxIterations = 100 } = {}) {
  const hasPositive = cashFlows.some((c) => c > 0);
  const hasNegative = cashFlows.some((c) => c < 0);
  if (!hasPositive || !hasNegative) return NaN;

  const f = (r) => {
    let total = 0;
    for (let t = 0; t < cashFlows.length; t++) total += cashFlows[t] / Math.pow(1 + r, t);
    return total;
  };

  // Find a sign-change bracket. -0.999 keeps us above the (1+r) pole.
  let lo = -0.999;
  let hi = 1.0;
  let flo = f(lo);
  let fhi = f(hi);
  if (flo * fhi > 0) {
    // Broaden the upper bound until we straddle a root.
    for (const cand of [2, 5, 10, 50, 200, 1000]) {
      fhi = f(cand);
      if (flo * fhi < 0) { hi = cand; break; }
    }
    if (flo * fhi > 0) return NaN;
  }

  // Bisection: keep halving until |NPV| is below tolerance, or the bracket
  // shrinks past float precision. Iteration cap is lifted so extreme streams
  // (very negative IRRs) still converge fully.
  for (let iter = 0; iter < Math.max(maxIterations, 200); iter++) {
    const mid = (lo + hi) / 2;
    const fm = f(mid);
    if (Math.abs(fm) < tolerance) return mid;
    if (hi - lo < 1e-12) return mid;
    if (flo * fm < 0) { hi = mid; fhi = fm; } else { lo = mid; flo = fm; }
  }
  return (lo + hi) / 2;
}
