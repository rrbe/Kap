'use strict';

import {BrowserWindow} from 'electron';
import {once} from 'events';
import {ipcMain as ipc} from '../utils/ipc';

import {loadRoute} from '../utils/routes';
import {windowManager} from './manager';
import {secureWebPreferences} from './web-preferences';

const openConfigWindow = async (pluginName: string) => {
  const prefsWindow = await windowManager.preferences?.open();
  const configWindow = new BrowserWindow({
    width: 320,
    height: 436,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    titleBarStyle: 'hiddenInset',
    show: false,
    parent: prefsWindow,
    modal: true,
    webPreferences: secureWebPreferences
  });

  await loadRoute(configWindow, 'config');
  await ipc.callRenderer(configWindow, 'plugin', pluginName);
  configWindow.show();

  await once(configWindow, 'closed');
};

const openEditorConfigWindow = async (pluginName: string, serviceTitle: string, editorWindow: BrowserWindow) => {
  const configWindow = new BrowserWindow({
    width: 480,
    height: 420,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    titleBarStyle: 'hiddenInset',
    show: false,
    parent: editorWindow,
    modal: true,
    webPreferences: secureWebPreferences
  });

  await loadRoute(configWindow, 'config');
  await ipc.callRenderer(configWindow, 'edit-service', {pluginName, serviceTitle});
  configWindow.show();

  await once(configWindow, 'closed');
};

ipc.answerRenderer('open-edit-config', async ({pluginName, serviceTitle}, window) => {
  return openEditorConfigWindow(pluginName, serviceTitle, window);
});

windowManager.setConfig({
  open: openConfigWindow
});
