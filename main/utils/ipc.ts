import {BrowserWindow, ipcMain as electronIpcMain} from 'electron';

type RendererCallback<DataType, ReturnType> = (
  data: DataType,
  browserWindow: BrowserWindow
) => ReturnType | PromiseLike<ReturnType>;

type MainIpc = typeof electronIpcMain & {
  callRenderer: <DataType, ReturnType = unknown>(
    browserWindow: BrowserWindow,
    channel: string,
    data?: DataType
  ) => Promise<ReturnType>;
  answerRenderer: {
    <DataType, ReturnType = unknown>(channel: string, callback: RendererCallback<DataType, ReturnType>): () => void;
    <DataType, ReturnType = unknown>(browserWindow: BrowserWindow, channel: string, callback: RendererCallback<DataType, ReturnType>): () => void;
  };
};

const getCallMainChannel = (channel: string) => `kap:main-call:${channel}`;
const getCallRendererChannel = (windowId: number, channel: string) => `kap:renderer-call:${windowId}:${channel}`;
const getResponseChannels = (prefix: string) => {
  const id = `${Date.now()}-${Math.random()}`;
  return {
    dataChannel: `kap:response:${prefix}:${id}:data`,
    errorChannel: `kap:response:${prefix}:${id}:error`
  };
};

const serializeError = (value: unknown) => value instanceof Error ? {
  name: value.name,
  message: value.message,
  stack: value.stack
} : value;

const deserializeError = (value: any) => {
  const error = new Error(value?.message ?? String(value));
  if (value && typeof value === 'object') {
    Object.assign(error, value);
  }

  return error;
};

const callRenderer = <DataType, ReturnType = unknown>(browserWindow: BrowserWindow, channel: string, data?: DataType) => new Promise<ReturnType>((resolve, reject) => {
  const {dataChannel, errorChannel} = getResponseChannels(`${browserWindow.id}:${channel}`);
  const cleanup = () => {
    electronIpcMain.removeListener(dataChannel, onData);
    electronIpcMain.removeListener(errorChannel, onError);
  };

  const onData = (event: Electron.IpcMainEvent, result: ReturnType) => {
    if (event.sender !== browserWindow.webContents) {
      return;
    }

    cleanup();
    resolve(result);
  };

  const onError = (event: Electron.IpcMainEvent, error: unknown) => {
    if (event.sender !== browserWindow.webContents) {
      return;
    }

    cleanup();
    reject(deserializeError(error));
  };

  electronIpcMain.on(dataChannel, onData);
  electronIpcMain.on(errorChannel, onError);
  browserWindow.webContents.send(getCallRendererChannel(browserWindow.id, channel), {
    dataChannel,
    errorChannel,
    userData: data
  });
});

function answerRenderer<DataType, ReturnType = unknown>(channel: string, callback: RendererCallback<DataType, ReturnType>): () => void;
function answerRenderer<DataType, ReturnType = unknown>(browserWindow: BrowserWindow, channel: string, callback: RendererCallback<DataType, ReturnType>): () => void;
function answerRenderer<DataType, ReturnType = unknown>(
  browserWindowOrChannel: BrowserWindow | string,
  channelOrCallback: string | RendererCallback<DataType, ReturnType>,
  optionalCallback?: RendererCallback<DataType, ReturnType>
) {
  const browserWindow = typeof browserWindowOrChannel === 'string' ? undefined : browserWindowOrChannel;
  const channel = typeof browserWindowOrChannel === 'string' ? browserWindowOrChannel : channelOrCallback as string;
  const callback = (typeof channelOrCallback === 'function' ? channelOrCallback : optionalCallback)!;
  const sendChannel = getCallMainChannel(channel);

  const listener = async (event: Electron.IpcMainEvent, data: any) => {
    const senderWindow = BrowserWindow.fromWebContents(event.sender);
    if (!senderWindow || (browserWindow && browserWindow !== senderWindow)) {
      return;
    }

    try {
      event.sender.send(data.dataChannel, await callback(data.userData, senderWindow));
    } catch (error) {
      event.sender.send(data.errorChannel, serializeError(error));
    }
  };

  electronIpcMain.on(sendChannel, listener);
  return () => electronIpcMain.removeListener(sendChannel, listener);
}

export const ipcMain: MainIpc = Object.assign(electronIpcMain, {callRenderer, answerRenderer});
