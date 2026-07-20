const byteUnits = ['B', 'kB', 'MB', 'GB', 'TB'];

export const formatBytes = (bytes: number) => {
  if (bytes === 0) {
    return '0 B';
  }

  const exponent = Math.min(Math.floor(Math.log10(Math.abs(bytes)) / 3), byteUnits.length - 1);
  const value = Number((bytes / (1000 ** exponent)).toPrecision(3));
  return `${value} ${byteUnits[exponent]}`;
};

const durationUnits = [
  {milliseconds: 365 * 24 * 60 * 60 * 1000, suffix: 'y'},
  {milliseconds: 24 * 60 * 60 * 1000, suffix: 'd'},
  {milliseconds: 60 * 60 * 1000, suffix: 'h'},
  {milliseconds: 60 * 1000, suffix: 'm'},
  {milliseconds: 1000, suffix: 's'}
];

export const formatDuration = (milliseconds: number) => {
  const unit = durationUnits.find(({milliseconds: unitMilliseconds}) => milliseconds >= unitMilliseconds);
  return unit ? `${Math.floor(milliseconds / unit.milliseconds)}${unit.suffix}` : `${Math.ceil(milliseconds)}ms`;
};
