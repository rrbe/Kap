import {App, Format} from './base';

export type ExportDestination = 'save' | 'copy' | 'open';

export type CreateExportOptions = {
  filePath: string;
  conversionOptions: ConversionOptions;
  format: Format;
  destination: ExportDestination;
  app?: App;
};

export type ConversionOptions = {
  startTime: number;
  endTime: number;
  width: number;
  height: number;
  fps: number;
  shouldCrop: boolean;
  shouldMute: boolean;
  isUnedited?: boolean;
};

export enum ExportStatus {
  inProgress = 'inProgress',
  failed = 'failed',
  canceled = 'canceled',
  completed = 'completed'
}
