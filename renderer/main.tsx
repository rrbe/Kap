import React from 'react';
import {createRoot} from 'react-dom/client';

import App from './app';

const pages = {
  cropper: async () => import('./pages/cropper'),
  dialog: async () => import('./pages/dialog'),
  editor: async () => import('./pages/editor'),
  exports: async () => import('./pages/exports'),
  preferences: async () => import('./pages/preferences')
};

const route = new URLSearchParams(window.location.search).get('route') as keyof typeof pages;
const loadPage = pages[route];

if (!loadPage) {
  throw new Error(`Unknown renderer route: ${route || '(missing)'}`);
}

const {default: Component} = await loadPage();
const root = document.querySelector('#root');

if (!root) {
  throw new Error('Missing renderer root element');
}

createRoot(root).render(<App Component={Component}/>);
