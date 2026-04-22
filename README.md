# real-estate-analyzer

Buy-and-hold real estate investing analysis — hand-written financial formulas,
per-property scenarios with history, and Excel/PDF reports.

> **Status:** Phases 1 (formula core), 2 (SQLite persistence + CLI), 3
> (Electron desktop UI), and 4 (Excel/PDF/Markdown export) are live. See the
> roadmap below.

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
- **Electron desktop app** — property list, property detail page with scenario tabs, minimal-with-advanced scenario form, live metrics panel with pass/fail flags against your hurdle rates, and a settings page
- **Reports** — export any scenario's latest revision as an Excel workbook (Summary + full amortization + Assumptions sheets), a one-page PDF summary, or a Markdown file. Available from the UI (Export buttons) or the CLI (`report <scenarioId> --format ...`).

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

npm run cli -- report 1 --format excel --out asking.xlsx
npm run cli -- report 1 --format pdf   --out asking.pdf
npm run cli -- report 1 --format md    --out asking.md
```

Run `npm run cli -- --help` for the full command list.

## Running the desktop app

```bash
npm run dev      # hot-reloading Electron dev mode
npm run build    # production bundle in out/
npm start        # run the built app
```

The app stores its SQLite database in your OS user-data directory (e.g.
`%APPDATA%/real-estate-analyzer/real-estate-analyzer.sqlite` on Windows), so
it doesn't collide with the CLI's `./data.sqlite`.

**About the native module rebuild:** `better-sqlite3` is a native addon and
needs ABI-matched binaries. `pretest` / `predev` / `prebuild` hooks rebuild
it automatically for the right runtime (Node for tests/CLI, Electron for the
desktop app). You can also run `npm run rebuild:node` or `npm run
rebuild:electron` manually if you switch contexts.

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
  main/                 Electron main process + IPC handlers
  preload/              contextBridge exposing window.api to the renderer
  renderer/             React UI
    src/pages/          PropertyList, PropertyDetail, Settings
    src/components/     ScenarioForm, MetricsPanel
  reports/              Excel, PDF, and Markdown builders (framework-free)
examples/               sample scenario inputs JSON
tests/                  vitest suite — 75 tests and counting
```

## Roadmap

| Phase | Scope |
|---|---|
| 1 ✅ | Formula core + zod schemas + vitest golden tests |
| 2 ✅ | SQLite schema, repositories, settings, minimal CLI |
| 3 ✅ | Electron shell, property list, entry form, results panel |
| 4 ✅ | Excel (.xlsx), PDF, and Markdown report generators |
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
