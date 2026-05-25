import type { Histogram, Meter } from '@opentelemetry/api';

import type { WorkerCommandStatus } from '../config.js';
import {
  INSTRUMENT_WORKER_COMMAND_DURATION,
  WORKER_COMMAND,
  WORKER_STATUS,
} from '../otel/attributes.js';

export type WorkerCommandInstruments = {
  durationHistogram: Histogram;
};

export const createWorkerCommandInstruments = (meter: Meter): WorkerCommandInstruments => {
  return {
    durationHistogram: meter.createHistogram(INSTRUMENT_WORKER_COMMAND_DURATION, {
      description: 'Duration of worker command execution',
      unit: 's',
    }),
  };
};

export const recordWorkerCommandMetric = (
  instruments: WorkerCommandInstruments,
  command: string,
  status: WorkerCommandStatus,
  durationMs: number
): void => {
  const durationSeconds = durationMs / 1000;
  instruments.durationHistogram.record(durationSeconds, {
    [WORKER_COMMAND]: command,
    [WORKER_STATUS]: status,
  });
};
