import {useState, useEffect} from 'react';

const useDarkMode = () => {
  const {api} = require('electron-util');
  const [isDarkMode, setIsDarkMode] = useState(api.nativeTheme.shouldUseDarkColors);

  useEffect(() => {
    const onChange = () => setIsDarkMode(api.nativeTheme.shouldUseDarkColors);
    api.nativeTheme.on('updated', onChange);
    return () => api.nativeTheme.removeListener('updated', onChange);
  }, []);

  return isDarkMode;
};

export default useDarkMode;
