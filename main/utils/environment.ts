import {app} from 'electron';

export const isDevelopment = !app.isPackaged;

export const fixPathForAsarUnpack = (filePath: string) => require.main?.filename.includes('app.asar')
  ? filePath.replace('app.asar', 'app.asar.unpacked')
  : filePath;
