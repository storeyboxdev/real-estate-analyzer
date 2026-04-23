import { describe, it, expect, beforeAll } from 'vitest';
import ExcelJS from 'exceljs';
import { analyze } from '../../src/core/analysis/analyze.js';
import { buildReportContext, buildExcel, buildPdf, buildMarkdown, buildReport } from '../../src/reports/index.js';

function makeCtx() {
  const inputs = {
    purchasePrice: 250000,
    closingCostPct: 0.03,
    closingCostPerUnit: 0,
    rehabBudget: 0,
    downPaymentPct: 0.25,
    loanTermYears: 30,
    interestRate: 0.0725,
    unitRents: [2100],
    otherIncomeMonthly: 0,
    vacancyPct: 0.05,
    managementPct: 0.08,
    maintenancePct: 0.05,
    capexPct: 0.05,
    taxesAnnual: 3200,
    insuranceAnnual: 1400,
    hoaAnnual: 0,
    utilitiesAnnual: 0,
    otherOpexAnnual: 0,
  };
  const outputs = analyze(inputs);
  return buildReportContext({
    property: { id: 1, address: '123 Test Ln', property_type: 'sfr', units: 1, notes: null },
    scenario: { id: 7, property_id: 1, name: 'asking', is_current: 1 },
    revision: { id: 42, scenario_id: 7, inputs, outputs, note: null, created_at: '2026-04-22 15:00:00' },
    settings: {},
  });
}

describe('markdown report', () => {
  const ctx = makeCtx();
  const md = buildMarkdown(ctx);

  it('contains the property address as H1', () => {
    expect(md).toMatch(/^# 123 Test Ln/m);
  });

  it('includes key metrics', () => {
    expect(md).toContain('Cap rate');
    expect(md).toContain('Cash-on-cash');
    expect(md).toContain('DSCR');
    expect(md).toContain('NOI');
  });

  it('includes the scenario name', () => {
    expect(md).toContain('asking');
  });
});

describe('pdf report', () => {
  it('produces a buffer whose header identifies a PDF', async () => {
    const buf = await buildPdf(makeCtx());
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(500);
    expect(buf.slice(0, 4).toString('ascii')).toBe('%PDF');
  });
});

describe('excel report', () => {
  let wb;
  beforeAll(async () => {
    const buf = await buildExcel(makeCtx());
    wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
  });

  it('has the three expected sheets', () => {
    const names = wb.worksheets.map((s) => s.name);
    expect(names).toEqual(['Summary', 'Amortization', 'Assumptions']);
  });

  it('Summary sheet carries the property address as its title', () => {
    const ws = wb.getWorksheet('Summary');
    expect(ws.getCell('A1').value).toBe('123 Test Ln');
  });

  it('Amortization sheet has 360 data rows for a 30-year term', () => {
    const ws = wb.getWorksheet('Amortization');
    // Row 1 is the header; rows 2..361 are the 360 payments. Balance is column E.
    expect(ws.rowCount).toBe(361);
    const finalBalance = Number(ws.getRow(361).getCell(5).value);
    expect(finalBalance).toBeCloseTo(0, 2);
  });
});

describe('reports with projection', () => {
  function makeProjectionCtx() {
    const ctx = makeCtx();
    const inputsWithProj = {
      ...ctx.inputs,
      projection: {
        holdYears: 5,
        appreciationRate: 0.03,
        rentGrowthRate: 0.02,
        expenseGrowthRate: 0.02,
        includeSale: true,
        sellingCostPct: 0.06,
      },
    };
    const outputs = analyze(inputsWithProj);
    return buildReportContext({
      property: ctx.property,
      scenario: ctx.scenario,
      revision: {
        ...ctx.revision,
        inputs: inputsWithProj,
        outputs,
      },
      settings: {},
    });
  }

  it('markdown includes a Long-term projection section with the year table', () => {
    const md = buildMarkdown(makeProjectionCtx());
    expect(md).toContain('## Long-term projection');
    expect(md).toContain('| IRR |');
    expect(md).toContain('| MIRR |');
    expect(md).toContain('Equity at exit');
  });

  it('excel includes a Projection worksheet when projection is present', async () => {
    const buf = await buildExcel(makeProjectionCtx());
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    const names = wb.worksheets.map((s) => s.name);
    expect(names).toContain('Projection');
  });

  it('excel Projection sheet has one row per hold year plus header + summary', async () => {
    const buf = await buildExcel(makeProjectionCtx());
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    const ws = wb.getWorksheet('Projection');
    // Title + 4 summary rows (no sale-proceeds line in "not included" case — here includeSale is true so +1 more)
    // + blank row + header + 5 data rows. We just verify the data rows exist at the expected spot.
    // Title at row 1, summary rows 2..6 (IRR, MIRR, Equity, Total equity, Net sale = 5 rows), header at row 8.
    expect(ws.getRow(8).getCell(1).value).toBe('Year');
    expect(ws.getRow(9).getCell(1).value).toBe(1);
    expect(ws.getRow(13).getCell(1).value).toBe(5);
  });

  it('no projection = no Projection sheet', async () => {
    const buf = await buildExcel(makeCtx());
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    const names = wb.worksheets.map((s) => s.name);
    expect(names).not.toContain('Projection');
  });
});

describe('buildReport dispatcher', () => {
  const ctx = makeCtx();

  it('routes excel/xlsx to the Excel builder', async () => {
    const { buffer, extension } = await buildReport(ctx, 'excel');
    expect(extension).toBe('xlsx');
    expect(buffer).toBeInstanceOf(Buffer);
  });

  it('routes pdf', async () => {
    const { buffer, extension } = await buildReport(ctx, 'pdf');
    expect(extension).toBe('pdf');
    expect(buffer.slice(0, 4).toString('ascii')).toBe('%PDF');
  });

  it('routes md/markdown', async () => {
    const { buffer, extension } = await buildReport(ctx, 'md');
    expect(extension).toBe('md');
    expect(buffer.toString('utf8')).toContain('# 123 Test Ln');
  });

  it('throws on unknown format', async () => {
    await expect(buildReport(ctx, 'csv')).rejects.toThrow();
  });
});
