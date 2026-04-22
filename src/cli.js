#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import { openDb } from './db/db.js';
import { createRepos } from './db/repositories/index.js';
import { analyze } from './core/analysis/analyze.js';

const USAGE = `
real-estate-analyzer CLI

  Usage:  node src/cli.js <command> [options]

  Global options:
    --db <path>          SQLite file (default: ./data.sqlite, or \$REAL_ESTATE_DB)

  Settings:
    settings show
    settings set <key> <value>

  Properties:
    property add <address> [--type sfr|multifamily] [--units N] [--notes "..."]
    property list
    property show <id>
    property delete <id>

  Scenarios (a scenario belongs to a property):
    scenario add <propertyId> <name> [--current] --inputs <path.json>
    scenario list <propertyId>
    scenario update <scenarioId> --inputs <path.json> [--note "..."]
    scenario show <scenarioId>
    scenario history <scenarioId>
    scenario set-current <scenarioId>

  Inputs JSON shape: see src/core/models/inputs.js (ScenarioInputsSchema).
`;

function die(msg, code = 1) {
  console.error(msg);
  process.exit(code);
}

function fmtPct(n) {
  return Number.isFinite(n) ? (n * 100).toFixed(2) + '%' : String(n);
}
function fmtUsd(n) {
  return Number.isFinite(n) ? '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : String(n);
}

function loadInputs(p) {
  if (!p) die('--inputs <path.json> is required');
  const raw = fs.readFileSync(path.resolve(p), 'utf8');
  return JSON.parse(raw);
}

function printMetrics(outputs) {
  const rows = [
    ['Loan amount', fmtUsd(outputs.loanAmount)],
    ['Down payment', fmtUsd(outputs.downPayment)],
    ['Closing costs', fmtUsd(outputs.closingCosts)],
    ['Total cash invested', fmtUsd(outputs.totalCashInvested)],
    ['Monthly payment', fmtUsd(outputs.monthlyPayment)],
    ['Annual debt service', fmtUsd(outputs.annualDebtService)],
    ['', ''],
    ['Gross scheduled income', fmtUsd(outputs.grossScheduledIncome)],
    ['Effective gross income', fmtUsd(outputs.effectiveGrossIncome)],
    ['Operating expenses', fmtUsd(outputs.operatingExpenses)],
    ['NOI', fmtUsd(outputs.noi)],
    ['Annual cash flow', fmtUsd(outputs.annualCashFlow)],
    ['Monthly cash flow', fmtUsd(outputs.monthlyCashFlow)],
    ['', ''],
    ['Cap rate', fmtPct(outputs.capRate) + (outputs.meetsCapRate ? '  ✓' : '  ✗')],
    ['Cash-on-cash', fmtPct(outputs.cocReturn) + (outputs.meetsCoCReturn ? '  ✓' : '  ✗')],
    ['DSCR', Number.isFinite(outputs.dscr) ? outputs.dscr.toFixed(2) : String(outputs.dscr)],
    ['GRM', outputs.grm.toFixed(2)],
  ];
  for (const [k, v] of rows) {
    if (!k) console.log('');
    else console.log(k.padEnd(26) + ' ' + v);
  }
}

export function run(argv = process.argv.slice(2)) {
  if (argv.length === 0 || argv[0] === '-h' || argv[0] === '--help') {
    console.log(USAGE);
    return;
  }

  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    strict: false,
    options: {
      db: { type: 'string' },
      type: { type: 'string' },
      units: { type: 'string' },
      notes: { type: 'string' },
      current: { type: 'boolean' },
      inputs: { type: 'string' },
      note: { type: 'string' },
    },
  });

  const dbPath = values.db || process.env.REAL_ESTATE_DB || './data.sqlite';
  const db = openDb(dbPath);
  const repos = createRepos(db);
  repos.settings.seedDefaults();

  const [group, action, ...rest] = positionals;

  try {
    if (group === 'settings') return cmdSettings(action, rest, repos);
    if (group === 'property') return cmdProperty(action, rest, values, repos);
    if (group === 'scenario') return cmdScenario(action, rest, values, repos);
    die(`Unknown command: ${group}\n${USAGE}`);
  } finally {
    db.close();
  }
}

function cmdSettings(action, rest, repos) {
  if (action === 'show') {
    const s = repos.settings.parsed;
    for (const [k, v] of Object.entries(s)) console.log(k.padEnd(28) + ' ' + v);
    return;
  }
  if (action === 'set') {
    const [key, value] = rest;
    if (!key || value === undefined) die('Usage: settings set <key> <value>');
    // Try to parse as number/bool; fall back to string.
    let parsed = value;
    if (/^-?\d+(\.\d+)?$/.test(value)) parsed = Number(value);
    else if (value === 'true') parsed = true;
    else if (value === 'false') parsed = false;
    repos.settings.set(key, parsed);
    console.log(`${key} = ${parsed}`);
    return;
  }
  die('Usage: settings show | settings set <key> <value>');
}

