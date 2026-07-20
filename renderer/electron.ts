const electron = (window as any).require('electron') as typeof import('electron');

export const {ipcRenderer, remote} = electron;
export default electron;
