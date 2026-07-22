import execa from 'execa';
import moment from 'moment';
import PCancelable from 'p-cancelable';
import {temporaryFile} from '../utils/temporary-path';
import path from 'path';

import {extractProgressFromStderr} from './utils';

import ffmpegPath from '../utils/ffmpeg-path';

export interface ProcessOptions {
  startTime?: number;
  endTime?: number;
  onProgress?: (progress: number, estimate?: string) => void;
}

const createProcess = () => {
  return (outputPath: string, options: ProcessOptions, args: string[]) => {
    const {startTime = 0, endTime = 0, onProgress} = options;

    return new PCancelable<string>((resolve, reject, onCancel) => {
      const runner = execa(ffmpegPath, args);
      const conversionStartTime = Date.now();

      onCancel(() => {
        runner.kill();
      });

      const durationMs = moment.duration(endTime - startTime, 'seconds').asMilliseconds();

      let stderr = '';
      runner.stderr?.setEncoding('utf8');
      runner.stderr?.on('data', data => {
        stderr += data;

        const progressData = extractProgressFromStderr(data, conversionStartTime, durationMs);

        if (progressData) {
          onProgress?.(progressData.progress, progressData.estimate);
        }
      });

      const failWithError = (reason: unknown) => {
        reject(reason);
      };

      runner.on('error', failWithError);

      runner.on('exit', code => {
        if (code === 0) {
          resolve(outputPath);
        } else {
          failWithError(new Error(`${ffmpegPath} exited with code: ${code ?? 0}\n\n${stderr}`));
        }
      });

      runner.catch(failWithError);
    });
  };
};

export const convert = createProcess();

export const mute = PCancelable.fn(async (inputPath: string, onCancel: PCancelable.OnCancelFunction) => {
  const mutedPath = temporaryFile({extension: path.extname(inputPath)});

  const converter = convert(mutedPath, {}, [
    '-i',
    inputPath,
    '-an',
    '-vcodec',
    'copy',
    mutedPath
  ]);

  onCancel(() => {
    converter.cancel();
  });

  return converter;
});
