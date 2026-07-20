import {app} from 'electron';
import {Promisable} from 'type-fest';

export const ensureDockIsShowing = async (action: () => Promisable<void>) => {
  const {dock} = app;
  if (!dock) {
    await action();
    return;
  }

  const wasDockShowing = dock.isVisible();
  if (!wasDockShowing) {
    await dock.show();
  }

  await action();

  if (!wasDockShowing) {
    dock.hide();
  }
};

export const ensureDockIsShowingSync = (action: () => void) => {
  const {dock} = app;
  if (!dock) {
    action();
    return;
  }

  const wasDockShowing = dock.isVisible();
  if (!wasDockShowing) {
    dock.show();
  }

  action();

  if (!wasDockShowing) {
    dock.hide();
  }
};
