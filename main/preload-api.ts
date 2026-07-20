import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  nativeImage,
  nativeTheme,
  shell,
  systemPreferences
} from 'electron';
import path from 'path';
import {pathToFileURL} from 'url';

import {startRecording} from './aperture';
import {track} from './common/analytics';
import {defaultInputDeviceId} from './common/constants';
import {flags} from './common/flags';
import {settings, shortcuts} from './common/settings';
import {ensureMicrophonePermissions} from './common/system-permissions';
import {getCogMenu} from './menus/cog';
import {plugins} from './plugins';
import {InstalledPlugin} from './plugins/plugin';
import {getAudioDevices, getDefaultInputDevice, getSelectedInputDeviceId} from './utils/devices';
import {showError} from './utils/errors';
import {buildWindowsMenu} from './utils/windows';
import {windowManager} from './windows/manager';
import {isDevelopment} from './utils/environment';

const windowsMenus = new Map<number, Menu>();
const configPlugins = new Map<number, InstalledPlugin>();

const assertTrustedSender = (sender: Electron.WebContents) => {
  const page = new URL(sender.getURL());
  const expected = isDevelopment ? new URL('http://localhost:8000/') : pathToFileURL(path.join(app.getAppPath(), 'renderer/out/index.html'));
  if (page.origin !== expected.origin || page.pathname !== expected.pathname) {
    throw new Error(`Blocked preload IPC from ${page.origin}`);
  }
};

const getWindow = (sender: Electron.WebContents) => {
  assertTrustedSender(sender);
  const window = BrowserWindow.fromWebContents(sender);
  if (!window) {
    throw new Error('Renderer window no longer exists');
  }

  return window;
};

const serializePlugin = (plugin: any) => ({
  name: plugin.name,
  prettyName: plugin.prettyName,
  version: plugin.version,
  description: plugin.description,
  link: plugin.link,
  kapVersion: plugin.kapVersion,
  macosVersion: plugin.macosVersion,
  isCompatible: plugin.isCompatible,
  isInstalled: plugin.isInstalled,
  isSymlink: plugin instanceof InstalledPlugin ? plugin.isSymLink : false,
  hasConfig: plugin instanceof InstalledPlugin ? plugin.hasConfig : false,
  isValid: plugin instanceof InstalledPlugin ? plugin.isValid : true
});

const serializeConfig = (plugin: InstalledPlugin, serviceTitle?: string) => {
  const validators = plugin.config.validators
    .filter(({title}) => !serviceTitle || title === serviceTitle)
    .map(validator => {
      validator.validate(plugin.config.store);
      return {
        title: validator.title,
        description: validator.description,
        config: validator.config,
        errors: validator.validate.errors
      };
    });

  return {
    validators,
    values: plugin.config.store
  };
};

const popupMenu = async (window: BrowserWindow, template: any[], options: any) => new Promise<string | undefined>(resolve => {
  let settled = false;
  const finish = (selection?: string) => {
    if (!settled) {
      settled = true;
      resolve(selection);
    }
  };

  const prepare = (items: any[]): Electron.MenuItemConstructorOptions[] => items.map(item => {
    const {selectionId, icon, submenu, ...menuItem} = item;
    return {
      ...menuItem,
      icon: typeof icon === 'string' ? nativeImage.createFromDataURL(icon).resize({width: 16, height: 16}) : undefined,
      submenu: submenu ? prepare(submenu) : undefined,
      click: selectionId ? () => finish(selectionId) : undefined
    };
  });

  Menu.buildFromTemplate(prepare(template)).popup({
    window,
    ...options,
    callback: () => finish()
  });
});

const setupStateBroadcasts = () => {
  settings.onDidAnyChange((store, oldStore) => {
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send('kap:settings-changed', store, oldStore);
    }
  });

  const sendAppearance = () => {
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send('kap:appearance-changed');
    }
  };

  nativeTheme.on('updated', sendAppearance);
  systemPreferences.on('accent-color-changed', sendAppearance);
  systemPreferences.subscribeNotification('AppleAquaColorVariantChanged', sendAppearance);
};

