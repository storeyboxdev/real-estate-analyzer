import { describe, it, expect } from 'vitest';
import {
  monthlyPayment,
  schedule,
  remainingBalance,
  totalInterest,
} from '../../src/core/formulas/amortization.js';

describe('monthlyPayment', () => {
  it('matches the $200k / 6% / 30yr standard', () => {
    expect(monthlyPayment(200000, 0.06, 30)).toBeCloseTo(1199.1011, 4);
  });
});

describe('schedule', () => {
  it('has one row per month of the term', () => {
    expect(schedule(200000, 0.06, 30)).toHaveLength(360);
  });

  it('pays the loan to zero on the final row', () => {
    const rows = schedule(200000, 0.06, 30);
    expect(rows[rows.length - 1].balance).toBe(0);
  });

  it('total principal repaid equals the original loan', () => {
    const rows = schedule(200000, 0.06, 30);
    const sum = rows.reduce((a, r) => a + r.principal, 0);
    expect(sum).toBeCloseTo(200000, 2);
  });

  it('interest + principal on each row equals the payment', () => {
    const rows = schedule(200000, 0.06, 30);
    const first = rows[0];
    expect(first.interest + first.principal).toBeCloseTo(first.payment, 4);
  });
});

describe('remainingBalance', () => {
  it('equals the principal before any payments', () => {
    expect(remainingBalance(200000, 0.06, 30, 0)).toBeCloseTo(200000, 4);
  });

  it('is ~0 after all payments', () => {
    expect(remainingBalance(200000, 0.06, 30, 360)).toBeCloseTo(0, 2);
  });

  it('agrees with the schedule at an interior point', () => {
    const rows = schedule(200000, 0.06, 30);
    expect(remainingBalance(200000, 0.06, 30, 120)).toBeCloseTo(rows[119].balance, 2);
  });
});

describe('totalInterest', () => {
  it('is positive and large for a 30-year mortgage', () => {
    const interest = totalInterest(200000, 0.06, 30);
    expect(interest).toBeGreaterThan(230000);
    expect(interest).toBeLessThan(232000);
  });
});
