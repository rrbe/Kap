import path from 'path';

export const secureWebPreferences = {
  preload: path.join(__dirname, '../preload.js'),
  nodeIntegration: false,
  enableRemoteModule: false,
  contextIsolation: true
};
