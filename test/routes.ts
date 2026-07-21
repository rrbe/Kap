import test from 'ava';

import {BrowserWindow, ipcMain} from './mocks/electron';
import {loadRoute} from '../main/utils/routes';

test('waits for the renderer before completing a route load', async t => {
  const window = new BrowserWindow({});
  const loading = loadRoute(window as any, 'cropper');

  await Promise.resolve();
  t.is(window.loadedUrl, 'http://localhost:8000/?route=cropper');

  ipcMain.emit('renderer-ready', {sender: window.webContents});
  await loading;

  t.is(ipcMain.listenerCount('renderer-ready'), 0);
});
