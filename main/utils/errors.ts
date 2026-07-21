import path from 'path';
import {inspect} from 'util';
import os from 'os';
import {clipboard, app} from 'electron';
import macosRelease from './macos-release';

import {windowManager} from '../windows/manager';
import {InstalledPlugin} from '../plugins/plugin';
import {openGitHubIssue} from './github-issue';

const ensureError = (value: unknown) => value instanceof Error ? value : new Error(inspect(value));

const ERRORS_TO_IGNORE = [
  /net::ERR_CONNECTION_TIMED_OUT/,
  /net::ERR_NETWORK_IO_SUSPENDED/,
  /net::ERR_CONNECTION_CLOSED/
];

const shouldIgnoreError = (errorText: string) => ERRORS_TO_IGNORE.some(regex => regex.test(errorText));

const getPrettyStack = (error: Error) => {
  const pluginsPath = path.join(app.getPath('userData'), 'plugins', 'node_modules');
  return (error.stack ?? '')
    .replaceAll('\\', '/')
    .split('\n')
    .filter(line => !line.includes('node:internal/') && !line.includes('/electron.asar/'))
    .map(line => line.replace(pluginsPath, '').replace(os.homedir(), '~'))
    .join('\n');
};

const release = macosRelease();

const getIssueBody = (title: string, errorStack: string) => `
<!--
Thank you for helping us test Kap. Your feedback helps us make Kap better for everyone!
-->

**macOS version:**    ${release.name} (${release.version})
**Kap version:**      ${app.getVersion()}

\`\`\`
${title}

${errorStack}
\`\`\`

<!-- If you have additional information, enter it below. -->
`;

export const showError = async (
  error: Error,
  {
    title: customTitle,
    plugin
  }: {
    title?: string;
    plugin?: InstalledPlugin;
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

  // If it's a plugin error, offer to open an issue on the plugin repo (if known)
  if (plugin) {
    const openIssueButton = plugin.repoUrl && {
      label: 'Open Issue',
      action: () => {
        openGitHubIssue({
          repoUrl: plugin.repoUrl,
          title,
          body: getIssueBody(title, detail)
        });
      }
    };

    return windowManager.dialog?.open({
      title,
      detail,
      cancelId: 0,
      defaultId: openIssueButton ? 2 : 0,
      buttons: [...mainButtons, openIssueButton].filter(Boolean)
    });
  }

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
