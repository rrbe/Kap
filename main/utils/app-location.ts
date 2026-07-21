import {app, dialog} from 'electron';
import {isDevelopment} from './environment';

export const enforceMacOSAppLocation = () => {
  if (isDevelopment || process.platform !== 'darwin' || app.isInApplicationsFolder()) {
    return;
  }

  const response = dialog.showMessageBoxSync({
    type: 'error',
    message: 'Move to Applications folder?',
    detail: `${app.name} must live in the Applications folder to run correctly.`,
    buttons: ['Move to Applications folder', `Quit ${app.name}`],
    defaultId: 0,
    cancelId: 1
  });

  if (response === 1) {
    app.quit();
    return;
  }

  app.moveToApplicationsFolder({
    conflictHandler: conflict => {
      if (conflict === 'existsAndRunning') {
        dialog.showMessageBoxSync({
          type: 'error',
          message: `Another version of ${app.name} is running. Quit it, then launch this version again.`,
          buttons: ['OK']
        });
        app.quit();
      }

      return true;
    }
  });
};
