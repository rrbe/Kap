import {ChildProcessWithoutNullStreams, spawn} from 'child_process';
import readline from 'readline';
import path from 'path';
import {temporaryFile} from './temporary-path';
import {fixPathForAsarUnpack} from './environment';

import {ApertureOptions} from '../common/types';

export type CaptureMessage = {
  event: string;
  value?: boolean;
  message?: string;
};

export const parseCaptureMessage = (line: string): CaptureMessage => {
  const message = JSON.parse(line) as Partial<CaptureMessage>;
  if (typeof message.event !== 'string') {
    throw new TypeError('Capture helper returned an invalid event');
  }

  return message as CaptureMessage;
};

type Waiter = {
  resolve: (message: CaptureMessage) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
};

const defaultBinaryPath = fixPathForAsarUnpack(path.join(__dirname, '..', 'kap-capture'));

export class ScreenRecorder {
  completion?: Promise<void>;

  private readonly binaryPath: string;
  private recorder?: ChildProcessWithoutNullStreams;
  private reader?: readline.Interface;
  private outputPath?: string;
  private stderr = '';
  private expectedExit = false;
  private readonly waiters = new Map<string, Waiter>();
  private exitPromise?: Promise<void>;
  private resolveExit?: () => void;
  private resolveCompletion?: () => void;
  private rejectCompletion?: (error: Error) => void;

  constructor(binaryPath = defaultBinaryPath) {
    this.binaryPath = binaryPath;
  }

  async startRecording(options: ApertureOptions) {
    if (this.recorder) {
      throw new Error('Call `.stopRecording()` first');
    }

    this.outputPath = temporaryFile({extension: 'mp4'});
    this.stderr = '';
    this.expectedExit = false;

    this.completion = new Promise<void>((resolve, reject) => {
      this.resolveCompletion = resolve;
      this.rejectCompletion = reject;
    });
    // Recording failures are observed by aperture.ts after startup.
    void this.completion.catch(() => undefined);

    this.exitPromise = new Promise(resolve => {
      this.resolveExit = resolve;
    });

    const started = this.waitFor('started', 30_000);
    const recorder = spawn(this.binaryPath, [JSON.stringify({
      ...options,
      destination: this.outputPath
    })]);
    this.recorder = recorder;
    this.reader = readline.createInterface({input: recorder.stdout});
    this.reader.on('line', line => {
      try {
        this.handleMessage(parseCaptureMessage(line));
      } catch (error) {
        this.fail(error as Error);
      }
    });
    recorder.stderr.setEncoding('utf8');
    recorder.stderr.on('data', chunk => {
      this.stderr += chunk;
    });
    recorder.once('error', error => this.fail(error));
    recorder.once('exit', (code, signal) => this.handleExit(code, signal));

    try {
      await started;
      return this.outputPath;
    } catch (error) {
      this.expectedExit = true;
      recorder.kill();
      throw error;
    }
  }

  async stopRecording() {
    const outputPath = this.outputPath;
    if (!outputPath) {
      throw new Error('Call `.startRecording()` first');
    }

    this.expectedExit = true;
    await this.command('stop', 'stopped');
    await this.exitPromise;
    return outputPath;
  }

  async cancelRecording() {
    this.expectedExit = true;
    await this.command('cancel', 'cancelled');
    await this.exitPromise;
  }

  async pause() {
    await this.command('pause', 'paused');
  }

  async resume() {
    await this.command('resume', 'resumed');
  }

  async isPaused() {
    const message = await this.command('isPaused', 'pausedState');
    return message.value === true;
  }

  private async command(command: string, event: string) {
    if (!this.recorder?.stdin.writable) {
      throw new Error('Call `.startRecording()` first');
    }

    const response = this.waitFor(event, 30_000);
    this.recorder.stdin.write(`${command}\n`);
    return response;
  }

  private async waitFor(event: string, timeoutMilliseconds: number) {
    return new Promise<CaptureMessage>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.waiters.delete(event);
        reject(new Error(`Capture helper timed out waiting for ${event}`));
      }, timeoutMilliseconds);

      this.waiters.set(event, {resolve, reject, timeout});
    });
  }

  private handleMessage(message: CaptureMessage) {
    if (message.event === 'failure') {
      this.fail(new Error(message.message ?? 'Capture helper failed'));
      return;
    }

    const waiter = this.waiters.get(message.event);
    if (waiter) {
      clearTimeout(waiter.timeout);
      this.waiters.delete(message.event);
      waiter.resolve(message);
    }
  }

  private handleExit(code: number | null, signal: NodeJS.Signals | null) {
    this.resolveExit?.();

    if (this.expectedExit && code === 0) {
      this.resolveCompletion?.();
    } else {
      const details = this.stderr.trim() || `exit code ${code ?? 'unknown'}${signal ? ` (${signal})` : ''}`;
      this.fail(new Error(`Capture helper exited unexpectedly: ${details}`));
    }

    this.reader?.close();
    this.recorder = undefined;
    this.reader = undefined;
    this.exitPromise = undefined;
    this.resolveExit = undefined;
  }

  private fail(error: Error) {
    for (const waiter of this.waiters.values()) {
      clearTimeout(waiter.timeout);
      waiter.reject(error);
    }

    this.waiters.clear();
    this.rejectCompletion?.(error);

    if (this.recorder?.exitCode === null && !this.recorder.killed) {
      this.recorder.kill();
    }
  }
}

export const screenRecorder = new ScreenRecorder();
