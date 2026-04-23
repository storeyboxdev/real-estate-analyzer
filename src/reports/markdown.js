import { usd, pct, num } from './context.js';

export function buildMarkdown(ctx) {
  const flag = (ok) => (ok ? '✓' : '✗');
  const lines = [];
  lines.push(`# ${ctx.property.address}`);
  lines.push('');
  lines.push(
    `*${ctx.property.property_type === 'sfr' ? 'Single-family' : 'Multi-family'} · ` +
      `${ctx.property.units} unit(s) · Scenario: **${ctx.scenario.name}**` +
      `${ctx.scenario.is_current ? ' (current)' : ''}*`,
  );
  lines.push('');
  lines.push(`Generated ${ctx.generatedAt.toISOString()}`);
  lines.push('');

  lines.push('## Financing');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('|---|---|');
  lines.push(`| Purchase price | ${usd(ctx.inputs.purchasePrice)} |`);
  lines.push(`| Down payment | ${usd(ctx.outputs.downPayment)} |`);
  lines.push(`| Loan amount | ${usd(ctx.outputs.loanAmount)} |`);
  lines.push(`| Interest rate | ${pct(ctx.inputs.interestRate)} |`);
  lines.push(`| Loan term | ${ctx.inputs.loanTermYears} years |`);
  lines.push(`| Closing costs | ${usd(ctx.outputs.closingCosts)} |`);
  lines.push(`| Total cash invested | ${usd(ctx.outputs.totalCashInvested)} |`);
  lines.push(`| Monthly P&I | ${usd(ctx.outputs.monthlyPayment, { detailed: true })} |`);
  lines.push('');

  lines.push('## Income & Expenses');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('|---|---|');
  lines.push(`| Gross scheduled income | ${usd(ctx.outputs.grossScheduledIncome)} |`);
  lines.push(`| Effective gross income | ${usd(ctx.outputs.effectiveGrossIncome)} |`);
  lines.push(`| Operating expenses | ${usd(ctx.outputs.operatingExpenses)} |`);
  lines.push(`| NOI | ${usd(ctx.outputs.noi)} |`);
  lines.push(`| Annual cash flow | ${usd(ctx.outputs.annualCashFlow)} |`);
  lines.push(`| Monthly cash flow | ${usd(ctx.outputs.monthlyCashFlow)} |`);
  lines.push('');

  lines.push('## Returns vs. Hurdles');
  lines.push('');
  lines.push('| Metric | Value | |');
  lines.push('|---|---|---|');
  lines.push(
    `| Cap rate | ${pct(ctx.outputs.capRate)} | ${flag(ctx.outputs.meetsCapRate)} |`,
  );
  lines.push(
    `| Cash-on-cash | ${pct(ctx.outputs.cocReturn)} | ${flag(ctx.outputs.meetsCoCReturn)} |`,
  );
  lines.push(
    `| DSCR | ${Number.isFinite(ctx.outputs.dscr) ? num(ctx.outputs.dscr) : String(ctx.outputs.dscr)} | ${flag(ctx.outputs.dscr >= 1)} |`,
  );
  lines.push(`| GRM | ${num(ctx.outputs.grm)} | |`);
  lines.push('');

  lines.push('## Assumptions');
  lines.push('');
  const i = ctx.inputs;
  if (i.rehabBudget) lines.push(`- Repairs until rentable: ${usd(i.rehabBudget)}`);
  if (i.initialMissedRent) lines.push(`- Missed rent during setup: ${usd(i.initialMissedRent)}`);
  lines.push(`- Vacancy: ${pct(i.vacancyPct)}`);
  lines.push(`- Management: ${pct(i.managementPct)}`);
  lines.push(`- Maintenance: ${pct(i.maintenancePct)}`);
  lines.push(`- CapEx: ${pct(i.capexPct)}`);
  lines.push(`- Taxes (annual): ${usd(i.taxesAnnual)}`);
  lines.push(`- Insurance (annual): ${usd(i.insuranceAnnual)}`);
  if (i.hoaAnnual) lines.push(`- HOA (annual): ${usd(i.hoaAnnual)}`);
  if (i.utilitiesAnnual) lines.push(`- Utilities (annual): ${usd(i.utilitiesAnnual)}`);
  if (i.otherOpexAnnual) lines.push(`- Other opex (annual): ${usd(i.otherOpexAnnual)}`);
  if (i.otherIncomeMonthly)
    lines.push(`- Other monthly income: ${usd(i.otherIncomeMonthly)}`);
  lines.push(
    `- Rents: ${i.unitRents.map((r) => usd(r)).join(', ')}`,
  );
  lines.push('');

  // Long-term projection (only when the run produced one).
  const p = ctx.outputs.projection;
  if (p) {
    lines.push(`## Long-term projection (${p.years.length}-year hold)`);
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|---|---|');
    lines.push(`| IRR | ${Number.isFinite(p.irr) ? pct(p.irr) : 'n/a'} |`);
    lines.push(`| MIRR | ${Number.isFinite(p.mirr) ? pct(p.mirr) : 'n/a'} |`);
    lines.push(`| Equity at exit | ${usd(p.equityAtExit)} |`);
    lines.push(`| Total equity built | ${usd(p.totalEquityBuilt)} |`);
    if (p.netSaleProceeds !== null) {
      lines.push(`| Net sale proceeds | ${usd(p.netSaleProceeds)} |`);
    } else {
      lines.push(`| Sale | not included |`);
    }
    lines.push('');
    lines.push('| Year | Gross rent | NOI | Cash flow | Property value | Balance | Equity |');
    lines.push('|---|---|---|---|---|---|---|');
    for (const y of p.years) {
      const tag = y.overridden ? ' *' : '';
      lines.push(
        `| ${y.year}${tag} | ${usd(y.grossRent)} | ${usd(y.noi)} | ${usd(y.cashFlow)} | ${usd(y.propertyValue)} | ${usd(y.remainingBalance)} | ${usd(y.equity)} |`,
      );
    }
    if (p.years.some((y) => y.overridden)) {
      lines.push('');
      lines.push('*\\* year has a cash-flow override.*');
    }
    lines.push('');
  }

  return lines.join('\n');
}
