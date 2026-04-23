# real-estate-analyzer

Buy-and-hold real estate investing analysis — hand-written financial formulas,
per-property scenarios with history, and Excel/PDF reports.

> **Status:** Phases 1–7 are live. The core, persistence, Electron UI,
> Excel/PDF/Markdown export, revision history, scenario comparison,
> paste-from-listing import, and long-term projections (IRR, MIRR, capital
> accumulation) all work today.

## What's in here today

A framework-free JavaScript library that computes the metrics you'll find in
most buy-and-hold investing books, plus a local SQLite store and a CLI to
drive it:

- **Time value of money** — `fv`, `pv`, `pmt`, `npv`, `irr`, `mirr`
- **Mortgage amortization** — monthly payment, full schedule, remaining balance, total interest
- **Cash flow** — gross scheduled income, effective gross income, operating expenses, NOI, annual cash flow
- **Returns** — cap rate, cash-on-cash, DSCR, GRM
- **Analysis orchestrator** — one call that takes a scenario's inputs and returns every metric above, validated by [zod](https://zod.dev/) and with pass/fail flags against configurable hurdle rates
- **Local store** — SQLite database of properties, named scenarios per property, and an append-only revision log so you can re-run the numbers when a price drops and keep the history
- **CLI** — add/list properties, create and update scenarios against inputs JSON, print metrics, browse revision history
- **Electron desktop app** — property list, property detail page with scenario tabs, minimal-with-advanced scenario form, live metrics panel with pass/fail flags against your hurdle rates, and a settings page
- **Reports** — export any scenario's latest revision as an Excel workbook (Summary + full amortization + Assumptions sheets), a one-page PDF summary, or a Markdown file. Available from the UI (Export buttons) or the CLI (`report <scenarioId> --format ...`).
- **Revision history & comparison** — click "Show history" on a scenario to see the timeline of revisions with their headline metrics and "restore these inputs" for any earlier revision. When a property has two or more scenarios, the "Compare" tab shows them side by side with best/worst flags per metric (cap rate, CoC, DSCR, cash flow, GRM, total cash invested, monthly payment).
- **Listing paste import** — paste raw text copied from a Zillow/Redfin/Trulia/MLS listing page, and the app pulls out address, property type, unit count (with duplex/triplex/fourplex inference), price, rent estimate, annual taxes, HOA, and beds/baths/sqft. Fields are fully editable in the preview before you create the property. No scraping — the app never contacts Zillow; you control what text comes in.
- **Long-term projection** — optional expander on the scenario form that adds a multi-year pro forma. Configure hold period, appreciation %, rent growth %, expense growth %, and whether to model a sale at exit (with configurable selling cost). Each year can have its cash flow overridden individually to model partial-year ramp-ups, big CapEx events, refinances, or worst-case years. Results include **IRR**, **MIRR** (with configurable finance and reinvestment rates), year-by-year equity (capital accumulation), total equity built, and net sale proceeds. Surfaces in the metrics panel, compare table, Excel (new Projection sheet), PDF, and Markdown.

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

## Using the app

A walkthrough from first launch to multi-scenario analysis. All of this
works from the desktop UI; the CLI mirrors it for the same flow at the
terminal (see "Quick example — from the CLI" above).

### 1. Set your defaults once (Settings tab)

Open **Settings** in the top bar. Fill in your current mortgage rate and
your hurdle rates — cap rate and cash-on-cash thresholds the app will use
to flag each deal pass or fail. The other fields (default down payment,
loan term, closing cost %, closing cost per unit, vacancy, management,
maintenance, capex) pre-populate the scenario form when you create a new
scenario, so you don't have to retype them for every property. Click
**Save**. These values are stored in the local DB and persist across
sessions; change them any time — existing scenarios keep the values they
were analyzed with.

### 2. Add a property (Properties tab)

You have two entry points:

- **+ Add property** — enter the address, set **Type** (single-family or
  multi-family), set **Units**, and optionally add notes. Click **Create**.
- **Import from paste** — copy the page text from a listing in your browser
  and paste it here. The app parses address, property type, unit count
  (including duplex/triplex/fourplex inference), price, rent estimate,
  taxes, HOA, and beds/baths/sqft. Review the preview, fix anything that
  looks wrong, and click **Create property with this draft** — you land on
  the new property's detail page with the new-scenario form already open
  and pre-populated with the price, rent, and taxes that were parsed.
  Nothing is sent to any website; the parser runs locally on whatever text
  you paste in.

Either way, the property appears in the list; click its row to open it.

### 3. Create your first scenario

A scenario is a named set of inputs attached to a property ("asking",
"my offer", "after rate drop", etc.). On the property page, click
**+ New scenario**:

- Enter a **Scenario name**.
- Fill the **Minimal inputs**: purchase price, interest rate.
- Fill one **monthly rent** per unit (use **+ Add unit** if you need more
  than the property has defined).
