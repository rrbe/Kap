import {app} from 'electron';

import './windows/load';

import {settings} from './common/settings';
import {plugins} from './plugins';
import {initializeTray} from './tray';
import {initializeDevices} from './utils/devices';
import {initializeAnalytics, track} from './common/analytics';
import {initializeGlobalAccelerators} from './global-accelerators';
import {openFiles} from './utils/open-files';
import {hasMicrophoneAccess, ensureScreenCapturePermissions} from './common/system-permissions';
import {handleDeepLink} from './utils/deep-linking';
import {hasActiveRecording, cleanPastRecordings} from './recording-history';
import {setupRemoteStates} from './remote-states';
import {setUpExportsListeners} from './export';
import {windowManager} from './windows/manager';
import {stopRecordingWithNoEdit} from './aperture';
import {setupPreloadApi} from './preload-api';
import {enforceMacOSAppLocation} from './utils/app-location';
import {isDevelopment} from './utils/environment';

const filesToOpen: string[] = [];

let onExitCleanupComplete = false;

setupPreloadApi();

app.commandLine.appendSwitch('--enable-features', 'OverlayScrollbar');

app.on('open-file', (event, path) => {
  event.preventDefault();

  if (app.isReady()) {
    track('editor/opened/running');
    openFiles(path);
  } else {
    filesToOpen.push(path);
  }
});

const initializePlugins = async () => {
  if (!isDevelopment) {
    try {
      await plugins.upgrade();
    } catch (error) {
      console.log(error);
    }
  }
};

// Prepare the renderer once the app is ready
(async () => {
  await app.whenReady();
  require('./utils/errors').setupErrorHandling();

  // Initialize remote states
  setupRemoteStates();

  app.dock?.hide();
  app.setAboutPanelOptions({copyright: 'Copyright © Wulkano and Kap contributors'});

  // Ensure the app is in the Applications folder
  enforceMacOSAppLocation();

  // Ensure all plugins are up to date
  initializePlugins();
  initializeDevices();
  initializeAnalytics();
  initializeTray();
  initializeGlobalAccelerators();
  setUpExportsListeners();

  if (!app.isDefaultProtocolClient('kap')) {
    app.setAsDefaultProtocolClient('kap');
  }

  if (filesToOpen.length > 0) {
    track('editor/opened/startup');
    openFiles(...filesToOpen);
    hasActiveRecording();
  } else if (
    !(await hasActiveRecording()) &&
    !app.getLoginItemSettings().wasOpenedAtLogin &&
    ensureScreenCapturePermissions() &&
    (!settings.get('recordAudio') || hasMicrophoneAccess())
  ) {
    windowManager.cropper?.open();
  }
})();

app.on('window-all-closed', () => {
  app.dock?.hide();
});

app.on('will-finish-launching', () => {
  app.on('open-url', (event, url) => {
    event.preventDefault();
    handleDeepLink(url);
  });
});

app.on('before-quit', async (event: any) => {
  if (!onExitCleanupComplete) {
    event.preventDefault();
    await stopRecordingWithNoEdit();
    cleanPastRecordings();
    onExitCleanupComplete = true;
    app.quit();
  }
});
