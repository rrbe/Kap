import path from 'path';

export const secureWebPreferences = {
  preload: path.join(__dirname, '../preload.js'),
  nodeIntegration: false,
  contextIsolation: true,
  sandbox: true
};
