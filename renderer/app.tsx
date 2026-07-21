import {ComponentType, useEffect} from 'react';
import classNames from 'classnames';
import {ipcRenderer} from 'utils/ipc';

import useDarkMode from './hooks/dark-mode';
import GlobalStyles from './utils/global-styles';
import {WindowStateProvider} from './hooks/window-state';

const App = ({Component}: {Component: ComponentType}) => {
  const isDarkMode = useDarkMode();
  const className = classNames('cover-window', {dark: isDarkMode});

  useEffect(() => {
    ipcRenderer.send('renderer-ready');
  }, []);

  return (
    <div className={className}>
      <WindowStateProvider>
        <Component/>
        <GlobalStyles/>
      </WindowStateProvider>
    </div>
  );
};

export default App;
