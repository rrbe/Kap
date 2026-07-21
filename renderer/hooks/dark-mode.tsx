import {useState, useEffect} from 'react';

const useDarkMode = () => {
  const [isDarkMode, setIsDarkMode] = useState(window.kap.appearance.get().darkMode);

  useEffect(() => {
    const listenerId = window.kap.appearance.onChanged(() => {
      setIsDarkMode(window.kap.appearance.get().darkMode);
    });
    return () => window.kap.appearance.removeListener(listenerId);
  }, []);

  return isDarkMode;
};

export default useDarkMode;
