import ExcelJS from 'exceljs';
import { schedule } from '../core/formulas/amortization.js';

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2A6CDF' } };
const SECTION_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EEF9' } };
const GOOD_FONT = { color: { argb: 'FF1F8A44' }, bold: true };
const BAD_FONT = { color: { argb: 'FFC0392B' }, bold: true };

export async function buildExcel(ctx) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'real-estate-analyzer';
  wb.created = ctx.generatedAt;

  addSummarySheet(wb, ctx);
  addAmortizationSheet(wb, ctx);
  addAssumptionsSheet(wb, ctx);

  return await wb.xlsx.writeBuffer();
}

function addSummarySheet(wb, ctx) {
  const ws = wb.addWorksheet('Summary');
  ws.columns = [{ width: 32 }, { width: 22 }];

  // Title block
  ws.mergeCells('A1:B1');
  const title = ws.getCell('A1');
  title.value = ctx.property.address;
  title.font = { size: 16, bold: true };

  ws.getCell('A2').value = 'Scenario';
  ws.getCell('B2').value = ctx.scenario.name + (ctx.scenario.is_current ? '  (current)' : '');
  ws.getCell('A3').value = 'Type';
  ws.getCell('B3').value =
    (ctx.property.property_type === 'sfr' ? 'Single-family' : 'Multi-family') +
    ` · ${ctx.property.units} unit(s)`;
  ws.getCell('A4').value = 'Generated';
  ws.getCell('B4').value = ctx.generatedAt;
  ws.getCell('B4').numFmt = 'yyyy-mm-dd hh:mm';

  section(ws, 6, 'Financing');
  const fin = [
    ['Purchase price', ctx.inputs.purchasePrice, '$'],
    ['Down payment', ctx.outputs.downPayment, '$'],
    ['Loan amount', ctx.outputs.loanAmount, '$'],
    ['Interest rate', ctx.inputs.interestRate, '%'],
    ['Loan term (years)', ctx.inputs.loanTermYears, 'n'],
    ['Closing costs', ctx.outputs.closingCosts, '$'],
    ['Rehab budget', ctx.inputs.rehabBudget, '$'],
    ['Total cash invested', ctx.outputs.totalCashInvested, '$'],
    ['Monthly P&I', ctx.outputs.monthlyPayment, '$'],
    ['Annual debt service', ctx.outputs.annualDebtService, '$'],
  ];
  writeKvRows(ws, 7, fin);

  const incStart = 7 + fin.length + 1;
  section(ws, incStart, 'Income & Expenses');
  const inc = [
    ['Gross scheduled income', ctx.outputs.grossScheduledIncome, '$'],
    ['Effective gross income', ctx.outputs.effectiveGrossIncome, '$'],
    ['Operating expenses', ctx.outputs.operatingExpenses, '$'],
    ['NOI', ctx.outputs.noi, '$'],
    ['Annual cash flow', ctx.outputs.annualCashFlow, '$'],
    ['Monthly cash flow', ctx.outputs.monthlyCashFlow, '$'],
  ];
  writeKvRows(ws, incStart + 1, inc);

  const retStart = incStart + 1 + inc.length + 1;
  section(ws, retStart, 'Returns vs. Hurdles');
  const ret = [
    ['Cap rate', ctx.outputs.capRate, '%', ctx.outputs.meetsCapRate],
    ['Cash-on-cash', ctx.outputs.cocReturn, '%', ctx.outputs.meetsCoCReturn],
    ['DSCR', ctx.outputs.dscr, 'n', ctx.outputs.dscr >= 1],
    ['GRM', ctx.outputs.grm, 'n', null],
  ];
  writeKvRows(ws, retStart + 1, ret);
}

function addAmortizationSheet(wb, ctx) {
  const ws = wb.addWorksheet('Amortization');
  ws.columns = [
    { header: 'Month', key: 'month', width: 8 },
    { header: 'Payment', key: 'payment', width: 14, style: { numFmt: '$#,##0.00' } },
    { header: 'Interest', key: 'interest', width: 14, style: { numFmt: '$#,##0.00' } },
    { header: 'Principal', key: 'principal', width: 14, style: { numFmt: '$#,##0.00' } },
    { header: 'Balance', key: 'balance', width: 16, style: { numFmt: '$#,##0.00' } },
  ];
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).fill = HEADER_FILL;

  const rows = schedule(ctx.outputs.loanAmount, ctx.inputs.interestRate, ctx.inputs.loanTermYears);
  for (const r of rows) ws.addRow(r);
  ws.views = [{ state: 'frozen', ySplit: 1 }];
}

function addAssumptionsSheet(wb, ctx) {
  const ws = wb.addWorksheet('Assumptions');
  ws.columns = [{ width: 34 }, { width: 16 }];

  ws.getCell('A1').value = 'All inputs (as of this revision)';
  ws.getCell('A1').font = { bold: true, size: 13 };
  ws.getCell('A1').fill = SECTION_FILL;
  ws.mergeCells('A1:B1');

  const i = ctx.inputs;
  const rows = [
    ['Purchase price', i.purchasePrice, '$'],
    ['Closing cost (% of price)', i.closingCostPct, '%'],
    ['Closing cost ($ per unit)', i.closingCostPerUnit, '$'],
    ['Rehab budget', i.rehabBudget, '$'],
    ['Down payment (% of price)', i.downPaymentPct, '%'],
    ['Loan term (years)', i.loanTermYears, 'n'],
    ['Interest rate', i.interestRate, '%'],
    ...i.unitRents.map((r, idx) => [`Unit ${idx + 1} monthly rent`, r, '$']),
    ['Other monthly income', i.otherIncomeMonthly, '$'],
    ['Vacancy', i.vacancyPct, '%'],
    ['Management', i.managementPct, '%'],
    ['Maintenance', i.maintenancePct, '%'],
    ['CapEx', i.capexPct, '%'],
    ['Taxes (annual)', i.taxesAnnual, '$'],
    ['Insurance (annual)', i.insuranceAnnual, '$'],
    ['HOA (annual)', i.hoaAnnual, '$'],
    ['Utilities (annual)', i.utilitiesAnnual, '$'],
    ['Other opex (annual)', i.otherOpexAnnual, '$'],
  ];
  writeKvRows(ws, 2, rows);
}

function section(ws, rowIdx, label) {
  ws.mergeCells(`A${rowIdx}:B${rowIdx}`);
  const cell = ws.getCell(`A${rowIdx}`);
  cell.value = label;
  cell.font = { bold: true, size: 12 };
  cell.fill = SECTION_FILL;
}

function writeKvRows(ws, startRow, rows) {
  for (let i = 0; i < rows.length; i++) {
    const [label, value, fmt, passFail] = rows[i];
    const r = startRow + i;
    ws.getCell(`A${r}`).value = label;
    const v = ws.getCell(`B${r}`);
    v.value = value;
    if (fmt === '$') v.numFmt = '$#,##0.00';
    else if (fmt === '%') v.numFmt = '0.00%';
    else v.numFmt = '#,##0.00';
    if (passFail === true) v.font = GOOD_FONT;
    else if (passFail === false) v.font = BAD_FONT;
  }
}
