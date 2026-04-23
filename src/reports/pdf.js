import PDFDocument from 'pdfkit';
import { usd, pct, num } from './context.js';

const GOOD = '#1f8a44';
const BAD = '#c0392b';
const MUTED = '#666666';
const ACCENT = '#2a6cdf';

// Builds a one-page PDF summary. Resolves to a Buffer.
export function buildPdf(ctx) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(20).fillColor('black').text(ctx.property.address, { continued: false });
    doc
      .fontSize(10)
      .fillColor(MUTED)
      .text(
        `${ctx.property.property_type === 'sfr' ? 'Single-family' : 'Multi-family'} · ` +
          `${ctx.property.units} unit(s) · Scenario: ${ctx.scenario.name}` +
          (ctx.scenario.is_current ? ' (current)' : ''),
      );
    doc.text(`Generated ${ctx.generatedAt.toISOString().slice(0, 19).replace('T', ' ')}`);
    doc.moveDown(0.5);
    hr(doc);

    // Two-column grid of key metrics
    section(doc, 'Financing');
    kv(doc, [
      ['Purchase price', usd(ctx.inputs.purchasePrice)],
      ['Down payment', usd(ctx.outputs.downPayment)],
      ['Loan amount', usd(ctx.outputs.loanAmount)],
      ['Interest rate', pct(ctx.inputs.interestRate)],
      ['Loan term', `${ctx.inputs.loanTermYears} years`],
      ['Closing costs', usd(ctx.outputs.closingCosts)],
      ['Total cash invested', usd(ctx.outputs.totalCashInvested)],
      ['Monthly P&I', usd(ctx.outputs.monthlyPayment, { detailed: true })],
    ]);

    section(doc, 'Income & Expenses');
    kv(doc, [
      ['Gross scheduled income', usd(ctx.outputs.grossScheduledIncome)],
      ['Effective gross income', usd(ctx.outputs.effectiveGrossIncome)],
      ['Operating expenses', usd(ctx.outputs.operatingExpenses)],
      ['NOI', usd(ctx.outputs.noi)],
      [
        'Annual cash flow',
        usd(ctx.outputs.annualCashFlow),
        ctx.outputs.annualCashFlow >= 0 ? GOOD : BAD,
      ],
      [
        'Monthly cash flow',
        usd(ctx.outputs.monthlyCashFlow),
        ctx.outputs.monthlyCashFlow >= 0 ? GOOD : BAD,
      ],
    ]);

    section(doc, 'Returns vs. Hurdles');
    kv(doc, [
      [
        'Cap rate',
        pct(ctx.outputs.capRate) + (ctx.outputs.meetsCapRate ? '  ✓' : '  ✗'),
        ctx.outputs.meetsCapRate ? GOOD : BAD,
      ],
      [
        'Cash-on-cash',
        pct(ctx.outputs.cocReturn) + (ctx.outputs.meetsCoCReturn ? '  ✓' : '  ✗'),
        ctx.outputs.meetsCoCReturn ? GOOD : BAD,
      ],
      [
        'DSCR',
        Number.isFinite(ctx.outputs.dscr) ? num(ctx.outputs.dscr) : String(ctx.outputs.dscr),
        ctx.outputs.dscr >= 1 ? GOOD : BAD,
      ],
      ['GRM', num(ctx.outputs.grm)],
    ]);

    // Break down the single "Operating expenses" line above so the reader can
    // see what was assumed. Variable rates apply to EGI; fixed items are annual $.
    const i = ctx.inputs;
    section(doc, 'Operating assumptions');
    const assumptionRows = [
      ['Vacancy', pct(i.vacancyPct)],
      ['Property management', pct(i.managementPct)],
      ['Maintenance', pct(i.maintenancePct)],
      ['CapEx reserves', pct(i.capexPct)],
      ['Taxes (annual)', usd(i.taxesAnnual)],
      ['Insurance (annual)', usd(i.insuranceAnnual)],
    ];
    if (i.hoaAnnual) assumptionRows.push(['HOA (annual)', usd(i.hoaAnnual)]);
    if (i.utilitiesAnnual) assumptionRows.push(['Utilities (annual)', usd(i.utilitiesAnnual)]);
    if (i.otherOpexAnnual) assumptionRows.push(['Other opex (annual)', usd(i.otherOpexAnnual)]);
    if (i.rehabBudget) assumptionRows.push(['Repairs until rentable', usd(i.rehabBudget)]);
    if (i.initialMissedRent)
      assumptionRows.push(['Missed rent during setup', usd(i.initialMissedRent)]);
    kv(doc, assumptionRows);

    doc.moveDown(0.5);
    hr(doc);
    doc
      .fontSize(8)
      .fillColor(MUTED)
      .text(
        'Pass/fail flags reflect your configured hurdle rates. Variable rates apply to effective gross income. See the Assumptions sheet of the Excel export for the full input list.',
        { align: 'left' },
      );

    doc.end();
  });
}

function hr(doc) {
  const y = doc.y;
  doc
    .strokeColor('#d0d0d0')
    .lineWidth(0.5)
    .moveTo(doc.page.margins.left, y)
    .lineTo(doc.page.width - doc.page.margins.right, y)
    .stroke();
  doc.moveDown(0.3);
}

function section(doc, label) {
  doc.moveDown(0.3);
  doc.fontSize(11).fillColor(ACCENT).text(label.toUpperCase(), { characterSpacing: 1 });
  doc.moveDown(0.2);
}

function kv(doc, rows) {
  const leftX = doc.page.margins.left;
  const colW = (doc.page.width - leftX - doc.page.margins.right) / 2;
  doc.fontSize(10);
  for (let i = 0; i < rows.length; i += 2) {
    const y = doc.y;
    renderPair(doc, rows[i], leftX, y, colW);
    if (rows[i + 1]) renderPair(doc, rows[i + 1], leftX + colW, y, colW);
    doc.moveDown(0.4);
  }
}

function renderPair(doc, [label, value, color], x, y, width) {
  doc.fillColor(MUTED).text(label, x, y, { width: width * 0.55, continued: false });
  doc
    .fillColor(color || 'black')
    .text(value, x + width * 0.55, y, { width: width * 0.45, align: 'left' });
}
