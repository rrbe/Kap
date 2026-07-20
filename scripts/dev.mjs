import {spawn} from 'node:child_process';
import path from 'node:path';
import {createServer} from 'vite';

const main = async () => {
  const server = await createServer({
    configFile: path.resolve('renderer/vite.config.ts')
  });

  await server.listen();
  server.printUrls();

  const electron = spawn('run-electron', ['.'], {
    env: process.env,
    stdio: 'inherit'
  });

  process.exitCode = await new Promise((resolve, reject) => {
    electron.once('error', reject);
    electron.once('exit', code => resolve(code ?? 1));
  });

  await server.close();
};

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
