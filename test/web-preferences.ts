import path from 'path';
import test from 'ava';

import {secureWebPreferences} from '../main/windows/web-preferences';

test('isolates renderer processes behind the preload bridge', t => {
  t.false(secureWebPreferences.nodeIntegration);
  t.false(secureWebPreferences.enableRemoteModule);
  t.true(secureWebPreferences.contextIsolation);
  t.is(path.basename(secureWebPreferences.preload), 'preload.js');
});
