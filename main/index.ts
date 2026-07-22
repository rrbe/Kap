import {app} from 'electron';

import './windows/load';

import {settings} from './common/settings';
import {initializeTray} from './tray';
import {initializeDevices} from './utils/devices';
import {initializeGlobalAccelerators} from './global-accelerators';
import {openFiles} from './utils/open-files';
import {hasMicrophoneAccess, ensureScreenCapturePermissions} from './common/system-permissions';
import {hasActiveRecording, cleanPastRecordings} from './recording-history';
import {setupRemoteStates} from './remote-states';
import {setUpExportsListeners} from './export';
import {windowManager} from './windows/manager';
import {stopRecordingWithNoEdit} from './aperture';
import {setupPreloadApi} from './preload-api';
import {enforceMacOSAppLocation} from './utils/app-location';

const filesToOpen: string[] = [];

let onExitCleanupComplete = false;

setupPreloadApi();

app.commandLine.appendSwitch('--enable-features', 'OverlayScrollbar');

app.on('open-file', (event, path) => {
  event.preventDefault();

  if (app.isReady()) {
    openFiles(path);
  } else {
    filesToOpen.push(path);
  }
});

// Prepare the renderer once the app is ready
(async () => {
  await app.whenReady();
  require('./utils/errors').setupErrorHandling();

  // Initialize remote states
  setupRemoteStates();

  app.dock?.hide();
  app.setAboutPanelOptions({copyright: 'Copyright © rrbe and Kap contributors'});

  // Ensure the app is in the Applications folder
  enforceMacOSAppLocation();

  initializeDevices();
  initializeTray();
  initializeGlobalAccelerators();
  setUpExportsListeners();

  if (filesToOpen.length > 0) {
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

app.on('before-quit', async (event: any) => {
  if (!onExitCleanupComplete) {
    event.preventDefault();
    await stopRecordingWithNoEdit();
    cleanPastRecordings();
    onExitCleanupComplete = true;
    app.quit();
  }
});
