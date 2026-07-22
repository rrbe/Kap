import {inspect} from 'util';
import os from 'os';
import {clipboard, app} from 'electron';

import {windowManager} from '../windows/manager';

const ensureError = (value: unknown) => value instanceof Error ? value : new Error(inspect(value));

const ERRORS_TO_IGNORE = [
  /net::ERR_CONNECTION_TIMED_OUT/,
  /net::ERR_NETWORK_IO_SUSPENDED/,
  /net::ERR_CONNECTION_CLOSED/
];

const shouldIgnoreError = (errorText: string) => ERRORS_TO_IGNORE.some(regex => regex.test(errorText));

const getPrettyStack = (error: Error) => {
  return (error.stack ?? '')
    .replaceAll('\\', '/')
    .split('\n')
    .filter(line => !line.includes('node:internal/') && !line.includes('/electron.asar/'))
    .map(line => line.replace(os.homedir(), '~'))
    .join('\n');
};

export const showError = async (
  error: Error,
  {
    title: customTitle
  }: {
    title?: string;
  } = {}
) => {
  await app.whenReady();
  const ensuredError = ensureError(error);
  const title = customTitle ?? ensuredError.name;
  const detail = getPrettyStack(ensuredError);

  console.log(error);
  if (shouldIgnoreError(`${title}\n${detail}`)) {
    return;
  }

  const mainButtons = [
    'Close',
    {
      label: 'Copy Error',
      action: () => {
        clipboard.writeText(`${title}\n${detail}`);
      }
    }
  ];

  return windowManager.dialog?.open({
    title,
    detail,
    buttons: mainButtons,
    cancelId: 0,
    defaultId: 0
  });
};

export const setupErrorHandling = () => {
  process.on('uncaughtException', error => {
    showError(error, {title: 'Unhandled Error'});
  });

  process.on('unhandledRejection', error => {
    showError(ensureError(error), {title: 'Unhandled Promise Rejection'});
  });
};
