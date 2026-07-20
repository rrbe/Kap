/* eslint-disable @typescript-eslint/promise-function-async */
import {contextBridge, ipcRenderer} from 'electron';
import type {KapApi} from './common/types/preload';

const getRendererSendChannel = (windowId: number, channel: string) => `%better-ipc-send-channel-${windowId}-${channel}`;
const getResponseChannels = (channel: string) => {
  const id = `${Date.now()}-${Math.random()}`;
  return {
    sendChannel: `%better-ipc-send-channel-${channel}`,
    dataChannel: `%better-ipc-response-data-channel-${channel}-${id}`,
    errorChannel: `%better-ipc-response-error-channel-${channel}-${id}`
  };
};

const serializeError = (value: any) => value instanceof Error ? {
  ...value,
  name: value.name,
  message: value.message,
  stack: value.stack
} : value;

const deserializeError = (value: any) => {
  if (value instanceof Error) {
    return value;
  }

  const error = new Error(value?.message ?? String(value));
  if (value && typeof value === 'object') {
    Object.assign(error, value);
  }

  return error;
};

const allowedCallMainChannels = new Set([
  'create-export',
  'kap-window-mount',
  'kap-window-state',
  'open-edit-config',
  'preferences-ready',
  'refresh-usage',
  'save-snapshot',
  'toggle-shortcuts',
  'update-shortcut'
]);
const allowedAnswerMainChannels = new Set(['data', 'edit-service', 'kap-window-state', 'mount', 'open-plugin-config', 'options', 'plugin']);
const allowedSendChannels = new Set(['drag-export', 'renderer-ready']);
const allowedOnChannels = new Set(['blur', 'display', 'select-app', 'start-recording']);
const remoteStateChannel = /^kap-remote-state-(editor-options|exports|exports-list)-(subscribe|get-state|call-action|state-updated)$/;
const dialogActionChannel = /^dialog-action-\d+$/;

const assertTrustedPage = () => {
  const page = new URL(location.href);
  const isDevelopmentPage = page.origin === 'http://localhost:8000' && page.pathname === '/';
  const isPackagedPage = page.protocol === 'file:' && page.pathname.endsWith('/renderer/out/index.html');
  if (!isDevelopmentPage && !isPackagedPage) {
    throw new Error(`Preload API is not available to ${page.origin}`);
  }
};

const assertChannel = (channel: string, allowed: Set<string>, patterns: RegExp[] = []) => {
  assertTrustedPage();
  if (!allowed.has(channel) && !patterns.some(pattern => pattern.test(channel))) {
    throw new Error(`IPC channel is not allowed: ${channel}`);
  }
};

const sync = (action: string, data?: any) => {
  assertTrustedPage();
  return ipcRenderer.sendSync('kap:sync', action, data);
};

const invoke = (action: string, data?: any) => {
  assertTrustedPage();
  return ipcRenderer.invoke('kap:api', action, data);
};

let listenerId = 0;
const listeners = new Map<number, {channel: string; listener: (...args: any[]) => void}>();

const addListener = (channel: string, callback: (...args: any[]) => void) => {
  assertTrustedPage();
  const id = ++listenerId;
  const listener = (_event: Electron.IpcRendererEvent, ...args: any[]) => callback(...args);
  listeners.set(id, {channel, listener});
  ipcRenderer.on(channel, listener);
  return id;
};

const removeListener = (id: number) => {
  const entry = listeners.get(id);
  if (entry) {
    ipcRenderer.removeListener(entry.channel, entry.listener);
    listeners.delete(id);
  }
};

const callMain = <DataType, ReturnType = unknown>(channel: string, data?: DataType) => {
  assertChannel(channel, allowedCallMainChannels, [remoteStateChannel, dialogActionChannel]);
  return new Promise<ReturnType>((resolve, reject) => {
    const {sendChannel, dataChannel, errorChannel} = getResponseChannels(channel);
    const cleanup = () => {
      ipcRenderer.removeListener(dataChannel, onData);
      ipcRenderer.removeListener(errorChannel, onError);
    };

    const onData = (_event: Electron.IpcRendererEvent, result: any) => {
      cleanup();
      resolve(result);
    };

    const onError = (_event: Electron.IpcRendererEvent, error: any) => {
      cleanup();
      reject(deserializeError(error));
    };

    ipcRenderer.once(dataChannel, onData);
    ipcRenderer.once(errorChannel, onError);
    ipcRenderer.send(sendChannel, {dataChannel, errorChannel, userData: data});
  });
};

