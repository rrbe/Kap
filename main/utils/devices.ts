import {hasMicrophoneAccess} from '../common/system-permissions';
import {settings} from '../common/settings';
import {defaultInputDeviceId} from '../common/constants';
import {getDefaultInputAudioDevice, getInputAudioDevices} from './system-helper';

const {showError} = require('./errors');

type AudioDevice = {id: string; name: string};

let cachedAudioDevices: AudioDevice[] | undefined;
let pendingAudioDevices: Promise<AudioDevice[]> | undefined;

const loadAudioDevices = async (): Promise<AudioDevice[]> => {
  if (!hasMicrophoneAccess()) {
    return [];
  }

  try {
    const devices = await getInputAudioDevices();

    return devices.sort((a, b) => {
      if (a.transportType === b.transportType) {
        return a.name.localeCompare(b.name);
      }

      if (a.transportType === 'builtin') {
        return -1;
      }

      if (b.transportType === 'builtin') {
        return 1;
      }

      return 0;
    }).map(device => ({id: device.uid, name: device.name}));
  } catch (error) {
    showError(error);
    return [];
  }
};

export const getAudioDevices = async ({refresh = false}: {refresh?: boolean} = {}) => {
  if (cachedAudioDevices && !refresh) {
    return cachedAudioDevices;
  }

  if (!pendingAudioDevices) {
    pendingAudioDevices = loadAudioDevices()
      .then(devices => {
        cachedAudioDevices = devices;
        return devices;
      })
      .finally(() => {
        pendingAudioDevices = undefined;
      });
  }

  return pendingAudioDevices;
};

export const getDefaultInputDevice = () => {
  try {
    const device = getDefaultInputAudioDevice();
    return {
      id: device.uid,
      name: device.name
    };
  } catch {
    // Running on 10.13 and don't have swift support libs. No need to report
    return undefined;
  }
};

export const getSelectedInputDeviceId = () => {
  const audioInputDeviceId = settings.get('audioInputDeviceId', defaultInputDeviceId);

  if (audioInputDeviceId === defaultInputDeviceId) {
    const device = getDefaultInputDevice();
    return device?.id;
  }

  return audioInputDeviceId;
};

export const initializeDevices = async () => {
  const audioInputDeviceId = settings.get('audioInputDeviceId');

  if (hasMicrophoneAccess()) {
    const devices = await getAudioDevices();

    if (!devices.some((device: any) => device.id === audioInputDeviceId)) {
      settings.set('audioInputDeviceId', defaultInputDeviceId);
    }
  }
};
