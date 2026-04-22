import { contextBridge, ipcRenderer } from 'electron';

// Thin typed surface for the renderer. Every call crosses the IPC boundary.
const api = {
  settings: {
    getAll: () => ipcRenderer.invoke('settings:getAll'),
    set: (key, value) => ipcRenderer.invoke('settings:set', key, value),
  },
  properties: {
    list: () => ipcRenderer.invoke('properties:list'),
    getById: (id) => ipcRenderer.invoke('properties:getById', id),
    create: (fields) => ipcRenderer.invoke('properties:create', fields),
    update: (id, fields) => ipcRenderer.invoke('properties:update', id, fields),
    delete: (id) => ipcRenderer.invoke('properties:delete', id),
  },
  scenarios: {
    listForProperty: (propertyId) => ipcRenderer.invoke('scenarios:listForProperty', propertyId),
    getById: (id) => ipcRenderer.invoke('scenarios:getById', id),
    create: (propertyId, payload) => ipcRenderer.invoke('scenarios:create', propertyId, payload),
    update: (scenarioId, payload) => ipcRenderer.invoke('scenarios:update', scenarioId, payload),
    setCurrent: (scenarioId) => ipcRenderer.invoke('scenarios:setCurrent', scenarioId),
    rename: (scenarioId, name) => ipcRenderer.invoke('scenarios:rename', scenarioId, name),
    delete: (scenarioId) => ipcRenderer.invoke('scenarios:delete', scenarioId),
  },
  revisions: {
    listForScenario: (scenarioId) => ipcRenderer.invoke('revisions:listForScenario', scenarioId),
    latest: (scenarioId) => ipcRenderer.invoke('revisions:latest', scenarioId),
  },
  analyze: {
    preview: (inputs) => ipcRenderer.invoke('analyze:preview', inputs),
  },
};

contextBridge.exposeInMainWorld('api', api);
