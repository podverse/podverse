import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { shutdownExtensions } from '@podverse/extension-metrics-sdk';
import { initObservability, shutdownObservability } from '@podverse/observability';

import {
  registerWebGracefulShutdownHandlers,
  runWebGracefulShutdown,
} from './bootstrapWebExtensions';

vi.mock('@podverse/extension-metrics-sdk', async (importOriginal) => {
  const original = await importOriginal<typeof import('@podverse/extension-metrics-sdk')>();
  return {
    ...original,
    shutdownExtensions: vi.fn(original.shutdownExtensions),
  };
});

vi.mock('@podverse/observability', async (importOriginal) => {
  const original = await importOriginal<typeof import('@podverse/observability')>();
  return {
    ...original,
    shutdownObservability: vi.fn(original.shutdownObservability),
  };
});

describe('runWebGracefulShutdown', () => {
  const previousPrometheusEnabled = process.env.PROMETHEUS_ENABLED;

  beforeEach(() => {
    vi.clearAllMocks();
    initObservability({
      serviceName: 'podverse-web-test',
      tracesExport: 'none',
    });
  });

  afterEach(async () => {
    process.env.PROMETHEUS_ENABLED = previousPrometheusEnabled;
    await shutdownObservability();
    vi.restoreAllMocks();
  });

  it('shuts down observability when Prometheus extensions are disabled', async () => {
    process.env.PROMETHEUS_ENABLED = 'false';

    await runWebGracefulShutdown();

    expect(shutdownExtensions).not.toHaveBeenCalled();
    expect(shutdownObservability).toHaveBeenCalledTimes(1);
  });

  it('shuts down extensions before observability when Prometheus is enabled', async () => {
    process.env.PROMETHEUS_ENABLED = 'true';
    const callOrder: string[] = [];
    vi.mocked(shutdownExtensions).mockImplementation(async () => {
      callOrder.push('extensions');
    });
    vi.mocked(shutdownObservability).mockImplementation(async () => {
      callOrder.push('observability');
    });

    await runWebGracefulShutdown();

    expect(shutdownExtensions).toHaveBeenCalledTimes(1);
    expect(shutdownObservability).toHaveBeenCalledTimes(1);
    expect(callOrder).toEqual(['extensions', 'observability']);
  });
});

describe('registerWebGracefulShutdownHandlers', () => {
  it('registers SIGTERM and SIGINT handlers once', () => {
    const onSpy = vi.spyOn(process, 'on');

    registerWebGracefulShutdownHandlers();
    registerWebGracefulShutdownHandlers();

    const sigtermCalls = onSpy.mock.calls.filter(([signal]) => signal === 'SIGTERM');
    const sigintCalls = onSpy.mock.calls.filter(([signal]) => signal === 'SIGINT');

    expect(sigtermCalls).toHaveLength(1);
    expect(sigintCalls).toHaveLength(1);

    onSpy.mockRestore();
  });
});
