import {ipcMain, dialog, app, BrowserWindow, Notification, shell} from 'electron';
import {EventEmitter} from 'events';
import {promises as fs} from 'fs';
import PCancelable, {CancelError, OnCancelFunction} from 'p-cancelable';
import Conversion from './conversion';
import {ipcMain as ipc} from './utils/ipc';
import {setExportMenuItemState} from './menus/utils';
import {Video} from './video';
import {ConversionOptions, ExportDestination, ExportState, ExportStatus, Format, CreateExportOptions} from './common/types';
import {showError} from './utils/errors';
import TypedEventEmitter from 'typed-emitter';
import path from 'path';
import {ensureDockIsShowingSync} from './utils/dock';
import {windowManager} from './windows/manager';
import {settings} from './common/settings';
import {openFileWithApp} from './utils/system-helper';

export interface ExportOptions {
  destination: ExportDestination;
  appUrl?: string;
  targetFilePath?: string;
}

export default class Export extends (EventEmitter as new () => TypedEventEmitter<ExportEvents>) {
  static exportsMap = new Map<string, Export>();
  static events = new EventEmitter() as TypedEventEmitter<ExportsEvents>;

  static get all() {
    return [...this.exportsMap.values()];
  }

  readonly createdAt: number = Date.now();
  conversion?: Conversion;
  status: ExportStatus = ExportStatus.inProgress;

  private text = 'Loading…';
  private percentage = 0;

  private process?: PCancelable<void>;
  private areOutputActionsDisabled = false;
  private error?: Error;
  private readonly description: string;

  private readonly _start = PCancelable.fn(async (onCancel: OnCancelFunction) => {
    this.error = undefined;
    this.text = 'Loading…';

    onCancel(() => {
      this.conversion?.cancel();
    });

    try {
      await this.exportFile();
      this.status = ExportStatus.completed;
      this.text = 'Export completed';
      this.emit('updated', this.data);
    } catch (error) {
      this.captureError(error as any);
    }
  });

  constructor(
    public readonly video: Video,
    private readonly format: Format,
    private readonly conversionOptions: ConversionOptions,
    private readonly options: ExportOptions,
    private readonly title: string = video.title
  ) {
    // eslint-disable-next-line constructor-super
    super();
    Export.addExport(this);
    video.generatePreviewImage();

    this.description = `${this.conversionOptions.width} x ${this.conversionOptions.height} at ${this.conversionOptions.fps} FPS`;

    setExportMenuItemState(true);
  }

  static addExport = (newExport: Export) => {
    Export.exportsMap.set(newExport.id, newExport);
    Export.events.emit('added', newExport.data);

    newExport.on('updated', state => Export.events.emit('updated', state));
  };

  static fromId(id: string) {
    return this.exportsMap.get(id);
  }

  get id() {
    return this.createdAt.toString();
  }

  get canPreviewExport() {
    return [Format.gif, Format.apng].includes(this.format) && this.finalFilePath !== undefined;
  }

  get finalFilePath() {
    const filePath = this.conversion?.convertedFilePath;

    return filePath && (this.options.targetFilePath ?? filePath);
  }

  get data(): ExportState {
    return {
      title: this.title,
      titleWithFormat: `${this.title}.${this.format}`,
      description: this.description,
      canCopy: this.conversion?.canCopy ?? false,
      status: this.status,
      message: this.text,
      progress: this.percentage ?? 0,
      image: this.video.previewImage?.data,
      id: this.id,
      filePath: this.conversion?.convertedFilePath,
      error: this.error,
      fileSize: this.conversion?.finalSize,
      disableOutputActions: this.areOutputActionsDisabled,
      canPreviewExport: this.canPreviewExport
    };
  }

  filePath = async ({fileType}: {fileType?: Format} = {}) => {
    if (fileType) {
      this.areOutputActionsDisabled = true;
    }

    const format = fileType ?? this.format;

    this.conversion = Conversion.getOrCreate(this.video, format, this.conversionOptions);
    this.setupConversionListeners();

    return this.conversion.filePath();
  };

  start = async () => {
    try {
      this.process = this._start();
      await this.process;
    } catch (error) {
      this.captureError(error as any);
    }
  };

  onProgress = (text: string, percentage: number) => {
    if (this.status !== ExportStatus.inProgress) {
      return;
    }

    this.text = text;
    this.percentage = percentage;
    this.emit('updated', this.data);
  };

  cancel = () => {
    this.process?.cancel();
    this.conversion?.cancel();
    this.status = ExportStatus.canceled;
    this.text = 'Export canceled';
    this.emit('updated', this.data);
  };

  retry = () => {
    this.status = ExportStatus.inProgress;
    this.error = undefined;
    this.text = '';
    this.start();
    this.emit('updated', this.data);
  };

