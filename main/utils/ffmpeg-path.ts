import ffmpeg from 'ffmpeg-static';
import util from 'electron-util';

if (!ffmpeg) {
  throw new Error(`ffmpeg-static does not support ${process.platform}/${process.arch}`);
}

const ffmpegPath = util.fixPathForAsarUnpack(ffmpeg);

export default ffmpegPath;
