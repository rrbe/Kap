import Store from 'electron-store';
import path from 'path';
import {App, EditorOptionsRemoteState, ExportOptions, Format, RemoteStateHandler} from '../common/types';
import {formats, getFormatExtension} from '../common/constants';
import {prettifyFormat} from '../utils/formats';
import {getAppsThatOpenExtension} from '../utils/system-helper';

const fpsUsageHistory = new Store<{[key in Format]: number}>({
  name: 'fps-usage-history',
  schema: {
    apng: {
      type: 'number',
      minimum: 0,
      default: 60
    },
    webm: {
      type: 'number',
      minimum: 0,
      default: 60
    },
    mp4: {
      type: 'number',
      minimum: 0,
      default: 60
    },
    gif: {
      type: 'number',
      minimum: 0,
      default: 60
    },
    av1: {
      type: 'number',
      minimum: 0,
      default: 60
    },
    hevc: {
      type: 'number',
      minimum: 0,
      default: 60
    }
  }
});

const getAppsForFormat = (format: Format): App[] => {
  return getAppsThatOpenExtension(getFormatExtension(format))
    .map(app => ({...app, name: decodeURI(path.parse(app.url).name)}))
    .filter(app => !['Kap', 'Kap Beta'].includes(app.name))
    .sort((a, b) => {
      if (a.isDefault !== b.isDefault) {
        return Number(b.isDefault) - Number(a.isDefault);
      }

      return Number(b.name === 'Gifski') - Number(a.name === 'Gifski');
    });
};

const getExportOptions = () => formats.map(format => ({
  format,
  prettyFormat: prettifyFormat(format),
  apps: getAppsForFormat(format)
}));

const editorOptionsRemoteState: RemoteStateHandler<EditorOptionsRemoteState> = sendUpdate => {
  const state: ExportOptions = {
    formats: getExportOptions(),
    fpsHistory: fpsUsageHistory.store
  };

  const actions = {
    updateFpsUsage: (_: string, {format, fps}: {format: Format; fps: number}) => {
      fpsUsageHistory.set(format, fps);
      state.fpsHistory = fpsUsageHistory.store;
      sendUpdate(state);
    }
  };

  return {
    actions,
    getState: () => state
  };
};

export default editorOptionsRemoteState;
export const name = 'editor-options';
