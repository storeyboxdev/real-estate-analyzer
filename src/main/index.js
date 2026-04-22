import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from '../db/db.js';
import { createRepos } from '../db/repositories/index.js';
import { analyze } from '../core/analysis/analyze.js';
import { registerIpc } from './ipc.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

let mainWindow;
let db;
let repos;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.on('ready-to-show', () => mainWindow.show());

  // electron-vite exposes the dev server URL via this env var.
  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  const dbPath = join(app.getPath('userData'), 'real-estate-analyzer.sqlite');
  db = openDb(dbPath);
  repos = createRepos(db);
  repos.settings.seedDefaults();

  registerIpc(ipcMain, { repos, analyze, dialog });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (db) db.close();
});
