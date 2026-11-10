import type { MeterProvider } from '@opentelemetry/sdk-metrics';

import type { HttpMetricInstruments } from './http/recordHttpServerRequest.js';
import type { WorkerCommandInstruments } from './worker/commandTiming.js';
import type { PushSendInstruments } from './worker/pushSend.js';

export type ExtensionRuntimeState = {
  enabled: boolean;
  meterProvider: MeterProvider | null;
  httpInstruments: HttpMetricInstruments | null;
  workerInstruments: WorkerCommandInstruments | null;
  pushInstruments: PushSendInstruments | null;
};

export const extensionRuntimeState: ExtensionRuntimeState = {
  enabled: false,
  meterProvider: null,
  httpInstruments: null,
  workerInstruments: null,
  pushInstruments: null,
};

export const resetExtensionRuntimeState = (): void => {
  extensionRuntimeState.enabled = false;
  extensionRuntimeState.meterProvider = null;
  extensionRuntimeState.httpInstruments = null;
  extensionRuntimeState.workerInstruments = null;
  extensionRuntimeState.pushInstruments = null;
};
