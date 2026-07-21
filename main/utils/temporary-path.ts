import {randomUUID} from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

export const temporaryFile = ({extension = ''}: {extension?: string} = {}) => {
  const suffix = extension ? `.${extension.replace(/^\./, '')}` : '';
  return path.join(os.tmpdir(), `${randomUUID()}${suffix}`);
};

export const temporaryDirectory = () => fs.mkdtempSync(path.join(os.tmpdir(), 'kap-'));
