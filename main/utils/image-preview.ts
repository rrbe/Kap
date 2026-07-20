/* eslint-disable array-element-newline */

import {BrowserWindow, dialog} from 'electron';
import execa from 'execa';
import {promises as fs} from 'fs';
import tempy from 'tempy';
import type {Video} from '../video';
import {generateTimestampedName} from './timestamped-name';
import ffmpegPath from './ffmpeg-path';

export const generatePreviewImage = async (filePath: string): Promise<{path: string; data: string} | undefined> => {
  const previewPath = tempy.file({extension: '.jpg'});

  try {
    await execa(ffmpegPath, [
      '-ss', '0',
      '-i', filePath,
      '-t', '1',
      '-vframes', '1',
      '-f', 'image2',
      previewPath
    ]);
  } catch {
    return;
  }

  try {
    return {
      path: previewPath,
      data: `data:image/jpeg;base64,${await fs.readFile(previewPath, 'base64')}`
    };
  } catch {
    return {
      path: previewPath,
      data: ''
    };
  }
};

export const saveSnapshot = async (video: Video, time: number) => {
  const {filePath: outputPath} = await dialog.showSaveDialog(BrowserWindow.getFocusedWindow()!, {
    defaultPath: generateTimestampedName('Snapshot', '.jpg')
  });

  if (outputPath) {
    await execa(ffmpegPath, [
      '-i', video.filePath,
      '-ss', time.toString(),
      '-vframes', '1',
      outputPath
    ]);
  }
};
