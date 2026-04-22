# real-estate-analyzer

Buy-and-hold real estate investing analysis — hand-written financial formulas,
per-property scenarios with history, and Excel/PDF reports.

> **Status:** Phases 1 (formula core) and 2 (SQLite persistence + CLI) are
> live. No UI or report export yet — see the roadmap below.

## What's in here today

A framework-free JavaScript library that computes the metrics you'll find in
most buy-and-hold investing books, plus a local SQLite store and a CLI to
drive it:

- **Time value of money** — `fv`, `pv`, `pmt`, `npv`, `irr`
- **Mortgage amortization** — monthly payment, full schedule, remaining balance, total interest
- **Cash flow** — gross scheduled income, effective gross income, operating expenses, NOI, annual cash flow
- **Returns** — cap rate, cash-on-cash, DSCR, GRM
- **Analysis orchestrator** — one call that takes a scenario's inputs and returns every metric above, validated by [zod](https://zod.dev/) and with pass/fail flags against configurable hurdle rates
- **Local store** — SQLite database of properties, named scenarios per property, and an append-only revision log so you can re-run the numbers when a price drops and keep the history
- **CLI** — add/list properties, create and update scenarios against inputs JSON, print metrics, browse revision history

Closing costs can be expressed as a % of price, a flat per-unit amount, or
both (they'll be summed).

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

## Quick example — as a library

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

## Quick example — from the CLI

```bash
# DB defaults to ./data.sqlite; override with --db or $REAL_ESTATE_DB.
npm run cli -- settings show
npm run cli -- property add "123 Main St" --units 1 --notes "duplex lead"
npm run cli -- scenario add 1 asking --current --inputs examples/sample-inputs.json

# A week later the seller drops the price — edit inputs JSON and re-run:
npm run cli -- scenario update 1 --inputs examples/sample-inputs.json --note "seller dropped 15k"

npm run cli -- scenario show 1       # latest metrics
npm run cli -- scenario history 1    # every revision with cap/CoC/cash flow
```

Run `npm run cli -- --help` for the full command list.

## Project layout

```
src/
  core/                 pure JS — shared across Electron and future web UI
    formulas/           tvm, amortization, cashflow, returns
    analysis/           analyze() — single entry point
    models/             zod schemas (single source of truth for input shape)
  db/                   SQLite schema, migrations, repositories
    repositories/       settings, properties, scenarios, revisions
  cli.js                command-line interface over the repositories
examples/               sample scenario inputs JSON
tests/                  vitest suite — 64 tests and counting
```

`src/main/`, `src/renderer/`, and `src/reports/` will appear as later phases
land.

## Roadmap

| Phase | Scope |
|---|---|
| 1 ✅ | Formula core + zod schemas + vitest golden tests |
| 2 ✅ | SQLite schema, repositories, settings, minimal CLI |
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
