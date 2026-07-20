import ffmpeg from 'ffmpeg-static';
import {fixPathForAsarUnpack} from './environment';

if (!ffmpeg) {
  throw new Error(`ffmpeg-static does not support ${process.platform}/${process.arch}`);
}

const ffmpegPath = fixPathForAsarUnpack(ffmpeg);

export default ffmpegPath;
