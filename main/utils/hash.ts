import {createHash} from 'crypto';

const sortObjectKeys = (_key: string, value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }

  return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)));
};

export const hashObject = (value: unknown) => createHash('sha256')
  .update(JSON.stringify(value, sortObjectKeys))
  .digest('hex');
