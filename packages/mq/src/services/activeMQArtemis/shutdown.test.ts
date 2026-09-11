import { afterEach, describe, expect, it, vi } from 'vitest';

const { shutdownObservabilityMock } = vi.hoisted(() => ({
  shutdownObservabilityMock: vi.fn(async () => {}),
}));

vi.mock('@podverse/observability', () => ({
  shutdownObservability: shutdownObservabilityMock,
}));

import { createActiveMQShutdown } from './shutdown.js';

describe('createActiveMQShutdown', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('runs onShutdown, flushes observability, then closes Artemis', async () => {
    const onShutdown = vi.fn();
    const close = vi.fn(async () => {});

    const { shutdown, unregister } = createActiveMQShutdown(
      { close },
      console,
      onShutdown,
      false
    );

    await shutdown('SIGINT');

    expect(onShutdown).toHaveBeenCalledTimes(1);
    expect(shutdownObservabilityMock).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);

    unregister();
  });
});
