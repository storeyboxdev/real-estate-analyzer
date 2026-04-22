import fs from 'node:fs/promises';
import { BrowserWindow } from 'electron';
import { buildReportContext, buildReport } from '../reports/index.js';

// Wires renderer-facing IPC channels to the repositories and analysis core.
// Channel naming: "<group>:<action>", matching the shape of window.api in preload.
export function registerIpc(ipcMain, { repos, analyze, dialog }) {
  // -------- settings --------
  ipcMain.handle('settings:getAll', () => repos.settings.parsed);
  ipcMain.handle('settings:set', (_e, key, value) => {
    repos.settings.set(key, value);
    return repos.settings.parsed;
  });

  // -------- properties --------
  ipcMain.handle('properties:list', () => repos.properties.list());
  ipcMain.handle('properties:getById', (_e, id) => repos.properties.getById(id));
  ipcMain.handle('properties:create', (_e, fields) => {
    const id = repos.properties.create(fields);
    return repos.properties.getById(id);
  });
  ipcMain.handle('properties:update', (_e, id, fields) => {
    repos.properties.update(id, fields);
    return repos.properties.getById(id);
  });
  ipcMain.handle('properties:delete', (_e, id) => {
    repos.properties.delete(id);
    return { ok: true };
  });

  // -------- scenarios --------
  ipcMain.handle('scenarios:listForProperty', (_e, propertyId) =>
    repos.scenarios.listForProperty(propertyId),
  );
  ipcMain.handle('scenarios:getById', (_e, id) => repos.scenarios.getById(id));
  ipcMain.handle('scenarios:create', (_e, propertyId, { name, isCurrent, inputs, note }) => {
    const outputs = analyze(inputs, repos.settings.parsed);
    const scenarioId = repos.scenarios.create(propertyId, { name, isCurrent });
    repos.revisions.append(scenarioId, { inputs, outputs, note: note ?? null });
    return {
      scenario: repos.scenarios.getById(scenarioId),
      revision: repos.revisions.latest(scenarioId),
    };
  });
  ipcMain.handle('scenarios:update', (_e, scenarioId, { inputs, note }) => {
    const outputs = analyze(inputs, repos.settings.parsed);
    repos.revisions.append(scenarioId, { inputs, outputs, note: note ?? null });
    repos.scenarios.touch(scenarioId);
    return {
      scenario: repos.scenarios.getById(scenarioId),
      revision: repos.revisions.latest(scenarioId),
    };
  });
  ipcMain.handle('scenarios:setCurrent', (_e, scenarioId) => {
    repos.scenarios.setCurrent(scenarioId);
    return repos.scenarios.getById(scenarioId);
  });
  ipcMain.handle('scenarios:rename', (_e, scenarioId, newName) => {
    repos.scenarios.rename(scenarioId, newName);
    return repos.scenarios.getById(scenarioId);
  });
  ipcMain.handle('scenarios:delete', (_e, scenarioId) => {
    repos.scenarios.delete(scenarioId);
    return { ok: true };
  });

  // -------- revisions --------
  ipcMain.handle('revisions:listForScenario', (_e, scenarioId) =>
    repos.revisions.listForScenario(scenarioId),
  );
  ipcMain.handle('revisions:latest', (_e, scenarioId) => repos.revisions.latest(scenarioId));

  // -------- analyze (preview without persisting) --------
  ipcMain.handle('analyze:preview', (_e, inputs) => analyze(inputs, repos.settings.parsed));

  // -------- reports --------
  ipcMain.handle('reports:export', async (e, { scenarioId, format }) => {
    const scenario = repos.scenarios.getById(scenarioId);
    if (!scenario) throw new Error(`Scenario ${scenarioId} not found`);
    const property = repos.properties.getById(scenario.property_id);
    const revision = repos.revisions.latest(scenarioId);
    if (!revision) throw new Error(`Scenario ${scenarioId} has no revisions`);

    const ctx = buildReportContext({
      property,
      scenario,
      revision,
      settings: repos.settings.parsed,
    });
    const { buffer, extension } = await buildReport(ctx, format);

    const slug = property.address.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
    const defaultName = `${slug}-${scenario.name.replace(/\s+/g, '-')}.${extension}`;

    const window = BrowserWindow.fromWebContents(e.sender);
    const { canceled, filePath } = await dialog.showSaveDialog(window, {
      title: `Export ${format.toUpperCase()}`,
      defaultPath: defaultName,
      filters: [{ name: extension.toUpperCase(), extensions: [extension] }],
    });
    if (canceled || !filePath) return { canceled: true };

    await fs.writeFile(filePath, buffer);
    return { canceled: false, filePath };
  });
}
