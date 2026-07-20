import sinon from 'sinon';

export const getInputAudioDevices = sinon.fake(async () => [
  {uid: 'usb', name: 'USB Microphone', transportType: 'usb'},
  {uid: 'builtin', name: 'Mac Microphone', transportType: 'builtin'}
]);

export const getDefaultInputAudioDevice = () => ({
  uid: 'builtin',
  name: 'Mac Microphone',
  transportType: 'builtin'
});
