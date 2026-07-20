import PCancelable from 'p-cancelable';
import {temporaryFile} from '../utils/temporary-path';
import {convert} from './process';
import {areDimensionsEven, conditionalArgs, ConvertOptions, makeEven} from './utils';
import {settings} from '../common/settings';
import os from 'os';
import {Format} from '../common/types';
import fs from 'fs';

const hardwareAcceleratedExports = () => process.platform === 'darwin' && settings.get('hardwareAcceleratedExports', true);

export const getVideoEncoderArgs = (format: Format, useHardwareAcceleration = hardwareAcceleratedExports()) => {
  if (format === Format.mp4) {
    return useHardwareAcceleration ? ['-c:v', 'h264_videotoolbox', '-q:v', '65'] : ['-c:v', 'libx264'];
  }

  return useHardwareAcceleration ? ['-c:v', 'hevc_videotoolbox', '-q:v', '65'] : ['-c:v', 'libx265', '-preset', 'medium'];
};

// `time ffmpeg -i original.mp4 -vf fps=30,scale=480:-1::flags=lanczos,palettegen palette.png`
// `time ffmpeg -i original.mp4 -i palette.png -filter_complex 'fps=30,scale=-1:-1:flags=lanczos[x]; [x][1:v]paletteuse' palette.gif`
const convertToGif = PCancelable.fn(async (options: ConvertOptions, onCancel: PCancelable.OnCancelFunction) => {
  const palettePath = temporaryFile({extension: 'png'});
  const paletteColors = settings.get('lossyCompression', false) ? 128 : 256;

  const paletteProcess = convert(palettePath, {shouldTrack: false}, conditionalArgs(
    '-i', options.inputPath,
    '-vf', `fps=${options.fps}${options.shouldCrop ? `,scale=${options.width}:${options.height}:flags=lanczos` : ''},palettegen=max_colors=${paletteColors}:stats_mode=diff`,
    {
      args: [
        '-ss',
        options.startTime.toString(),
        '-to',
        options.endTime.toString()
      ],
      if: options.shouldCrop
    },
    palettePath
  ));

  onCancel(() => {
    paletteProcess.cancel();
  });

  await paletteProcess;

  // Sometimes if the clip is too short or fps too low, the palette is not generated
  const hasPalette = fs.existsSync(palettePath);

  const shouldLoop = settings.get('loopExports');

  const conversionProcess = convert(options.outputPath, {
    onProgress: (progress, estimate) => {
      options.onProgress('Converting', progress, estimate);
    },
    startTime: options.startTime,
    endTime: options.endTime
  }, conditionalArgs(
    '-i', options.inputPath,
    {
      args: [
        '-i',
        palettePath,
        '-filter_complex',
        `fps=${options.fps}${options.shouldCrop ? `,scale=${options.width}:${options.height}:flags=lanczos` : ''}[x]; [x][1:v]paletteuse=dither=sierra2_4a:diff_mode=rectangle`
      ],
      if: hasPalette
    },
    {
      args: [
        '-vf',
        `fps=${options.fps}${options.shouldCrop ? `,scale=${options.width}:${options.height}:flags=lanczos` : ''}`
      ],
      if: !hasPalette
    },
    '-loop', shouldLoop ? '0' : '-1', // 0 == forever; -1 == no loop
    {
      args: [
        '-ss',
        options.startTime.toString(),
        '-to',
        options.endTime.toString()
      ],
      if: options.shouldCrop
    },
    options.outputPath
  ));

  onCancel(() => {
    conversionProcess.cancel();
  });

  await conversionProcess;

  return options.outputPath;
});

const convertToMp4 = (options: ConvertOptions) => convert(options.outputPath, {
  onProgress: (progress, estimate) => {
    options.onProgress('Converting', progress, estimate);
  },
  startTime: options.startTime,
  endTime: options.endTime
}, conditionalArgs(
  '-i', options.inputPath,
  '-r', options.fps.toString(),
  getVideoEncoderArgs(Format.mp4),
  {
    args: ['-an'],
    if: options.shouldMute
  },
  {
    args: [
      '-s',
      `${makeEven(options.width)}x${makeEven(options.height)}`,
      '-ss',
      options.startTime.toString(),
      '-to',
      options.endTime.toString()
    ],
    if: options.shouldCrop || !areDimensionsEven(options)
  },
  options.outputPath
));

