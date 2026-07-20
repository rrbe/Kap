import {app} from 'electron';
import {getAboutMenuItem, getExportHistoryMenuItem, getOpenFileMenuItem, getPreferencesMenuItem, getSendFeedbackMenuItem} from './common';
import {MenuItemId, MenuOptions} from './utils';

const getAppMenuItem = () => {
  return {
    label: app.name,
    id: MenuItemId.app,
    submenu: [
      getAboutMenuItem(),
      {type: 'separator' as const},
      getPreferencesMenuItem(),
      {type: 'separator' as const},
      {role: 'services' as const},
      {type: 'separator' as const},
      {role: 'hide' as const},
      {role: 'hideOthers' as const},
      {role: 'unhide' as const},
      {type: 'separator' as const},
      {role: 'quit' as const}
    ]
  };
};

export const defaultApplicationMenu = (): MenuOptions => [
  getAppMenuItem(),
  {
    role: 'fileMenu',
    id: MenuItemId.file,
    submenu: [
      getOpenFileMenuItem(),
      {
        type: 'separator'
      },
      {
        role: 'close'
      }
    ]
  },
  {
    role: 'editMenu',
    id: MenuItemId.edit
  },
  {
    role: 'windowMenu',
    id: MenuItemId.window,
    submenu: [
      {
        role: 'minimize'
      },
      {
        role: 'zoom'
      },
      {
        type: 'separator'
      },
      getExportHistoryMenuItem(),
      {
        type: 'separator'
      },
      {
        role: 'front'
      }
    ]
  },
  {
    id: MenuItemId.help,
    label: 'Help',
    role: 'help',
    submenu: [getSendFeedbackMenuItem()]
  }
];

export const customApplicationMenu = (modifier: (defaultMenu: ReturnType<typeof defaultApplicationMenu>) => void) => {
  const menu = defaultApplicationMenu();
  modifier(menu);
  return menu;
};

export type MenuModifier = Parameters<typeof customApplicationMenu>[0];
