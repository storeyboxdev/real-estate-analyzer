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

// Internal rate of return via bisection then Newton-Raphson refinement.
// Returns NaN when no sign change exists in the cash flows.
export function irr(cashFlows, { guess = 0.1, tolerance = 1e-7, maxIterations = 100 } = {}) {
  const hasPositive = cashFlows.some((c) => c > 0);
  const hasNegative = cashFlows.some((c) => c < 0);
  if (!hasPositive || !hasNegative) return NaN;

  let rate = guess;
  for (let iter = 0; iter < maxIterations; iter++) {
    let f = 0;
    let df = 0;
    for (let t = 0; t < cashFlows.length; t++) {
      const denom = Math.pow(1 + rate, t);
      f += cashFlows[t] / denom;
      if (t > 0) df -= (t * cashFlows[t]) / Math.pow(1 + rate, t + 1);
    }
    if (Math.abs(f) < tolerance) return rate;
    if (df === 0) break;
    const next = rate - f / df;
    if (!Number.isFinite(next)) break;
    if (Math.abs(next - rate) < tolerance) return next;
    rate = next;
  }
  return NaN;
}