const convertToWebm = (options: ConvertOptions) => convert(options.outputPath, {
  onProgress: (progress, estimate) => {
    options.onProgress('Converting', progress, estimate);
  },
  startTime: options.startTime,
  endTime: options.endTime
}, conditionalArgs(
  '-i', options.inputPath,
  // http://wiki.webmproject.org/ffmpeg
  // https://trac.ffmpeg.org/wiki/Encode/VP9
  '-threads', Math.max(os.cpus().length - 1, 1).toString(),
  '-deadline', 'good', // `best` is twice as slow and only slighty better
  '-b:v', '1M', // Bitrate (same as the MP4)
  '-codec:v', 'vp9',
  '-codec:a', 'vorbis',
  '-ac', '2', // https://stackoverflow.com/questions/19004762/ffmpeg-covert-from-mp4-to-webm-only-working-on-some-files
  '-strict', '-2', // Needed because `vorbis` is experimental
  '-r', options.fps.toString(),
  {
    args: ['-an'],
    if: options.shouldMute
  },
  {
    args: [
      '-s',
      `${makeEven(options.width)}x${makeEven(options.height)}`,
      '-ss',
      options.startTime.toString(),
      '-to',
      options.endTime.toString()
    ],
    if: options.shouldCrop || !areDimensionsEven(options)
  },
  options.outputPath
));

const convertToAv1 = (options: ConvertOptions) => convert(options.outputPath, {
  onProgress: (progress, estimate) => {
    options.onProgress('Converting', progress, estimate);
  },
  startTime: options.startTime,
  endTime: options.endTime
}, conditionalArgs(
  '-i', options.inputPath,
  '-r', options.fps.toString(),
  '-c:v', 'libaom-av1',
  '-c:a', 'libopus',
  '-crf', '34',
  '-b:v', '0',
  '-strict', 'experimental',
  // Enables row-based multi-threading which maximizes CPU usage
  // https://trac.ffmpeg.org/wiki/Encode/AV1
  '-cpu-used', '4',
  '-row-mt', '1',
  '-tiles', '2x2',
  {
    args: ['-an'],
    if: options.shouldMute
  },
  {
    args: [
      '-s',
      `${makeEven(options.width)}x${makeEven(options.height)}`,
      '-ss',
      options.startTime.toString(),
      '-to',
      options.endTime.toString()
    ],
    if: options.shouldCrop || !areDimensionsEven(options)
  },
  options.outputPath
));

const convertToHevc = (options: ConvertOptions) => convert(options.outputPath, {
  onProgress: (progress, estimate) => {
    options.onProgress('Converting', progress, estimate);
  },
  startTime: options.startTime,
  endTime: options.endTime
}, conditionalArgs(
  '-i', options.inputPath,
  '-r', options.fps.toString(),
  getVideoEncoderArgs(Format.hevc),
  '-c:a', 'libopus',
  '-tag:v', 'hvc1', // Metadata for macOS
  {
    args: ['-an'],
    if: options.shouldMute
  },
  {
    args: [
      '-s',
      `${makeEven(options.width)}x${makeEven(options.height)}`,
      '-ss',
      options.startTime.toString(),
      '-to',
      options.endTime.toString()
    ],
    if: options.shouldCrop || !areDimensionsEven(options)
  },
  options.outputPath
));

const convertToApng = (options: ConvertOptions) => convert(options.outputPath, {
  onProgress: (progress, estimate) => {
    options.onProgress('Converting', progress, estimate);
  },
  startTime: options.startTime,
  endTime: options.endTime
}, conditionalArgs(
  '-i', options.inputPath,
  '-vf', `fps=${options.fps}${options.shouldCrop ? `,scale=${options.width}:${options.height}:flags=lanczos` : ''}`,
  // Strange for APNG instead of -loop it uses -plays see: https://stackoverflow.com/questions/43795518/using-ffmpeg-to-create-looping-apng
  '-plays', settings.get('loopExports') ? '0' : '1', // 0 == forever; 1 == no loop
  {
    args: ['-an'],
    if: options.shouldMute
  },
  {
    args: [
      '-ss',
      options.startTime.toString(),
      '-to',
      options.endTime.toString()
    ],
    if: options.shouldCrop
  },
  options.outputPath
));

export const crop = (options: ConvertOptions) => convert(options.outputPath, {
  onProgress: (progress, estimate) => {
    options.onProgress('Cropping', progress, estimate);
  },
  startTime: options.startTime,
  endTime: options.endTime
}, conditionalArgs(
  '-i', options.inputPath,
  '-s', `${makeEven(options.width)}x${makeEven(options.height)}`,
  '-ss', options.startTime.toString(),
  '-to', options.endTime.toString(),
  options.outputPath
));

const converters = new Map([
  [Format.gif, convertToGif],
  [Format.mp4, convertToMp4],
  [Format.hevc, convertToHevc],
  [Format.webm, convertToWebm],
  [Format.apng, convertToApng],
  [Format.av1, convertToAv1]
]);

export default converters;
