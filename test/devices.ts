import test from 'ava';

import {mockImport, mockModule} from './helpers/mocks';

mockImport('./system-helper', 'system-helper');
mockImport('../common/settings', 'settings');
mockImport('../common/system-permissions', 'system-permissions');
mockImport('./errors', 'errors');

import {getInputAudioDevices} from './mocks/system-helper';
import {getAudioDevices} from '../main/utils/devices';

test('caches audio devices until an explicit refresh', async t => {
  const expected = [
    {id: 'builtin', name: 'Mac Microphone'},
    {id: 'usb', name: 'USB Microphone'}
  ];

  t.deepEqual(await getAudioDevices(), expected);
  t.deepEqual(await getAudioDevices(), expected);
  t.is(getInputAudioDevices.callCount, 1);

  t.deepEqual(await getAudioDevices({refresh: true}), expected);
  t.is(getInputAudioDevices.callCount, 2);
});
