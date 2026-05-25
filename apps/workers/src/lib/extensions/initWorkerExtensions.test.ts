import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { isExtensionsEnabled, shutdownExtensions } from '@podverse/extension-metrics-sdk';

import { initWorkerExtensions, shouldInitWorkerExtensions } from './initWorkerExtensions.js';

vi.mock('@podverse/extension-metrics-sdk', async (importOriginal) => {
  const original = await importOriginal<typeof import('@podverse/extension-metrics-sdk')>();
  return {
    ...original,
    initExtensions: vi.fn(original.initExtensions),
    shutdownExtensions: vi.fn(original.shutdownExtensions),
  };
});

describe('shouldInitWorkerExtensions', () => {
  const previousEnabled = process.env.PROMETHEUS_ENABLED;
  const previousEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  const previousServiceName = process.env.OTEL_SERVICE_NAME;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await shutdownExtensions();
    process.env.PROMETHEUS_ENABLED = previousEnabled;
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = previousEndpoint;
    process.env.OTEL_SERVICE_NAME = previousServiceName;
  });

  it('returns false when PROMETHEUS_ENABLED is not true', () => {
    process.env.PROMETHEUS_ENABLED = 'false';
    expect(shouldInitWorkerExtensions('mqRSSRunParser')).toBe(false);
    expect(shouldInitWorkerExtensions('archiveAll')).toBe(false);
  });

  it('returns true for long-running commands when enabled', () => {
    process.env.PROMETHEUS_ENABLED = 'true';
    expect(shouldInitWorkerExtensions('mqRSSRunParser')).toBe(true);
    expect(shouldInitWorkerExtensions('imageShrinkRunConsumer')).toBe(true);
  });

  it('returns false for short commands when enabled', () => {
    process.env.PROMETHEUS_ENABLED = 'true';
    expect(shouldInitWorkerExtensions('archiveAll')).toBe(false);
  });
});

describe('initWorkerExtensions', () => {
  const previousEnabled = process.env.PROMETHEUS_ENABLED;
  const previousEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  const previousServiceName = process.env.OTEL_SERVICE_NAME;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await shutdownExtensions();
    process.env.PROMETHEUS_ENABLED = previousEnabled;
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = previousEndpoint;
    process.env.OTEL_SERVICE_NAME = previousServiceName;
  });

  it('does not initialize OTLP for short commands when enabled', async () => {
    const { initExtensions } = await import('@podverse/extension-metrics-sdk');

    process.env.PROMETHEUS_ENABLED = 'true';
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://127.0.0.1:4318';
    process.env.OTEL_SERVICE_NAME = 'podverse-workers';

    initWorkerExtensions('archiveAll');

    expect(initExtensions).not.toHaveBeenCalled();
    expect(isExtensionsEnabled()).toBe(false);
  });

  it('initializes OTLP for long-running commands when enabled with valid env', async () => {
    const { initExtensions } = await import('@podverse/extension-metrics-sdk');

    process.env.PROMETHEUS_ENABLED = 'true';
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://127.0.0.1:4318';
    process.env.OTEL_SERVICE_NAME = 'podverse-workers';

    initWorkerExtensions('mqRSSRunParser');

    expect(initExtensions).toHaveBeenCalledWith(
      expect.objectContaining({
        metricsExtensionEnabled: true,
        otlpEndpoint: 'http://127.0.0.1:4318',
        serviceName: 'podverse-workers',
      })
    );
    expect(isExtensionsEnabled()).toBe(true);
  });
});
