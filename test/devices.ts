import test from 'ava';

import {mockImport, mockModule} from './helpers/mocks';

mockModule('macos-audio-devices');
mockModule('aperture');
mockImport('../common/settings', 'settings');
mockImport('../common/system-permissions', 'system-permissions');
mockImport('./sentry', 'sentry');
mockImport('./errors', 'errors');

import {getInputDevices} from './mocks/macos-audio-devices';
import {getAudioDevices} from '../main/utils/devices';

test('caches audio devices until an explicit refresh', async t => {
  const expected = [
    {id: 'builtin', name: 'Mac Microphone'},
    {id: 'usb', name: 'USB Microphone'}
  ];

  t.deepEqual(await getAudioDevices(), expected);
  t.deepEqual(await getAudioDevices(), expected);
  t.is(getInputDevices.callCount, 1);

  t.deepEqual(await getAudioDevices({refresh: true}), expected);
  t.is(getInputDevices.callCount, 2);
});
