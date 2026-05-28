import type { MeterProvider } from '@opentelemetry/sdk-metrics';

import type { HttpMetricInstruments } from './http/recordHttpServerRequest.js';
import type { WorkerCommandInstruments } from './worker/commandTiming.js';

export type ExtensionRuntimeState = {
  enabled: boolean;
  meterProvider: MeterProvider | null;
  httpInstruments: HttpMetricInstruments | null;
  workerInstruments: WorkerCommandInstruments | null;
};

export const extensionRuntimeState: ExtensionRuntimeState = {
  enabled: false,
  meterProvider: null,
  httpInstruments: null,
  workerInstruments: null,
};

export const resetExtensionRuntimeState = (): void => {
  extensionRuntimeState.enabled = false;
  extensionRuntimeState.meterProvider = null;
  extensionRuntimeState.httpInstruments = null;
  extensionRuntimeState.workerInstruments = null;
};
