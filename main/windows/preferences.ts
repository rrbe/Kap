import {BrowserWindow} from 'electron';
import {promisify} from 'util';

import {ipcMain as ipc} from '../utils/ipc';
import {loadRoute} from '../utils/routes';
import {windowManager} from './manager';
import {secureWebPreferences} from './web-preferences';

let prefsWindow: BrowserWindow | undefined;

const openPrefsWindow = async () => {
  windowManager.cropper?.close();

  if (prefsWindow) {
    prefsWindow.show();
    return prefsWindow;
  }

  prefsWindow = new BrowserWindow({
    title: 'Preferences',
    width: 480,
    height: 480,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    titleBarStyle: 'hiddenInset',
    show: false,
    frame: false,
    transparent: true,
    vibrancy: 'window',
    webPreferences: secureWebPreferences
  });

  prefsWindow.on('close', () => {
    prefsWindow = undefined;
  });

  await loadRoute(prefsWindow, 'preferences');

  ipc.callRenderer(prefsWindow, 'mount');

  // @ts-expect-error
  await promisify(ipc.answerRenderer)('preferences-ready');

  prefsWindow.show();
  return prefsWindow;
};

const closePrefsWindow = () => {
  if (prefsWindow) {
    prefsWindow.close();
  }
};

windowManager.setPreferences({
  open: openPrefsWindow,
  close: closePrefsWindow
});