- Enter **Annual taxes** and **Annual insurance** — these are the two
  fixed expenses most underwriting books treat as required inputs.
- Click **Advanced** to override any default (down payment, loan term,
  closing costs as % *and/or* $/unit, rehab budget, vacancy, management,
  maintenance, capex, HOA, utilities, other opex, other monthly income).
- Click **Create scenario**.

The first scenario on a property is automatically marked **current**.

### 4. Read the metrics panel

After saving, the scenario view shows three grouped metric blocks:

- **Financing** — loan amount, down payment, closing costs, total cash
  invested, monthly P&I, annual debt service.
- **Income & Expenses** — GSI, EGI, operating expenses, NOI, annual and
  monthly cash flow (green if ≥ 0, red if negative).
- **Returns vs. Hurdles** — cap rate, cash-on-cash, DSCR, GRM. Cap rate
  and CoC get a ✓ or ✗ depending on your Settings hurdle values; DSCR is
  green when ≥ 1 (the property covers its mortgage from operations).

### 5. Re-run when something changes (price drop, rate change, new info)

Open the scenario and click **Edit / update**. The form reloads with the
latest revision's inputs pre-filled. Change whatever moved — typically
the purchase price or the interest rate — and click **Save revision**.
The app appends a *new revision* rather than overwriting, so the old
numbers stay in the history. The scenario view immediately shows the
new metrics.

### 6. Inspect the history

Click **Show history** below the metrics panel. Every revision is listed
newest-first with the headline numbers (cap, CoC, DSCR, annual cash flow)
and any note. Click a row to expand the core inputs and outputs for that
revision. For earlier revisions, click **Restore these inputs** to append
a fresh revision using those inputs — useful if you talked yourself out of
an offer and want to revisit it without losing the current revision.

### 7. Compare scenarios side-by-side

Create a second scenario on the same property ("my offer"). Once a
property has two or more scenarios, a **Compare** tab appears. Click it
to see every scenario's latest revision in columns with the best value
highlighted green and the worst red for each metric (each metric knows
whether higher or lower is better). Use the checkboxes to include or
exclude scenarios from the comparison.

### 8. Export a report

With a scenario open, use the **Export: Excel / PDF / Markdown** buttons
below the metrics. A save dialog opens with a pre-filled filename based
on the address + scenario name. Choose where to save it.

- **Excel** — three sheets: Summary (headline metrics + section colors),
  Amortization (month-by-month schedule for the full loan term), and
  Assumptions (every input used).
- **PDF** — a one-page letter-sized summary good for sharing or filing.
- **Markdown** — a plain-text version with tables, easy to paste into
  notes or email.

### 9. Update globals mid-session and re-run

Change a hurdle rate or the current mortgage rate on the Settings page at
any time. Hurdle changes take effect immediately on the pass/fail flags
for new or re-saved revisions. (Existing saved revisions keep the
flags that were computed when they were saved — re-edit and save a
revision to re-evaluate against the new hurdles.)

### The same flow from the CLI

Every step above has a CLI equivalent under `npm run cli -- --help`. The
desktop app and the CLI operate on separate databases by default (the
app writes to your OS user-data directory; the CLI writes to
`./data.sqlite`), so you can use either without the other's state
getting in the way. Point them at the same file with `--db <path>` if
you want to share.

## Project layout

```
src/
  core/                 pure JS — shared across Electron and future web UI
    formulas/           tvm, amortization, cashflow, returns
    analysis/           analyze() — single entry point, plus compare()
    models/             zod schemas (single source of truth for input shape)
    parsers/            listingPaste.js — extract a property + scenario draft from pasted text
  db/                   SQLite schema, migrations, repositories
    repositories/       settings, properties, scenarios, revisions
  cli.js                command-line interface over the repositories
  main/                 Electron main process + IPC handlers
  preload/              contextBridge exposing window.api to the renderer
  renderer/             React UI
    src/pages/          PropertyList, PropertyDetail, Settings
    src/components/     ScenarioForm, MetricsPanel, RevisionHistory, ScenarioCompare, ListingPasteDialog
  reports/              Excel, PDF, and Markdown builders (framework-free)
examples/               sample scenario inputs JSON
tests/                  vitest suite — 92 tests and counting
```

## Roadmap

| Phase | Scope |
|---|---|
| 1 ✅ | Formula core + zod schemas + vitest golden tests |
| 2 ✅ | SQLite schema, repositories, settings, minimal CLI |
| 3 ✅ | Electron shell, property list, entry form, results panel |
| 4 ✅ | Excel (.xlsx), PDF, and Markdown report generators |
| 5 ✅ | Revision history UI and side-by-side scenario comparison |
| 6 ✅ | Listing paste import (Zillow/Redfin/Trulia/MLS text → pre-filled property + scenario draft) |

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
