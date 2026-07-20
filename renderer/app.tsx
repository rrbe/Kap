import {ComponentType, useEffect} from 'react';
import classNames from 'classnames';
import {ipcRenderer} from 'electron-better-ipc';

import useDarkMode from './hooks/dark-mode';
import GlobalStyles from './utils/global-styles';
import SentryErrorBoundary from './utils/sentry-error-boundary';
import {WindowStateProvider} from './hooks/window-state';

const App = ({Component}: {Component: ComponentType}) => {
  const isDarkMode = useDarkMode();
  const className = classNames('cover-window', {dark: isDarkMode});

  useEffect(() => {
    ipcRenderer.send('renderer-ready');
  }, []);

  return (
    <div className={className}>
      <SentryErrorBoundary>
        <WindowStateProvider>
          <Component/>
          <GlobalStyles/>
        </WindowStateProvider>
      </SentryErrorBoundary>
    </div>
  );
};

export default App;
