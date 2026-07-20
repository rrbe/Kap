
import {windowManager} from './manager';
import {BrowserWindow, systemPreferences, dialog, screen, Display, app} from 'electron';
import {is} from 'electron-util';
import delay from 'delay';

import {settings} from '../common/settings';
import {hasMicrophoneAccess, ensureMicrophonePermissions, openSystemPreferences, ensureScreenCapturePermissions} from '../common/system-permissions';
import {loadRoute} from '../utils/routes';
import {MacWindow} from '../utils/windows';

const croppers = new Map<number, BrowserWindow>();
let notificationId: number | undefined;
let isOpen = false;
let isOpening = false;

const unsubscribeWorkspaceNotification = () => {
  if (notificationId !== undefined) {
    systemPreferences.unsubscribeWorkspaceNotification(notificationId);
    notificationId = undefined;
  }
};

const hideAllCroppers = () => {
  screen.removeListener('display-removed', onDisplayRemoved);
  screen.removeListener('display-added', onDisplayAdded);
  unsubscribeWorkspaceNotification();
  isOpen = false;

  for (const cropper of croppers.values()) {
    if (!cropper.isDestroyed()) {
      cropper.hide();
    }
  }
};

const destroyCropper = (id: number) => {
  const cropper = croppers.get(id);
  if (!cropper) {
    return;
  }

  cropper.removeAllListeners('close');
  cropper.destroy();
  croppers.delete(id);
};

const destroyAllCroppers = () => {
  hideAllCroppers();

  for (const id of [...croppers.keys()]) {
    destroyCropper(id);
  }
};

const getDisplayInfo = (display: Display, activeDisplayId?: number) => {
  const {id, bounds} = display;
  const {x, y, width, height} = bounds;
  const displayInfo: {
    isActive: boolean;
    id: number;
    x: number;
    y: number;
    width: number;
    height: number;
    cropper?: unknown;
  } = {
    isActive: activeDisplayId === id,
    id,
    x,
    y,
    width,
    height
  };

  if (displayInfo.isActive) {
    const savedCropper = settings.get('cropper', {});
    // @ts-expect-error Electron Store returns the persisted cropper shape
    if (savedCropper.displayId === id) {
      displayInfo.cropper = savedCropper;
    }
  }

  return displayInfo;
};

const sendDisplayInfo = (cropper: BrowserWindow, display: Display, activeDisplayId?: number) => {
  cropper.webContents.send('display', getDisplayInfo(display, activeDisplayId));
};

const openCropper = async (display: Display, activeDisplayId?: number) => {
  const {id, bounds} = display;
  const existingCropper = croppers.get(id);
  if (existingCropper && !existingCropper.isDestroyed()) {
    existingCropper.setBounds(bounds);
    sendDisplayInfo(existingCropper, display, activeDisplayId);
    return existingCropper;
  }

  const {x, y, width, height} = bounds;

  const cropper = new BrowserWindow({
    x,
    y,
    width,
    height,
    hasShadow: false,
    enableLargerThanScreen: true,
    resizable: false,
    movable: false,
    frame: false,
    transparent: true,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
      contextIsolation: false
    }
  });

  cropper.setAlwaysOnTop(true, 'screen-saver', 1);

  cropper.webContents.on('did-finish-load', () => {
    if (!isOpen || cropper.isDestroyed()) {
      return;
    }

    const currentDisplay = screen.getAllDisplays().find(display => display.id === id);
    if (currentDisplay) {
      const currentActiveDisplayId = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).id;
      sendDisplayInfo(cropper, currentDisplay, currentActiveDisplayId);
    }
  });

  cropper.on('close', event => {
    event.preventDefault();
    hideAllCroppers();
  });
  cropper.on('closed', () => {
    if (croppers.get(id) === cropper) {
      croppers.delete(id);
    }
  });
  croppers.set(id, cropper);

  try {
    await loadRoute(cropper, 'cropper');
  } catch (error) {
    destroyCropper(id);
    throw error;
  }

  return cropper;
};

