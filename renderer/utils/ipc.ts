const ipcRenderer = {
  callMain: window.kap.ipc.callMain,
  answerMain: <DataType, ReturnType = unknown>(channel: string, callback: (data: DataType) => ReturnType | PromiseLike<ReturnType>) => {
    const listenerId = window.kap.ipc.answerMain(channel, callback);
    return () => window.kap.ipc.removeListener(listenerId);
  },
  send: window.kap.ipc.send,
  on: (channel: string, callback: (...args: any[]) => void) => {
    window.kap.ipc.on(channel, (...args: any[]) => callback({}, ...args));
  }
};

export {ipcRenderer};
