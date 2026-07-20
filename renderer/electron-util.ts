const electronUtil = (window as any).require('electron-util') as typeof import('electron-util');

export const {api, darkMode, is} = electronUtil;
export default electronUtil;