const openCropperWindow = async () => {
  if (isOpen || isOpening) {
    return;
  }

  if (windowManager.editor?.areAnyBlocking()) {
    return;
  }

  if (!ensureScreenCapturePermissions()) {
    return;
  }

  isOpening = true;
  const startedAt = Date.now();

  try {
    const recordAudio = settings.get('recordAudio');

    if (recordAudio && !hasMicrophoneAccess()) {
      const granted = await ensureMicrophonePermissions(async () => {
        const {response} = await dialog.showMessageBox({
          type: 'warning',
          buttons: ['Open System Preferences', 'Continue'],
          defaultId: 1,
          message: 'Kap cannot access the microphone.',
          detail: 'Audio recording is enabled but Kap does not have access to the microphone. Continue without audio or grant Kap access to the microphone the System Preferences.',
          cancelId: 2
        });

        if (response === 0) {
          openSystemPreferences('Privacy_Microphone');
          return false;
        }

        if (response === 1) {
          settings.set('recordAudio', false);
          return true;
        }

        return false;
      });

      if (!granted) {
        return;
      }
    }

    isOpen = true;

    const displays = screen.getAllDisplays();
    const displayIds = new Set(displays.map(display => display.id));
    const activeDisplayId = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).id;

    for (const id of croppers.keys()) {
      if (!displayIds.has(id)) {
        destroyCropper(id);
      }
    }

    await Promise.all(displays.map(display => openCropper(display, activeDisplayId)));

    for (const cropper of croppers.values()) {
      cropper.setIgnoreMouseEvents(false);
      cropper.setVisibleOnAllWorkspaces(false);
      cropper.showInactive();
    }

    croppers.get(activeDisplayId)?.focus();

    // Electron typing issue, this should be marked as returning a number
    notificationId = (systemPreferences as any).subscribeWorkspaceNotification('NSWorkspaceActiveSpaceDidChangeNotification', hideAllCroppers);

    screen.on('display-removed', onDisplayRemoved);
    screen.on('display-added', onDisplayAdded);

    if (is.development) {
      console.log(`Opened cropper windows in ${Date.now() - startedAt}ms`);
    }
  } catch (error) {
    hideAllCroppers();
    throw error;
  } finally {
    isOpening = false;
  }
};

function onDisplayRemoved(_: any, oldDisplay: Display) {
  const {id} = oldDisplay;
  const cropper = croppers.get(id);

  if (!cropper) {
    return;
  }

  const wasFocused = cropper.isFocused();
  destroyCropper(id);

  if (wasFocused) {
    const activeDisplayId = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).id;
    if (croppers.has(activeDisplayId)) {
      croppers.get(activeDisplayId)?.focus();
    }
  }
}

async function onDisplayAdded(_: any, newDisplay: Display) {
  try {
    const activeDisplayId = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).id;
    const cropper = await openCropper(newDisplay, activeDisplayId);
    if (!isOpen) {
      cropper.hide();
      return;
    }

    cropper.setIgnoreMouseEvents(false);
    cropper.setVisibleOnAllWorkspaces(false);
    cropper.showInactive();
  } catch (error) {
    console.error('Failed to open cropper for added display', error);
  }
}

const preventDefault = (event: any) => event.preventDefault();

const selectApp = async (window: MacWindow, activateWindow: (ownerName: string) => Promise<void>) => {
  for (const cropper of croppers.values()) {
    cropper.prependListener('blur', preventDefault);
  }

  await activateWindow(window.ownerName);

  const {x, y, width, height, ownerName} = window;

  const display = screen.getDisplayMatching({x, y, width, height});
  const {id, bounds: {x: screenX, y: screenY}} = display;

  // For some reason this happened a bit too early without the timeout
  await delay(300);

  for (const cropper of croppers.values()) {
    cropper.removeListener('blur', preventDefault);
    cropper.webContents.send('blur');
  }

  croppers.get(id)?.focus();

  croppers.get(id)?.webContents.send('select-app', {
    ownerName,
    x: x - screenX,
    y: y - screenY,
    width,
    height
  });
};

const disableCroppers = () => {
  unsubscribeWorkspaceNotification();

  for (const cropper of croppers.values()) {
    cropper.removeListener('blur', preventDefault);
    cropper.setIgnoreMouseEvents(true);
    cropper.setVisibleOnAllWorkspaces(true);
  }
};

const setRecordingCroppers = () => {
  for (const cropper of croppers.values()) {
    cropper.webContents.send('start-recording');
  }
};

const isCropperOpen = () => isOpen;

app.on('before-quit', destroyAllCroppers);

app.on('browser-window-created', () => {
  if (!isCropperOpen()) {
    app.dock.show();
  }
});

windowManager.setCropper({
  open: openCropperWindow,
  close: hideAllCroppers,
  selectApp,
  setRecording: setRecordingCroppers,
  isOpen: isCropperOpen,
  disable: disableCroppers
});
