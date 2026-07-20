import {app, BrowserWindow} from 'electron';
import {is} from 'electron-util';

export const loadRoute = (window: BrowserWindow, routeName: string, {openDevTools}: {openDevTools?: boolean} = {}) => {
  if (is.development) {
    const loading = window.loadURL(`http://localhost:8000/${routeName}`);
    window.webContents.openDevTools({mode: 'detach'});
    return loading;
  } else {
    const loading = window.loadFile(`${app.getAppPath()}/renderer/out/${routeName}.html`);
    if (openDevTools) {
      window.webContents.openDevTools({mode: 'detach'});
    }

    return loading;
  }
};