const setupSyncApi = () => {
  ipcMain.on('kap:sync', (event, action: string, data?: any) => {
    assertTrustedSender(event.sender);
    const window = BrowserWindow.fromWebContents(event.sender);

    switch (action) {
      case 'window-id':
        event.returnValue = window?.id;
        break;
      case 'window-state':
        event.returnValue = window && {
          bounds: window.getBounds(),
          closable: window.closable,
          minimizable: window.minimizable,
          maximizable: window.maximizable,
          fullScreen: window.isFullScreen(),
          focused: window.isFocused()
        };
        break;
      case 'settings-get':
        event.returnValue = settings.get(data);
        break;
      case 'settings-store':
        event.returnValue = settings.store;
        break;
      case 'settings-set':
        settings.set(data.key, data.value);
        event.returnValue = true;
        break;
      case 'flags-get':
        event.returnValue = flags.get(data);
        break;
      case 'flags-set':
        flags.set(data.key, data.value);
        event.returnValue = true;
        break;
      case 'selected-audio-device':
        event.returnValue = getSelectedInputDeviceId();
        break;
      case 'app-info':
        event.returnValue = {
          name: app.name,
          version: app.getVersion(),
          development: isDevelopment,
          homeDirectory: app.getPath('home'),
          highlightClicksSupported: Number.parseInt(process.getSystemVersion(), 10) >= 15
        };
        break;
      case 'appearance': {
        const colors: Record<string, string> = {};
        for (const name of (data ?? []) as string[]) {
          colors[name] = systemPreferences.getColor(name as any);
        }

        event.returnValue = {
          darkMode: nativeTheme.shouldUseDarkColors,
          accentColor: systemPreferences.getAccentColor(),
          tint: systemPreferences.getUserDefault('AppleAquaColorVariant', 'string') === '6' ? 'graphite' : 'blue',
          colors
        };
        break;
      }

      default:
        event.returnValue = undefined;
    }
  });
};

const setupAsyncApi = () => {
  ipcMain.handle('kap:api', async (event, action: string, data?: any) => {
    const window = getWindow(event.sender);

    switch (action) {
      case 'window-close':
        return window.close();
      case 'window-minimize':
        return window.minimize();
      case 'window-toggle-full-screen':
        return window.setFullScreen(!window.isFullScreen());
      case 'window-set-bounds':
        return window.setBounds(data.bounds, data.animate);
      case 'window-set-resizable':
        window.setResizable(data.resizable);
        return window.setFullScreenable(data.fullScreenable);
      case 'window-set-ignore-mouse':
        return window.setIgnoreMouseEvents(data);
      case 'menu-popup':
        return popupMenu(window, data.template, data.options);
      case 'windows-menu-prepare':
        windowsMenus.set(event.sender.id, await buildWindowsMenu(data));
        return;
      case 'windows-menu-popup': {
        const menu = windowsMenus.get(event.sender.id) ?? await buildWindowsMenu('');
        menu.popup({window, ...data});
        return;
      }

      case 'cog-menu-popup':
        (await getCogMenu()).popup({window, ...data});
        return;
      case 'recording-start':
        return startRecording(data);
      case 'dialog-message':
        return dialog.showMessageBox(window, data);
      case 'dialog-open-directory': {
        const result = await dialog.showOpenDialog(window, {properties: ['openDirectory', 'createDirectory']});
        return result.filePaths[0];
      }

      case 'shell-open-path':
        return shell.openPath(data);
      case 'shell-open-external':
        return shell.openExternal(data);
      case 'preferences-get':
        return {
          settings: settings.store,
          shortcuts,
          defaultInputDeviceId,
          openOnStartup: app.getLoginItemSettings().openAtLogin,
          pluginsInstalled: plugins.installedPlugins.map(plugin => serializePlugin(plugin)),
          pluginsDir: plugins.pluginsDir
        };
      case 'preferences-open':
        await windowManager.preferences?.open(data);
        return;
      case 'preferences-audio-devices': {
        const devices = await getAudioDevices({refresh: true});
        return {
          devices,
          defaultDevice: getDefaultInputDevice()
        };
      }

      case 'preferences-plugins-from-npm':
        return (await plugins.getFromNpm()).map(plugin => serializePlugin(plugin));
      case 'preferences-plugin-install': {
        const plugin = await plugins.install(data);
        return plugin && serializePlugin(plugin);
      }

      case 'preferences-plugin-uninstall':
        return serializePlugin(await plugins.uninstall(data));
      case 'preferences-plugin-config':
        return plugins.openPluginConfig(data);
      case 'preferences-microphone':
        return ensureMicrophonePermissions();
      case 'preferences-track':
        return track(data);
      case 'preferences-show-error':
        return showError(new Error(data.message));
      case 'preferences-login-item':
        return app.setLoginItemSettings({openAtLogin: data});
      case 'config-get': {
        const plugin = new InstalledPlugin(data.pluginName);
        configPlugins.set(event.sender.id, plugin);
        event.sender.once('destroyed', () => configPlugins.delete(event.sender.id));
        return serializeConfig(plugin, data.serviceTitle);
      }

      case 'config-change': {
        const plugin = configPlugins.get(event.sender.id);
        if (!plugin) {
          throw new Error('Plugin config is not loaded');
        }

        if (data.value === undefined) {
          plugin.config.delete(data.key);
        } else {
          plugin.config.set(data.key, data.value);
        }

        return serializeConfig(plugin, data.serviceTitle);
      }

      case 'config-open':
        return configPlugins.get(event.sender.id)?.openConfigInEditor();
      case 'config-view-on-github':
        return configPlugins.get(event.sender.id)?.viewOnGithub();
      default:
        throw new Error(`Unknown preload action: ${action}`);
    }
  });
};

export const setupPreloadApi = () => {
  setupStateBroadcasts();
  setupSyncApi();
  setupAsyncApi();
};
