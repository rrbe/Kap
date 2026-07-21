import {createHash} from 'node:crypto';
import {readFileSync, statSync, writeFileSync} from 'node:fs';
import path from 'node:path';

const [arm64Zip, x64Zip, outputPath] = process.argv.slice(2);

if (!arm64Zip || !x64Zip || !outputPath) {
  throw new Error('Usage: create-update-metadata.mjs <arm64-zip> <x64-zip> <output>');
}

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const fileInfo = filePath => ({
  url: path.basename(filePath),
  sha512: createHash('sha512').update(readFileSync(filePath)).digest('base64'),
  size: statSync(filePath).size
});
const files = [fileInfo(arm64Zip), fileInfo(x64Zip)];
const fallback = files.find(file => file.url.includes('x64')) ?? files[0];

const metadata = [
  `version: ${packageJson.version}`,
  'files:',
  ...files.flatMap(file => [
    `  - url: ${file.url}`,
    `    sha512: ${file.sha512}`,
    `    size: ${file.size}`
  ]),
  `path: ${fallback.url}`,
  `sha512: ${fallback.sha512}`,
  `releaseDate: '${new Date().toISOString()}'`,
  ''
].join('\n');

writeFileSync(outputPath, metadata);
console.log(`Wrote ${outputPath}`);
