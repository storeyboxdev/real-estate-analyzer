// Per-metric higher-is-better direction. A null metric is skipped in extrema.
const METRICS = [
  { key: 'capRate', label: 'Cap rate', fmt: 'pct', better: 'higher' },
  { key: 'cocReturn', label: 'Cash-on-cash', fmt: 'pct', better: 'higher' },
  { key: 'dscr', label: 'DSCR', fmt: 'num', better: 'higher' },
  { key: 'noi', label: 'NOI (annual)', fmt: 'usd', better: 'higher' },
  { key: 'annualCashFlow', label: 'Annual cash flow', fmt: 'usd', better: 'higher' },
  { key: 'monthlyCashFlow', label: 'Monthly cash flow', fmt: 'usd', better: 'higher' },
  { key: 'totalCashInvested', label: 'Total cash invested', fmt: 'usd', better: 'lower' },
  { key: 'monthlyPayment', label: 'Monthly P&I', fmt: 'usd', better: 'lower' },
  { key: 'grm', label: 'GRM', fmt: 'num', better: 'lower' },
];

// Takes an array of comparison entries, each { label, outputs }, and returns
// { rows: [{ metric, label, fmt, values: [{ value, best, worst }] }] }. Values
// align with the input entries by index. "best" / "worst" are only set when
// there is more than one finite value — so single-entry compares still render.
export function compareScenarios(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return { entries: [], rows: [] };
  }

  const rows = METRICS.map((m) => {
    const values = entries.map((e) => {
      const raw = e.outputs?.[m.key];
      return { value: raw, finite: Number.isFinite(raw) };
    });
    const finiteValues = values.filter((v) => v.finite).map((v) => v.value);
    if (finiteValues.length > 1) {
      const best = m.better === 'higher' ? Math.max(...finiteValues) : Math.min(...finiteValues);
      const worst = m.better === 'higher' ? Math.min(...finiteValues) : Math.max(...finiteValues);
      const allEqual = best === worst;
      for (const v of values) {
        if (!v.finite || allEqual) continue;
        if (v.value === best) v.best = true;
        else if (v.value === worst) v.worst = true;
      }
    }
    return { metric: m.key, label: m.label, fmt: m.fmt, better: m.better, values };
  });

  return { entries, rows };
}

export { METRICS as COMPARE_METRICS };