  private readonly captureError = (error: Error) => {
    if ((error as CancelError).isCanceled) {
      this.text = 'Export canceled';
      this.status = ExportStatus.canceled;
    } else {
      this.text = 'Export failed';
      this.status = ExportStatus.failed;

      if (!this.error) {
        this.error = error;
        showError(error);
      }
    }

    this.emit('updated', this.data);
  };

  private readonly captureConversionError = (error: Error) => this.captureError(error);

  private readonly exportFile = async () => {
    const temporaryFilePath = await this.filePath();

    if (this.options.destination === 'copy') {
      this.conversion?.copy();
      return;
    }

    if (this.options.destination === 'open') {
      if (this.options.appUrl) {
        openFileWithApp(temporaryFilePath, this.options.appUrl);
      }

      return;
    }

    if (!this.options.targetFilePath) {
      throw new Error('Missing export destination');
    }

    await fs.copyFile(temporaryFilePath, this.options.targetFilePath);

    const notification = new Notification({
      title: 'File saved successfully!',
      body: 'Click to show the file in Finder'
    });

    notification.on('click', () => {
      shell.showItemInFolder(this.options.targetFilePath!);
    });

    notification.show();
  };

  private readonly setupConversionListeners = () => {
    this.conversion?.once('file-size', () => this.emit('updated', this.data));

    this.conversion?.on('cancel', this.cancel);
    this.conversion?.on('progress', this.onProgress);
    this.conversion?.on('error', this.captureConversionError);
    this.conversion?.on('completed', this.cleanConversionListeners);
  };

  private readonly cleanConversionListeners = () => {
    this.conversion?.removeListener('cancel', this.cancel);
    this.conversion?.removeListener('progress', this.onProgress);
    this.conversion?.removeListener('error', this.captureConversionError);
  };
}

type ExportEvents = {
  updated: (state: ExportState) => void;
};

type ExportsEvents = {
  added: (state: ExportState) => void;
  updated: (state: ExportState) => void;
};

const filterMap = new Map([
  [Format.mp4, [{name: 'Movies', extensions: ['mp4']}]],
  [Format.webm, [{name: 'Movies', extensions: ['webm']}]],
  [Format.gif, [{name: 'Images', extensions: ['gif']}]],
  [Format.apng, [{name: 'Images', extensions: ['apng']}]],
  [Format.av1, [{name: 'Movies', extensions: ['mp4']}]],
  [Format.hevc, [{name: 'Movies', extensions: ['mp4']}]]
]);

let lastSavedDirectory: string;

const askForTargetFilePath = async (
  window: BrowserWindow,
  format: Format,
  fileName: string
) => {
  const kapturesDir = settings.get('kapturesDir');
  await fs.mkdir(kapturesDir, {recursive: true});

  const defaultPath = path.join(lastSavedDirectory ?? kapturesDir, fileName);
  const {filePath} = await dialog.showSaveDialog(window, {
    title: fileName,
    defaultPath,
    filters: filterMap.get(format)
  });

  if (filePath) {
    lastSavedDirectory = path.dirname(filePath);
    return filePath;
  }

  return undefined;
};

export const setUpExportsListeners = () => {
  ipcMain.on('drag-export', async (event: any, id: string) => {
    const exportMap = Export.exportsMap.get(id);
    const conversion = exportMap?.conversion;

    if (conversion && (await conversion.filePathExists()) && exportMap?.status === ExportStatus.completed) {
      event.sender.startDrag({
        file: exportMap?.finalFilePath ?? conversion.convertedFilePath,
        icon: await conversion.video.getDragIcon(conversion.options)
      });
    }
  });

  ipc.answerRenderer('create-export', async ({
    filePath, conversionOptions, format, destination, app: selectedApp
  }: CreateExportOptions, window) => {
    const video = Video.fromId(filePath);

    if (!video) {
      return;
    }

    let targetFilePath: string | undefined;
    if (destination === 'save') {
      targetFilePath = await askForTargetFilePath(
        window,
        format,
        video.title
      );

      if (!targetFilePath) {
        return;
      }
    }

    if (destination === 'open' && !selectedApp) {
      return;
    }

    const newExport = new Export(
      video,
      format,
      conversionOptions,
      {
        destination,
        appUrl: selectedApp?.url,
        targetFilePath
      },
      targetFilePath && path.parse(targetFilePath).name
    );

    newExport.start();

    return newExport.id;
  });

  app.on('before-quit', event => {
    if (Export.all.some(exp => exp.status === ExportStatus.inProgress)) {
      windowManager.exports?.open();

      ensureDockIsShowingSync(() => {
        const buttonIndex = dialog.showMessageBoxSync({
          type: 'question',
          buttons: [
            'Continue',
            'Quit'
          ],
          defaultId: 0,
          cancelId: 1,
          message: 'Do you want to continue exporting?',
          detail: 'Kap is currently exporting files. If you quit, the export task will be canceled.'
        });

        if (buttonIndex === 0) {
          event.preventDefault();
        }
      });
    }
  });
};
