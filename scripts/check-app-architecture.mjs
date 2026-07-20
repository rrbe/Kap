import {execFileSync} from 'node:child_process';
import {readdirSync} from 'node:fs';
import path from 'node:path';

const [appPath, architecture] = process.argv.slice(2);
const architectureNames = new Map([
  ['arm64', 'arm64'],
  ['x64', 'x86_64']
]);

if (!appPath || !architectureNames.has(architecture)) {
  throw new Error('Usage: check-app-architecture.mjs <app-path> <arm64|x64>');
}

const files = [];
const collectFiles = directory => {
  for (const entry of readdirSync(directory, {withFileTypes: true})) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      collectFiles(entryPath);
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }
};

collectFiles(path.resolve(appPath));

const machOFiles = [];
for (let index = 0; index < files.length; index += 100) {
  const output = execFileSync('file', files.slice(index, index + 100), {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024
  });

  machOFiles.push(...output.split('\n').filter(line =>
    line.includes('Mach-O') && !line.includes('(for architecture')));
}

const expectedArchitecture = architectureNames.get(architecture);
const incompatibleFiles = machOFiles.filter(line =>
  !line.includes('universal binary') && !line.includes(expectedArchitecture));

if (machOFiles.length === 0) {
  throw new Error(`No Mach-O files found in ${appPath}`);
}

if (incompatibleFiles.length > 0) {
  throw new Error(`Found incompatible Mach-O files:\n${incompatibleFiles.join('\n')}`);
}

console.log(`Verified ${machOFiles.length} Mach-O files for ${architecture}`);