function cmdProperty(action, rest, values, repos) {
  if (action === 'add') {
    const [address] = rest;
    if (!address) die('Usage: property add <address> [--type sfr|multifamily] [--units N] [--notes "..."]');
    const id = repos.properties.create({
      address,
      propertyType: values.type || 'sfr',
      units: values.units ? Number(values.units) : 1,
      notes: values.notes ?? null,
    });
    console.log(`Created property #${id}: ${address}`);
    return;
  }
  if (action === 'list') {
    const rows = repos.properties.list();
    if (rows.length === 0) {
      console.log('(no properties)');
      return;
    }
    for (const r of rows) {
      console.log(
        `#${r.id}`.padEnd(6) +
          r.property_type.padEnd(13) +
          ('x' + r.units).padEnd(5) +
          r.address +
          (r.notes ? '  — ' + r.notes : ''),
      );
    }
    return;
  }
  if (action === 'show') {
    const id = Number(rest[0]);
    const p = repos.properties.getById(id);
    if (!p) die(`Property #${id} not found`);
    console.log(p);
    const scens = repos.scenarios.listForProperty(id);
    console.log(`\nScenarios (${scens.length}):`);
    for (const s of scens) {
      console.log(`  #${s.id}  ${s.name}${s.is_current ? '  (current)' : ''}`);
    }
    return;
  }
  if (action === 'delete') {
    const id = Number(rest[0]);
    repos.properties.delete(id);
    console.log(`Deleted property #${id}`);
    return;
  }
  die('Usage: property add|list|show|delete');
}

function cmdScenario(action, rest, values, repos) {
  if (action === 'add') {
    const [propertyIdStr, name] = rest;
    const propertyId = Number(propertyIdStr);
    if (!propertyId || !name) {
      die('Usage: scenario add <propertyId> <name> [--current] --inputs <path.json>');
    }
    const inputs = loadInputs(values.inputs);
    const outputs = analyze(inputs, repos.settings.parsed);
    const scenarioId = repos.scenarios.create(propertyId, { name, isCurrent: !!values.current });
    repos.revisions.append(scenarioId, { inputs, outputs, note: values.note ?? null });
    console.log(`Created scenario #${scenarioId} "${name}" under property #${propertyId}`);
    printMetrics(outputs);
    return;
  }
  if (action === 'list') {
    const propertyId = Number(rest[0]);
    const rows = repos.scenarios.listForProperty(propertyId);
    if (rows.length === 0) {
      console.log('(no scenarios)');
      return;
    }
    for (const s of rows) {
      console.log(`#${s.id}`.padEnd(6) + s.name.padEnd(24) + (s.is_current ? '(current)' : ''));
    }
    return;
  }
  if (action === 'update') {
    const scenarioId = Number(rest[0]);
    if (!scenarioId) die('Usage: scenario update <scenarioId> --inputs <path.json> [--note "..."]');
    const s = repos.scenarios.getById(scenarioId);
    if (!s) die(`Scenario #${scenarioId} not found`);
    const inputs = loadInputs(values.inputs);
    const outputs = analyze(inputs, repos.settings.parsed);
    repos.revisions.append(scenarioId, { inputs, outputs, note: values.note ?? null });
    repos.scenarios.touch(scenarioId);
    console.log(`Appended revision to scenario #${scenarioId} "${s.name}"`);
    printMetrics(outputs);
    return;
  }
  if (action === 'show') {
    const scenarioId = Number(rest[0]);
    const s = repos.scenarios.getById(scenarioId);
    if (!s) die(`Scenario #${scenarioId} not found`);
    const latest = repos.revisions.latest(scenarioId);
    if (!latest) {
      console.log(`Scenario #${scenarioId} "${s.name}" has no revisions yet.`);
      return;
    }
    console.log(`Scenario #${scenarioId} "${s.name}"  (as of ${latest.created_at})`);
    printMetrics(latest.outputs);
    return;
  }
  if (action === 'history') {
    const scenarioId = Number(rest[0]);
    const list = repos.revisions.listForScenario(scenarioId);
    if (list.length === 0) {
      console.log('(no revisions)');
      return;
    }
    for (const r of list) {
      const o = r.outputs;
      console.log(
        `#${r.id}`.padEnd(5) +
          r.created_at +
          '  ' +
          'cap=' +
          fmtPct(o.capRate) +
          '  coc=' +
          fmtPct(o.cocReturn) +
          '  cf/yr=' +
          fmtUsd(o.annualCashFlow) +
          (r.note ? '  — ' + r.note : ''),
      );
    }
    return;
  }
  if (action === 'set-current') {
    const scenarioId = Number(rest[0]);
    repos.scenarios.setCurrent(scenarioId);
    console.log(`Scenario #${scenarioId} is now current for its property.`);
    return;
  }
  die('Usage: scenario add|list|update|show|history|set-current');
}

// Run when invoked directly (cross-platform path compare).
if (process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])) {
  run();
}