const answerMain = <DataType, ReturnType = unknown>(channel: string, callback: (data: DataType) => ReturnType | PromiseLike<ReturnType>) => {
  assertChannel(channel, allowedAnswerMainChannels, [remoteStateChannel]);
  const sendChannel = getRendererSendChannel(sync('window-id'), channel);
  const listener = async (_event: Electron.IpcRendererEvent, data: any) => {
    try {
      ipcRenderer.send(data.dataChannel, await callback(data.userData));
    } catch (error) {
      ipcRenderer.send(data.errorChannel, serializeError(error));
    }
  };

  const id = ++listenerId;
  listeners.set(id, {channel: sendChannel, listener});
  ipcRenderer.on(sendChannel, listener);
  return id;
};

const api: KapApi = {
  ipc: {
    callMain,
    answerMain,
    removeListener,
    send: (channel: string, data?: any) => {
      assertChannel(channel, allowedSendChannels);
      ipcRenderer.send(channel, data);
    },
    on: (channel: string, callback: (...args: any[]) => void) => {
      assertChannel(channel, allowedOnChannels);
      return addListener(channel, callback);
    }
  },
  window: {
    getState: () => sync('window-state'),
    close: () => invoke('window-close'),
    minimize: () => invoke('window-minimize'),
    toggleFullScreen: () => invoke('window-toggle-full-screen'),
    setBounds: (bounds: Electron.Rectangle, animate?: boolean) => invoke('window-set-bounds', {bounds, animate}),
    setResizable: (resizable: boolean, fullScreenable: boolean) => invoke('window-set-resizable', {resizable, fullScreenable}),
    setIgnoreMouseEvents: (ignore: boolean) => invoke('window-set-ignore-mouse', ignore)
  },
  settings: {
    get: (key: string) => sync('settings-get', key),
    getStore: () => sync('settings-store'),
    set: (key: string, value: any) => sync('settings-set', {key, value}),
    onChanged: (callback: (...args: any[]) => void) => addListener('kap:settings-changed', callback),
    removeListener
  },
  flags: {
    get: (key: string) => sync('flags-get', key),
    set: (key: string, value: any) => sync('flags-set', {key, value})
  },
  app: {
    getInfo: () => sync('app-info')
  },
  appearance: {
    get: (colorNames?: string[]) => sync('appearance', colorNames),
    onChanged: (callback: () => void) => addListener('kap:appearance-changed', callback),
    removeListener
  },
  menu: {
    popup: (template: any[], options: any) => invoke('menu-popup', {template, options}),
    prepareWindows: (selectedApp: string) => invoke('windows-menu-prepare', selectedApp),
    popupWindows: (options: any) => invoke('windows-menu-popup', options),
    popupCog: (options: any) => invoke('cog-menu-popup', options)
  },
  recording: {
    start: (options: any) => invoke('recording-start', options),
    getSelectedInputDeviceId: () => sync('selected-audio-device')
  },
  dialog: {
    showMessage: (options: any) => invoke('dialog-message', options),
    pickDirectory: () => invoke('dialog-open-directory')
  },
  shell: {
    openPath: (path: string) => invoke('shell-open-path', path),
    openExternal: (url: string) => invoke('shell-open-external', url)
  },
  preferences: {
    open: (options?: any) => invoke('preferences-open', options),
    get: () => invoke('preferences-get'),
    getAudioDevices: () => invoke('preferences-audio-devices'),
    getPluginsFromNpm: () => invoke('preferences-plugins-from-npm'),
    installPlugin: (name: string) => invoke('preferences-plugin-install', name),
    uninstallPlugin: (name: string) => invoke('preferences-plugin-uninstall', name),
    openPluginConfig: (name: string) => invoke('preferences-plugin-config', name),
    ensureMicrophonePermissions: () => invoke('preferences-microphone'),
    track: (path: string) => invoke('preferences-track', path),
    showError: (message: string) => invoke('preferences-show-error', {message}),
    setOpenOnStartup: (open: boolean) => invoke('preferences-login-item', open)
  },
  config: {
    get: (pluginName: string, serviceTitle?: string) => invoke('config-get', {pluginName, serviceTitle}),
    change: (key: string, value: any, serviceTitle?: string) => invoke('config-change', {key, value, serviceTitle}),
    open: () => invoke('config-open'),
    viewOnGithub: () => invoke('config-view-on-github')
  }
};

contextBridge.exposeInMainWorld('kap', api);
