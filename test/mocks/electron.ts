import sinon from 'sinon';
import {temporaryDirectory} from '../../main/utils/temporary-path';
import path from 'path';
import {EventEmitter} from 'events';

const temporaryDir = temporaryDirectory();

process.env.TZ = 'America/New_York';
(process.versions as any).chrome = '';

export const app = Object.assign(new EventEmitter(), {
  getPath: (name: string) => path.resolve(temporaryDir, name),
  getAppPath: () => temporaryDir,
  isPackaged: false,
  getVersion: () => '',
  name: 'Kap',
  dock: {
    show: sinon.fake(),
    hide: sinon.fake()
  }
});

export const browserWindows: BrowserWindow[] = [];
export const ipcMain = new EventEmitter();

export class BrowserWindow extends EventEmitter {
  destroyed = false;
  hidden = false;
  bounds: any;
  loadedUrl?: string;
  webContents = Object.assign(new EventEmitter(), {
    send: sinon.fake(),
    openDevTools: sinon.fake()
  });

  constructor(options: any) {
    super();
    this.bounds = {x: options.x, y: options.y, width: options.width, height: options.height};
    browserWindows.push(this);
  }

  setAlwaysOnTop = sinon.fake();

  loadURL = sinon.fake(async (url: string) => {
    this.loadedUrl = url;
  });

  setBounds = (bounds: any) => {
    this.bounds = bounds;
  };

  setIgnoreMouseEvents = sinon.fake();

  setVisibleOnAllWorkspaces = sinon.fake();

  showInactive = sinon.fake(() => {
    this.hidden = false;
  });

  hide = sinon.fake(() => {
    this.hidden = true;
  });

  focus = sinon.fake();

  isFocused = () => false;

  isDestroyed = () => this.destroyed;

  destroy = () => {
    this.destroyed = true;
    this.emit('closed');
  };
}

const displays = [
  {id: 1, bounds: {x: 0, y: 0, width: 1440, height: 900}},
  {id: 2, bounds: {x: 1440, y: 0, width: 1920, height: 1080}}
];

export const screen = Object.assign(new EventEmitter(), {
  getAllDisplays: () => displays,
  getCursorScreenPoint: () => ({x: 0, y: 0}),
  getDisplayNearestPoint: () => displays[0],
  getDisplayMatching: () => displays[0]
});

export const systemPreferences = {
  subscribeWorkspaceNotification: sinon.fake(() => 1),
  unsubscribeWorkspaceNotification: sinon.fake()
};

export const dialog = {
  showMessageBox: sinon.fake(async () => ({response: 1}))
};

export const shell = {
  showItemInFolder: sinon.fake()
};

export const clipboard = {
  writeText: sinon.fake()
};

export const remote = {};
