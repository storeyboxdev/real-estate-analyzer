import { pmt } from './tvm.js';

// Monthly payment for a fully-amortizing fixed-rate mortgage.
export function monthlyPayment(principal, annualRate, termYears) {
  return pmt(principal, annualRate / 12, termYears * 12);
}

// Full month-by-month schedule. Each row: { month, payment, interest, principal, balance }.
export function schedule(principal, annualRate, termYears) {
  const i = annualRate / 12;
  const n = termYears * 12;
  const payment = monthlyPayment(principal, annualRate, termYears);
  const rows = [];
  let balance = principal;
  for (let m = 1; m <= n; m++) {
    const interest = balance * i;
    let principalPaid = payment - interest;
    // Final payment: snap residual balance to zero to kill floating-point drift.
    if (m === n) principalPaid = balance;
    balance = Math.max(0, balance - principalPaid);
    rows.push({ month: m, payment, interest, principal: principalPaid, balance });
  }
  return rows;
}

// Remaining balance after k payments — closed form, no iteration.
export function remainingBalance(principal, annualRate, termYears, paymentsMade) {
  const i = annualRate / 12;
  const n = termYears * 12;
  if (i === 0) return principal * (1 - paymentsMade / n);
  const p = pmt(principal, i, n);
  return principal * Math.pow(1 + i, paymentsMade) - p * ((Math.pow(1 + i, paymentsMade) - 1) / i);
}

export function totalInterest(principal, annualRate, termYears) {
  const payment = monthlyPayment(principal, annualRate, termYears);
  return payment * termYears * 12 - principal;
}
