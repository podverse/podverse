import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { FakeWebSocket, feedGetByUrlMock } = vi.hoisted(() => {
  type Listener = (...args: unknown[]) => void;

  // vi.hoisted runs before file-level imports, so this fake cannot extend
  // node:events EventEmitter. The listener calls on / emit / removeAllListeners / close / terminate.
  class FakeWebSocket {
    static instances: FakeWebSocket[] = [];
    /** When false, new sockets never open, as with a handshake that hangs. */
    static autoOpen = true;
    private readonly listeners = new Map<string, Listener[]>();

    close = vi.fn(() => {
      this.emit('close', 1000);
    });

    terminate = vi.fn(() => {
      this.emit('close', 1006);
    });

    constructor(
      readonly url: string,
      readonly options?: unknown
    ) {
      FakeWebSocket.instances.push(this);
      if (FakeWebSocket.autoOpen) {
        queueMicrotask(() => {
          this.emit('open');
        });
      }
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

const STALE_MS = 5 * 60 * 1000;
const TICK_MS = 5000;

// Class-typed service; these tests never reach mqRSSAdd / Artemis send.
const unusedService = {
  initialize: vi.fn(),
  sendMessage: vi.fn(),
  close: vi.fn(),
} as unknown as ActiveMQArtemisService;

const socketAt = (index: number) => {
  const socket = FakeWebSocket.instances[index];
  if (socket === undefined) {
    throw new Error(`No socket at index ${index}`);
  }
  return socket;
};

const muteConsoleWarn = () => vi.spyOn(console, 'warn').mockImplementation(() => {});

describe('mqRSSRunLiveItemListener', () => {
  let listener: LiveItemListenerHandle | undefined;
  let warnSpy: ReturnType<typeof muteConsoleWarn>;

  beforeEach(() => {
    vi.useFakeTimers();
    warnSpy = muteConsoleWarn();
  });

  afterEach(() => {
    listener?.stop();
    listener = undefined;
    FakeWebSocket.instances = [];
    FakeWebSocket.autoOpen = true;
    warnSpy.mockRestore();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('connects with a handshake timeout', async () => {
    listener = mqRSSRunLiveItemListener(unusedService);
    await vi.advanceTimersByTimeAsync(0);

    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(socketAt(0).options).toEqual({ handshakeTimeout: 10_000 });
  });

  it('terminates a silent open socket after 5 minutes and opens exactly one new socket', async () => {
    listener = mqRSSRunLiveItemListener(unusedService);
    await vi.advanceTimersByTimeAsync(0);
    expect(FakeWebSocket.instances).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(STALE_MS - TICK_MS);
    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(socketAt(0).terminate).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(TICK_MS);

    expect(socketAt(0).terminate).toHaveBeenCalledTimes(1);
    expect(FakeWebSocket.instances).toHaveLength(2);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('connect attempt 2'));
  });

  it('keeps a socket that is receiving frames', async () => {
    listener = mqRSSRunLiveItemListener(unusedService);
    await vi.advanceTimersByTimeAsync(0);

    for (let minute = 0; minute < 10; minute++) {
      await vi.advanceTimersByTimeAsync(60_000);
      socketAt(0).emit('message', JSON.stringify({ t: 'status' }));
    }

    expect(socketAt(0).terminate).not.toHaveBeenCalled();
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it('ignores a late close from the terminated socket', async () => {
    listener = mqRSSRunLiveItemListener(unusedService);
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(STALE_MS);
    expect(FakeWebSocket.instances).toHaveLength(2);

    socketAt(0).emit('close', 1006);
    await vi.advanceTimersByTimeAsync(TICK_MS * 3);

    expect(FakeWebSocket.instances).toHaveLength(2);
    expect(socketAt(1).terminate).not.toHaveBeenCalled();
    expect(socketAt(1).close).not.toHaveBeenCalled();
  });

  it('does not start a new socket on every tick while a connect is in flight', async () => {
    FakeWebSocket.autoOpen = false;
    listener = mqRSSRunLiveItemListener(unusedService);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(FakeWebSocket.instances).toHaveLength(1);

    socketAt(0).emit('error', new Error('handshake timed out'));
    await vi.advanceTimersByTimeAsync(TICK_MS);

    expect(FakeWebSocket.instances).toHaveLength(2);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('connect attempt 2'));
  });

  it('stop clears its timers and never reconnects', async () => {
    listener = mqRSSRunLiveItemListener(unusedService);
    await vi.advanceTimersByTimeAsync(0);
    const firstSocket = socketAt(0);

    listener.stop();

    expect(firstSocket.close).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);

    await vi.advanceTimersByTimeAsync(STALE_MS * 2);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it('stop during a connect in flight does not reconnect', async () => {
    FakeWebSocket.autoOpen = false;
    listener = mqRSSRunLiveItemListener(unusedService);

    listener.stop();
    socketAt(0).emit('open');
    await vi.advanceTimersByTimeAsync(STALE_MS * 2);

    expect(FakeWebSocket.instances).toHaveLength(1);
  });
});
