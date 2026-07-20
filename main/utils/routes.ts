import {app, BrowserWindow, ipcMain, IpcMainEvent} from 'electron';
import {isDevelopment} from './environment';

export const loadRoute = async (window: BrowserWindow, routeName: string, {openDevTools}: {openDevTools?: boolean} = {}) => {
  let onReady: (event: IpcMainEvent) => void;
  let onClosed: () => void;
  const ready = new Promise<void>((resolve, reject) => {
    onReady = event => {
      if (event.sender === window.webContents) {
        resolve();
      }
    };

    onClosed = () => reject(new Error(`Window closed before renderer route "${routeName}" was ready`));

    ipcMain.on('renderer-ready', onReady);

    window.once('closed', onClosed);
  });

  let loading: Promise<void>;
  if (isDevelopment) {
    loading = window.loadURL(`http://localhost:8000/?route=${encodeURIComponent(routeName)}`);
    window.webContents.openDevTools({mode: 'detach'});
  } else {
    loading = window.loadFile(`${app.getAppPath()}/renderer/out/index.html`, {
      query: {route: routeName}
    });
    if (openDevTools) {
      window.webContents.openDevTools({mode: 'detach'});
    }
  }

  try {
    await loading;
    await ready;
  } finally {
    ipcMain.removeListener('renderer-ready', onReady!);
    window.removeListener('closed', onClosed!);
  }
};
