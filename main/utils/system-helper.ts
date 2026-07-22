import {execFile, execFileSync} from 'child_process';
import path from 'path';
import {fixPathForAsarUnpack} from './environment';

const binaryPath = fixPathForAsarUnpack(path.join(__dirname, '..', 'kap-system'));
const maxBuffer = 10 * 1024 * 1024;

export type SystemAudioDevice = {
  uid: string;
  name: string;
  transportType: string;
};

export type SystemWindow = {
  pid: number;
  ownerName: string;
  name: string;
  width: number;
  height: number;
  x: number;
  y: number;
  number: number;
};

export type OpenWithApp = {
  url: string;
  isDefault: boolean;
  icon: string;
  name?: string;
};

const runJson = <T>(arguments_: string[]) => new Promise<T>((resolve, reject) => {
  execFile(binaryPath, arguments_, {maxBuffer}, (error, stdout) => {
    if (error) {
      reject(error);
      return;
    }

    resolve(JSON.parse(stdout) as T);
  });
});

const runJsonSync = <T>(arguments_: string[]) => {
  const output = execFileSync(binaryPath, arguments_, {
    encoding: 'utf8',
    maxBuffer
  });
  return JSON.parse(output) as T;
};

export const getInputAudioDevices = () => runJson<SystemAudioDevice[]>(['audio-inputs']);

export const getDefaultInputAudioDevice = () => runJsonSync<SystemAudioDevice>([
  'audio-default-input'
]);

export const getWindows = async () => {
  const windows = await runJson<SystemWindow[]>(['windows']);
  return windows.filter((window, index) => {
    const firstNamedWindow = windows.findIndex(candidate =>
      candidate.name && candidate.ownerName === window.ownerName);

    return firstNamedWindow === -1
      ? windows.findIndex(candidate => candidate.ownerName === window.ownerName) === index
      : firstNamedWindow === index;
  });
};

export const activateWindow = (ownerName: string) => new Promise<void>((resolve, reject) => {
  execFile(binaryPath, ['activate', ownerName], error => {
    if (error) {
      reject(error);
      return;
    }

    resolve();
  });
});

export const getAppsThatOpenExtension = (extension: string) => {
  try {
    return runJsonSync<OpenWithApp[]>(['open-with-apps', extension]);
  } catch {
    return [];
  }
};

export const openFileWithApp = (filePath: string, applicationUrl: string) => {
  try {
    execFileSync(binaryPath, ['open-with', filePath, applicationUrl]);
    return true;
  } catch {
    return false;
  }
};
