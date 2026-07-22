import {App, Format} from './base';
import {ExportStatus} from './conversion-options';

export type RemoteState<State = any, Actions extends Record<string, (...args: any[]) => any> = {}> = {
  actions: Actions;
  state: State;
};

export type RemoteStateHook<Base extends RemoteState> = Base extends RemoteState<infer State, infer Actions> ? (
  Actions & {
    state: State;
    isLoading: boolean;
    refreshState: () => void;
  }
) : never;

export type RemoteStateHandler<Base extends RemoteState> = Base extends RemoteState<infer State, infer Actions> ? (sendUpdate: (state: State, id?: string) => void) => {
  actions: {
    [Key in keyof Actions]: Actions[Key] extends (...args: any[]) => any ? (id: string, ...args: Parameters<Actions[Key]>) => void : never
  };
  getState: (id: string) => State | undefined;
} : never;

export type ExportOptionsFormat = {
  format: Format;
  prettyFormat: string;
  apps: App[];
};

export type ExportOptions = {
  formats: ExportOptionsFormat[];
  fpsHistory: {[key in Format]: number};
};

export type EditorOptionsRemoteState = RemoteState<ExportOptions, {
  updateFpsUsage: ({format, fps}: {
    format: Format;
    fps: number;
  }) => void;
}>;

export interface ExportState {
  id: string;
  title: string;
  description: string;
  message: string;
  progress?: number;
  image?: string;
  filePath?: string;
  error?: Error;
  fileSize?: string;
  status: ExportStatus;
  canCopy: boolean;
  disableOutputActions: boolean;
  canPreviewExport: boolean;
  titleWithFormat: string;
}

export type ExportsRemoteState = RemoteState<ExportState, {
  copy: () => void;
  cancel: () => void;
  retry: () => void;
  openInEditor: () => void;
  showInFolder: () => void;
}>;

export type ExportsListRemoteState = RemoteState<string[]>;
