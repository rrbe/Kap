export type KapApi = {
  ipc: {
    callMain: <DataType, ReturnType = unknown>(channel: string, data?: DataType) => Promise<ReturnType>;
    answerMain: <DataType, ReturnType = unknown>(channel: string, callback: (data: DataType) => ReturnType | PromiseLike<ReturnType>) => number;
    removeListener: (listenerId: number) => void;
    send: (channel: string, data?: any) => void;
    on: (channel: string, callback: (...args: any[]) => void) => number;
  };
  window: {
    getState: () => any;
    close: () => Promise<any>;
    minimize: () => Promise<any>;
    toggleFullScreen: () => Promise<any>;
    setBounds: (bounds: {x: number; y: number; width: number; height: number}, animate?: boolean) => Promise<any>;
    setResizable: (resizable: boolean, fullScreenable: boolean) => Promise<any>;
    setIgnoreMouseEvents: (ignore: boolean) => Promise<any>;
  };
  settings: {
    get: (key: string) => any;
    getStore: () => any;
    set: (key: string, value: any) => void;
    onChanged: (callback: (...args: any[]) => void) => number;
    removeListener: (listenerId: number) => void;
  };
  flags: {
    get: (key: string) => any;
    set: (key: string, value: any) => void;
  };
  app: {
    getInfo: () => any;
  };
  appearance: {
    get: (colorNames?: string[]) => any;
    onChanged: (callback: () => void) => number;
    removeListener: (listenerId: number) => void;
  };
  menu: {
    popup: (template: any[], options: any) => Promise<string | undefined>;
    prepareWindows: (selectedApp: string) => Promise<any>;
    popupWindows: (options: any) => Promise<any>;
    popupCog: (options: any) => Promise<any>;
  };
  recording: {
    start: (options: any) => Promise<any>;
    getSelectedInputDeviceId: () => string;
  };
  dialog: {
    showMessage: (options: any) => Promise<any>;
    pickDirectory: () => Promise<string | undefined>;
  };
  shell: {
    openPath: (path: string) => Promise<any>;
    openExternal: (url: string) => Promise<any>;
  };
  preferences: {
    open: (options?: any) => Promise<any>;
    get: () => Promise<any>;
    getAudioDevices: () => Promise<any>;
    getPluginsFromNpm: () => Promise<any>;
    installPlugin: (name: string) => Promise<any>;
    uninstallPlugin: (name: string) => Promise<any>;
    openPluginConfig: (name: string) => Promise<any>;
    ensureMicrophonePermissions: () => Promise<boolean>;
    track: (path: string) => Promise<any>;
    showError: (message: string) => Promise<any>;
    setOpenOnStartup: (open: boolean) => Promise<any>;
  };
  config: {
    get: (pluginName: string, serviceTitle?: string) => Promise<any>;
    change: (key: string, value: any, serviceTitle?: string) => Promise<any>;
    open: () => Promise<any>;
    viewOnGithub: () => Promise<any>;
  };
};
