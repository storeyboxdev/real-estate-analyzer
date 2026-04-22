# real-estate-analyzer

Buy-and-hold real estate investing analysis — hand-written financial formulas,
per-property scenarios with history, and Excel/PDF reports.

> **Status:** early scaffolding. Phase 1 (the pure-JS formula core + tests) is
> in place. No UI, database, or reports yet — see the roadmap below.

## What's in here today

A framework-free JavaScript library that computes the metrics you'll find in
most buy-and-hold investing books:

- **Time value of money** — `fv`, `pv`, `pmt`, `npv`, `irr`
- **Mortgage amortization** — monthly payment, full schedule, remaining balance, total interest
- **Cash flow** — gross scheduled income, effective gross income, operating expenses, NOI, annual cash flow
- **Returns** — cap rate, cash-on-cash, DSCR, GRM
- **Analysis orchestrator** — one call that takes a scenario's inputs and returns every metric above, validated by [zod](https://zod.dev/) and with pass/fail flags against configurable hurdle rates

Everything in `src/core/` is pure JS with zero Electron or Node-only
dependencies — so the same code will back the Electron desktop app and a web
version later without a rewrite.

## Requirements

- Node.js 20+ (developed against 24)

## Getting started

```bash
npm install
npm test          # runs the vitest suite
npm run test:watch
```

## Quick example

```js
import { analyze } from './src/core/analysis/analyze.js';

const result = analyze({
  purchasePrice: 200_000,
  downPaymentPct: 0.25,
  loanTermYears: 30,
  interestRate: 0.07,
  unitRents: [1800],              // one monthly rent per unit
  taxesAnnual: 3000,
  insuranceAnnual: 1200,
  // everything else falls back to sensible defaults (vacancy 5%, mgmt 8%, etc.)
});

console.log(result.capRate, result.cocReturn, result.dscr);
```

## Project layout

```
src/
  core/                 pure JS — shared across Electron and future web UI
    formulas/           tvm, amortization, cashflow, returns
    analysis/           analyze() — single entry point
    models/             zod schemas (single source of truth for input shape)
tests/core/             vitest suite, 38 tests and counting
```

`src/main/`, `src/renderer/`, `src/db/`, and `src/reports/` will appear as
later phases land.

## Roadmap

| Phase | Scope |
|---|---|
| 1 ✅ | Formula core + zod schemas + vitest golden tests |
| 2 | SQLite schema, repositories, settings, minimal CLI |
| 3 | Electron shell, property list, entry form, results panel |
| 4 | Excel (.xlsx) and PDF report generators |
| 5 | Revision history UI and side-by-side scenario comparison |
| Later | Zillow listing import |

The full plan lives in
[`plans/i-want-to-build-deep-sutherland.md`](https://github.com/storeyboxdev/real-estate-analyzer)
(local) — architecture, data model, and rationale.

## Conventions

- All rates are decimals (7% → `0.07`).
- All monetary inputs are in the same currency; no FX handling.
- All time-value math uses the period implied by the caller (monthly for
  mortgages, annual elsewhere).
- Validation happens at the `analyze()` boundary — downstream formulas trust
  their inputs.
