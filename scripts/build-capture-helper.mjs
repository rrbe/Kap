import {execFile} from 'node:child_process';
import {chmod, mkdir} from 'node:fs/promises';
import path from 'node:path';
import {promisify} from 'node:util';

const main = async () => {
  const execFileAsync = promisify(execFile);
  const packagePath = path.resolve('native/capture-helper');
  const apertureCheckout = path.join(packagePath, '.build/checkouts/Aperture');
  const aperturePatch = path.join(packagePath, 'aperture.patch');
  const outputPath = path.resolve('dist-js/kap-capture');
  const architectures = ['arm64', 'x86_64'];

  await execFileAsync('swift', ['package', '--package-path', packagePath, 'resolve']);
  try {
    await execFileAsync('git', ['apply', '--check', aperturePatch], {cwd: apertureCheckout});
    await execFileAsync('git', ['apply', aperturePatch], {cwd: apertureCheckout});
  } catch {
    // A reverse check succeeds only when this exact patch is already applied.
    await execFileAsync('git', ['apply', '--reverse', '--check', aperturePatch], {cwd: apertureCheckout});
  }

  const binaryPaths = await Promise.all(architectures.map(async architecture => {
    await execFileAsync('swift', [
      'build',
      '--package-path',
      packagePath,
      '--configuration',
      'release',
      '--arch',
      architecture
    ]);

    const {stdout} = await execFileAsync('swift', [
      'build',
      '--package-path',
      packagePath,
      '--configuration',
      'release',
      '--arch',
      architecture,
      '--show-bin-path'
    ]);
    return path.join(stdout.trim(), 'kap-capture');
  }));

  await mkdir(path.dirname(outputPath), {recursive: true});
  await execFileAsync('lipo', ['-create', ...binaryPaths, '-output', outputPath]);
  await chmod(outputPath, 0o755);
};

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
