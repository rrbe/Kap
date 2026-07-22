import type {BrowserWindow} from 'electron';
import {MacWindow} from '../utils/windows';
import type {Video} from '../video';
import type {DialogOptions} from './dialog';

export interface EditorManager {
  open: (video: Video) => Promise<void>;
  areAnyBlocking: () => boolean;
}

export interface CropperManager {
  open: () => Promise<void>;
  close: () => void;
  disable: () => void;
  setCountdown: (displayId: number, seconds: number | null) => void;
  setRecording: () => void;
  isOpen: () => boolean;
  selectApp: (window: MacWindow, activateWindow: (ownerName: string) => Promise<void>) => void;
}

export interface DialogManager {
  open: (options: DialogOptions) => Promise<number | void>;
}

export interface ExportsManager {
  open: () => Promise<BrowserWindow>;
  get: () => BrowserWindow | undefined;
}

export interface PreferencesManager {
  open: () => Promise<BrowserWindow>;
  close: () => void;
}

export class WindowManager {
  editor?: EditorManager;
  cropper?: CropperManager;
  dialog?: DialogManager;
  exports?: ExportsManager;
  preferences?: PreferencesManager;

  setEditor = (editorManager: EditorManager) => {
    this.editor = editorManager;
  };

  setCropper = (cropperManager: CropperManager) => {
    this.cropper = cropperManager;
  };

  setDialog = (dialogManager: DialogManager) => {
    this.dialog = dialogManager;
  };

  setExports = (exportsManager: ExportsManager) => {
    this.exports = exportsManager;
  };

  setPreferences = (preferencesManager: PreferencesManager) => {
    this.preferences = preferencesManager;
  };
}

export const windowManager = new WindowManager();
