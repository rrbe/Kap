import path from 'path';
import {Encoding, Format} from '../common/types';
import h264Converters from './h264';
import {ConvertOptions} from './utils';
import {getFormatExtension} from '../common/constants';
import PCancelable, {OnCancelFunction} from 'p-cancelable';
import {temporaryDirectory} from '../utils/temporary-path';
import {Except} from 'type-fest';
import fs from 'fs';

export const copyUneditedMp4 = PCancelable.fn(async (options: ConvertOptions, onCancel: OnCancelFunction) => {
  let isCanceled = false;
  onCancel(() => {
    isCanceled = true;
  });

  options.onProgress('Copying', 0);
  await fs.promises.copyFile(options.inputPath, options.outputPath, fs.constants.COPYFILE_FICLONE);

  if (isCanceled) {
    await fs.promises.unlink(options.outputPath).catch(() => undefined);
  } else {
    options.onProgress('Copying', 1);
  }

  return options.outputPath;
});

const converters = new Map([
  [Encoding.h264, h264Converters]
]);

export const convertTo = (
  format: Format,
  options: Except<ConvertOptions, 'outputPath'> & {defaultFileName: string},
  encoding: Encoding = Encoding.h264
) => {
  if (!converters.has(encoding)) {
    throw new Error(`Unsupported encoding: ${encoding}`);
  }

  const converter = converters.get(encoding)?.get(format);

  if (!converter) {
    throw new Error(`Unsupported file format for ${encoding}: ${format}`);
  }

  const conversionOptions = {
    outputPath: path.join(temporaryDirectory(), `${options.defaultFileName}.${getFormatExtension(format)}`),
    ...options
  };

  if (format === Format.mp4 && encoding === Encoding.h264 && options.isUnedited && !options.shouldMute) {
    return copyUneditedMp4(conversionOptions);
  }

  return converter(conversionOptions);
};
