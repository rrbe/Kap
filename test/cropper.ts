import test from 'ava';

import {mockImport} from './helpers/mocks';

mockImport('../common/settings', 'settings');
mockImport('../common/system-permissions', 'system-permissions');
mockImport('../utils/routes', 'routes');

import {app, browserWindows} from './mocks/electron';
import {windowManager} from '../main/windows/manager';
import '../main/windows/cropper';

test('reuses cropper windows until the app quits', async t => {
  t.truthy(windowManager.cropper);

  await windowManager.cropper?.open();
  t.is(browserWindows.length, 2);

  windowManager.cropper?.close();
  t.true(browserWindows.every(window => window.hidden));

  await windowManager.cropper?.open();
  t.is(browserWindows.length, 2);
  t.true(browserWindows.every(window => !window.hidden));

  windowManager.cropper?.setCountdown(2, 3);
  t.false(browserWindows[0].webContents.send.calledWith('recording-countdown', 3));
  t.true(browserWindows[1].webContents.send.calledWith('recording-countdown', 3));

  app.emit('before-quit');
  t.true(browserWindows.every(window => window.destroyed));
});
