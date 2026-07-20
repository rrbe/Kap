export const hasExportEdits = (
  {width, height, fps, startTime, endTime}: {width: number; height: number; fps: number; startTime: number; endTime: number},
  source: {width: number; height: number; fps: number; duration: number}
) => width !== source.width ||
  height !== source.height ||
  fps !== source.fps ||
  startTime > 0 ||
  endTime < source.duration;
