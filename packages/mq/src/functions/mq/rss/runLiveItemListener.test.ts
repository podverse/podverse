import { afterEach, describe, expect, it, vi } from 'vitest';

const { FakeWebSocket, feedGetByUrlMock } = vi.hoisted(() => {
  type Listener = (...args: unknown[]) => void;

  // vi.hoisted runs before file-level imports, so this fake cannot extend
  // node:events EventEmitter. stop() calls on / emit / removeAllListeners / close.
  class FakeWebSocket {
    static instances: FakeWebSocket[] = [];
    private readonly listeners = new Map<string, Listener[]>();

    close = vi.fn(() => {
      this.emit('close', 1000);
    });

    constructor() {
      FakeWebSocket.instances.push(this);
      queueMicrotask(() => {
        this.emit('open');
      });
    }

    on(event: string, listener: Listener): this {
      const existing = this.listeners.get(event) ?? [];
      existing.push(listener);
      this.listeners.set(event, existing);
      return this;
    }

    emit(event: string, ...args: unknown[]): boolean {
      const handlers = this.listeners.get(event) ?? [];
      for (const listener of handlers) {
        listener(...args);
      }
      return handlers.length > 0;
    }

    removeAllListeners(): this {
      this.listeners.clear();
      return this;
    }
  }

  return {
    FakeWebSocket,
    feedGetByUrlMock: vi.fn(),
  };
});

vi.mock('ws', () => ({
  default: FakeWebSocket,
}));

vi.mock('@podverse/orm', () => ({
  FeedService: class {
    getByUrl = feedGetByUrlMock;
  },
}));

import type { ActiveMQArtemisService } from '@queue/services/activeMQArtemis/index.js';

import type { LiveItemListenerHandle } from './runLiveItemListener.js';
import { mqRSSRunLiveItemListener } from './runLiveItemListener.js';

describe('mqRSSRunLiveItemListener', () => {
  let listener: LiveItemListenerHandle | undefined;

  afterEach(() => {
    listener?.stop();
    listener = undefined;
    FakeWebSocket.instances = [];
    vi.clearAllMocks();
  });

  it('stop closes the socket and does not open another after the reconnect interval', async () => {
    // Class-typed service; this test never reaches mqRSSAdd / Artemis send.
    const unusedService = {
      initialize: vi.fn(),
      sendMessage: vi.fn(),
      close: vi.fn(),
    } as unknown as ActiveMQArtemisService;

    listener = mqRSSRunLiveItemListener(unusedService);

    await vi.waitFor(() => {
      expect(FakeWebSocket.instances.length).toBe(1);
    });

    const firstSocket = FakeWebSocket.instances[0];
    expect(firstSocket).toBeDefined();

    listener.stop();
    expect(firstSocket?.close).toHaveBeenCalledTimes(1);

    await new Promise((resolve) => {
      setTimeout(resolve, 20);
    });

    expect(FakeWebSocket.instances.length).toBe(1);
  });
});
