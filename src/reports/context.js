// Bundles everything a report needs into one object so builders take a single arg.
export function buildReportContext({ property, scenario, revision, settings }) {
  if (!property) throw new Error('property is required');
  if (!scenario) throw new Error('scenario is required');
  if (!revision) throw new Error('revision is required');
  return {
    property,
    scenario,
    revision,
    settings: settings ?? {},
    inputs: revision.inputs,
    outputs: revision.outputs,
    generatedAt: new Date(),
  };
}

export function usd(n, opts = {}) {
  if (!Number.isFinite(n)) return String(n);
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: opts.detailed ? 2 : 0,
  });
}

export function pct(n, digits = 2) {
  if (!Number.isFinite(n)) return String(n);
  return (n * 100).toFixed(digits) + '%';
}

export function num(n, digits = 2) {
  if (!Number.isFinite(n)) return String(n);
  return n.toFixed(digits);
}
