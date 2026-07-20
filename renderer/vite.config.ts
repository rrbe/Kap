import path from 'node:path';
import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';

const root = import.meta.dirname;

export default defineConfig({
  root,
  base: './',
  plugins: [
    babel({
      plugins: [
        'styled-jsx/babel',
        ['@babel/plugin-transform-react-jsx', {runtime: 'automatic'}]
      ]
    }),
    react()
  ],
  resolve: {
    preserveSymlinks: true,
    alias: {
      common: path.resolve(root, 'common'),
      components: path.resolve(root, 'components'),
      containers: path.resolve(root, 'containers'),
      'electron-better-ipc': path.resolve(root, 'electron-better-ipc.ts'),
      hooks: path.resolve(root, 'hooks'),
      utils: path.resolve(root, 'utils'),
      vectors: path.resolve(root, 'vectors')
    }
  },
  server: {
    host: '127.0.0.1',
    port: 8000,
    strictPort: true
  },
  optimizeDeps: {
    rolldownOptions: {
      moduleTypes: {'.js': 'jsx'}
    }
  },
  build: {
    outDir: 'out',
    emptyOutDir: true,
    sourcemap: true,
    target: 'chrome91'
  }
});
