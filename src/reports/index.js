export { buildReportContext } from './context.js';
export { buildExcel } from './excel.js';
export { buildPdf } from './pdf.js';
export { buildMarkdown } from './markdown.js';

// Resolves a format string to { buffer, extension, mime }.
export async function buildReport(ctx, format) {
  const { buildExcel } = await import('./excel.js');
  const { buildPdf } = await import('./pdf.js');
  const { buildMarkdown } = await import('./markdown.js');
  if (format === 'excel' || format === 'xlsx') {
    return {
      buffer: Buffer.from(await buildExcel(ctx)),
      extension: 'xlsx',
      mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }
  if (format === 'pdf') {
    return { buffer: await buildPdf(ctx), extension: 'pdf', mime: 'application/pdf' };
  }
  if (format === 'markdown' || format === 'md') {
    return {
      buffer: Buffer.from(buildMarkdown(ctx), 'utf8'),
      extension: 'md',
      mime: 'text/markdown',
    };
  }
  throw new Error(`Unknown report format: ${format}`);
}
