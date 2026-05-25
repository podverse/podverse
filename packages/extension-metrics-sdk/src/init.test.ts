import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getExtensionHttpMiddleware,
  initExtensions,
  isExtensionsEnabled,
  recordWorkerCommand,
  shutdownExtensions,
} from './init.js';
import { extensionRuntimeState, resetExtensionRuntimeState } from './internalState.js';

const shutdownMock = vi.fn().mockResolvedValue(undefined);
const recordMock = vi.fn();
const addMock = vi.fn();

vi.mock('./otel/meterProvider.js', () => ({
  createExtensionMeterProvider: vi.fn(() => ({
    getMeter: () => ({
      createHistogram: () => ({ record: recordMock }),
      createUpDownCounter: () => ({ add: addMock }),
    }),
    shutdown: shutdownMock,
  })),
}));

describe('initExtensions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetExtensionRuntimeState();
  });

  afterEach(async () => {
    await shutdownExtensions();
  });

  it('leaves extensions disabled when metricsExtensionEnabled is false', () => {
    initExtensions({ metricsExtensionEnabled: false });

    expect(isExtensionsEnabled()).toBe(false);
    expect(extensionRuntimeState.meterProvider).toBeNull();

    let nextCalled = false;
    getExtensionHttpMiddleware()(
      { method: 'GET' },
      { statusCode: 200, on: () => undefined },
      () => {
        nextCalled = true;
      }
    );
    expect(nextCalled).toBe(true);
    expect(recordMock).not.toHaveBeenCalled();
  });

  it('throws when enabled without otlpEndpoint', () => {
    expect(() =>
      initExtensions({
        metricsExtensionEnabled: true,
        serviceName: 'podverse-api',
      })
    ).toThrow(/otlpEndpoint/);
  });

  it('throws when enabled without serviceName', () => {
    expect(() =>
      initExtensions({
        metricsExtensionEnabled: true,
        otlpEndpoint: 'http://127.0.0.1:4318/v1/metrics',
      })
    ).toThrow(/serviceName/);
  });

  it('initializes meter provider when enabled with valid config', () => {
    initExtensions({
      metricsExtensionEnabled: true,
      otlpEndpoint: 'http://127.0.0.1:4318/v1/metrics',
      serviceName: 'podverse-api',
    });

    expect(isExtensionsEnabled()).toBe(true);
    expect(extensionRuntimeState.meterProvider).not.toBeNull();
    expect(extensionRuntimeState.httpInstruments).not.toBeNull();
    expect(extensionRuntimeState.workerInstruments).not.toBeNull();
  });

  it('does not reinitialize when already enabled', async () => {
    const { createExtensionMeterProvider } = await import('./otel/meterProvider.js');

    initExtensions({
      metricsExtensionEnabled: true,
      otlpEndpoint: 'http://127.0.0.1:4318/v1/metrics',
      serviceName: 'podverse-api',
    });

    initExtensions({
      metricsExtensionEnabled: true,
      otlpEndpoint: 'http://127.0.0.1:4318/v1/metrics',
      serviceName: 'podverse-api',
    });

    expect(createExtensionMeterProvider).toHaveBeenCalledTimes(1);
  });

  it('recordWorkerCommand is a no-op when disabled', () => {
    recordWorkerCommand('devParser', 'success', 100);
    expect(recordMock).not.toHaveBeenCalled();
  });

  it('recordWorkerCommand records when enabled', () => {
    initExtensions({
      metricsExtensionEnabled: true,
      otlpEndpoint: 'http://127.0.0.1:4318/v1/metrics',
      serviceName: 'podverse-workers',
    });

    recordWorkerCommand('devParser', 'success', 250);

    expect(recordMock).toHaveBeenCalledWith(
      0.25,
      expect.objectContaining({
        command: 'devParser',
        status: 'success',
      })
    );
  });

  it('shutdownExtensions clears runtime state', async () => {
    initExtensions({
      metricsExtensionEnabled: true,
      otlpEndpoint: 'http://127.0.0.1:4318/v1/metrics',
      serviceName: 'podverse-api',
    });

    await shutdownExtensions();

    expect(shutdownMock).toHaveBeenCalled();
    expect(isExtensionsEnabled()).toBe(false);
    expect(extensionRuntimeState.meterProvider).toBeNull();
  });
});
