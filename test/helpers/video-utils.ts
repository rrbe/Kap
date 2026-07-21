import moment from 'moment';
import execa from 'execa';

const ffmpegPath = require('ffmpeg-static');

const getDuration = (text: string): number => {
  const durationString = /Duration: ([\d:.]*)/.exec(text)?.[1];
  return moment.duration(durationString).asSeconds();
};

const getEncoding = (text: string) => /Stream.*Video: (.*?)[, ]/.exec(text)?.[1];

const getFps = (text: string) => {
  // GIF stores frame delays in centiseconds, so FFmpeg can report a peak `fps`
  // that differs from the requested average `tbr`.
  const fpsString = /([\d.]*) tbr/.exec(text)?.[1] ?? /([\d.]*) fps/.exec(text)?.[1];
  return Number.parseFloat(fpsString!);
};

const getSize = (text: string) => {
  const sizeText = /Video:.*?, (\d*x\d*)/.exec(text)?.[1]!;
  const parts = sizeText.split('x');
  return {
    width: Number.parseFloat(parts[0]),
    height: Number.parseFloat(parts[1])
  };
};

const getHasAudio = (text: string) => /Stream #.*: Audio/.test(text);

// @ts-expect-error
export const getVideoMetadata = async (path: string): Promise<{
  duration: number;
  encoding: string;
  fps: number;
  size: {width: number; height: number};
  hasAudio: boolean;
}> => {
  try {
    await execa(ffmpegPath, ['-i', path]);
  } catch (error) {
    const {stderr} = error as any;
    return {
      duration: getDuration(stderr),
      encoding: getEncoding(stderr)!,
      fps: getFps(stderr)!,
      size: getSize(stderr) as {width: number; height: number},
      hasAudio: getHasAudio(stderr)!
    };
  }
};
