const getProperty = (object: any, key: string) => {
  let value = object;
  for (const part of key.split('.')) {
    value = value?.[part];
  }

  return value;
};

export const settings = {
  get: (key: string) => window.kap.settings.get(key),
  set: (key: string, value: any) => window.kap.settings.set(key, value),
  onDidChange: (key: string, callback: (value: any, oldValue: any) => void) => {
    const listenerId = window.kap.settings.onChanged((store: any, oldStore: any) => {
      const value = getProperty(store, key);
      const oldValue = getProperty(oldStore, key);
      if (value !== oldValue) {
        callback(value, oldValue);
      }
    });

    return () => window.kap.settings.removeListener(listenerId);
  }
};
