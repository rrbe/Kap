import sinon from 'sinon';

export const getInputDevices = sinon.fake(async () => [
  {uid: 'usb', name: 'USB Microphone', transportType: 'usb'},
  {uid: 'builtin', name: 'Mac Microphone', transportType: 'builtin'}
]);

export const getDefaultInputDevice = {
  sync: () => ({uid: 'builtin', name: 'Mac Microphone'})
};
