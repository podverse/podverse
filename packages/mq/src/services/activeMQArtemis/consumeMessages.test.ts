import { EventEmitter } from 'node:events';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/traceEnvelope.js', () => ({
  attachMqTraceContext: <T>(message: T): T => message,
  withMqConsumerSpan: async <T>(
    _spanName: string,
    _message: unknown,
    fn: () => Promise<T>
  ): Promise<T> => fn(),
}));

import { ActiveMQArtemisService } from './index.js';

const BUDGET_MS = 15 * 60 * 1000;
const SIX_MINUTES_MS = 6 * 60 * 1000;

class ProcessExitCalled extends Error {}

class FakeReceiver extends EventEmitter {
  add_credit = vi.fn();
  close = vi.fn();
}

const createLogger = () => ({
  addRemoteTransport: vi.fn(),
  logError: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
});

const createConsumer = () => {
  const logger = createLogger();
  const service = new ActiveMQArtemisService(
    { protocol: 'amqp', host: 'localhost', username: 'user', password: 'pass', port: 5672 },
    logger
  );
  const receiver = new FakeReceiver();
  const receivers: unknown = Reflect.get(service, 'receivers');
  if (!(receivers instanceof Map)) {
    throw new Error('ActiveMQArtemisService receivers map not found');
  }
  receivers.set('rss-normal', receiver);
  return { service, logger, receiver };
};

const deliver = (receiver: FakeReceiver, messageId: string) => {
  const delivery = { accept: vi.fn(), reject: vi.fn() };
  receiver.emit('message', {
    receiver,
    delivery,
    message: {
      message_id: messageId,
      body: JSON.stringify({ url: 'https://example.com/feed.xml', podcast_index_id: 352598 }),
    },
  });
  return delivery;
};

const neverSettles = () => new Promise<void>(() => {});

const mockProcessExit = () =>
  vi.spyOn(process, 'exit').mockImplementation((): never => {
    throw new ProcessExitCalled();
  });

describe('ActiveMQArtemisService.consumeMessages handler budget', () => {
  let exitSpy: ReturnType<typeof mockProcessExit>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-01T12:00:00.000Z'));
    exitSpy = mockProcessExit();
  });

  afterEach(() => {
    exitSpy.mockRestore();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('rejects a handler that runs past the budget, closes the connection, and exits', async () => {
    const { service, logger, receiver } = createConsumer();
    await service.consumeMessages('rss-normal', neverSettles, { handlerTimeoutMs: BUDGET_MS });

    const delivery = deliver(receiver, 'msg-1');
    await vi.advanceTimersByTimeAsync(BUDGET_MS - 1);
    expect(delivery.reject).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    await vi.advanceTimersByTimeAsync(0);

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('timed out'),
      expect.objectContaining({
        queueName: 'rss-normal',
        messageId: 'msg-1',
        url: 'https://example.com/feed.xml',
        podcast_index_id: 352598,
      })
    );
    expect(delivery.reject).toHaveBeenCalledTimes(1);
    expect(delivery.reject).toHaveBeenCalledWith(
      expect.objectContaining({ condition: 'podverse:handler-timeout' })
    );
    expect(receiver.close).toHaveBeenCalledTimes(1);
    expect(exitSpy).toHaveBeenCalledTimes(1);
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(receiver.add_credit).not.toHaveBeenCalled();
  });

  it('ignores a handler that throws after it was abandoned', async () => {
    const { service, receiver } = createConsumer();
    let failLate: (error: Error) => void = () => {};
    await service.consumeMessages(
      'rss-normal',
      () =>
        new Promise<void>((_resolve, reject) => {
          failLate = reject;
        }),
      { handlerTimeoutMs: BUDGET_MS }
    );

    const delivery = deliver(receiver, 'msg-1');
    await vi.advanceTimersByTimeAsync(BUDGET_MS);
    failLate(new Error('late failure'));
    await vi.advanceTimersByTimeAsync(0);

    expect(delivery.reject).toHaveBeenCalledTimes(1);
    expect(delivery.reject).toHaveBeenCalledWith(
      expect.objectContaining({ condition: 'podverse:handler-timeout' })
    );
    expect(receiver.add_credit).not.toHaveBeenCalled();
  });

  it('does not time out a handler that finishes within the budget', async () => {
    const { service, logger, receiver } = createConsumer();
    await service.consumeMessages(
      'rss-normal',
      () => new Promise<void>((resolve) => setTimeout(resolve, 60_000)),
      { handlerTimeoutMs: BUDGET_MS }
    );

    const delivery = deliver(receiver, 'msg-1');
    await vi.advanceTimersByTimeAsync(BUDGET_MS * 2);

    expect(delivery.reject).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('gives every message its own budget, however long the worker has been running', async () => {
    const { service, logger, receiver } = createConsumer();
    await service.consumeMessages(
      'rss-normal',
      () => new Promise<void>((resolve) => setTimeout(resolve, SIX_MINUTES_MS)),
      { handlerTimeoutMs: BUDGET_MS }
    );

    const deliveries: ReturnType<typeof deliver>[] = [];
    for (const messageId of ['msg-1', 'msg-2', 'msg-3', 'msg-4']) {
      deliveries.push(deliver(receiver, messageId));
      await vi.advanceTimersByTimeAsync(SIX_MINUTES_MS);
    }
    await vi.advanceTimersByTimeAsync(BUDGET_MS);

    for (const delivery of deliveries) {
      expect(delivery.reject).not.toHaveBeenCalled();
    }
    expect(logger.error).not.toHaveBeenCalled();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('never times out when no budget is passed', async () => {
    const { service, receiver } = createConsumer();
    await service.consumeMessages('rss-normal', neverSettles);

    const delivery = deliver(receiver, 'msg-1');
    await vi.advanceTimersByTimeAsync(BUDGET_MS * 2);

    expect(delivery.reject).not.toHaveBeenCalled();
    expect(exitSpy).not.toHaveBeenCalled();
  });
});

describe('ActiveMQArtemisService.consumeMessages in-flight file', () => {
  let dir: string;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-01T12:00:00.000Z'));
    dir = mkdtempSync(join(tmpdir(), 'mq-in-flight-'));
  });

  afterEach(() => {
    vi.useRealTimers();
    rmSync(dir, { recursive: true, force: true });
  });

  it('clears a stale value at startup, records the start time, and clears it after', async () => {
    const inFlightFilePath = join(dir, 'mq-consumer-in-flight');
    writeFileSync(inFlightFilePath, '1700000000');
    const { service, receiver } = createConsumer();

    await service.consumeMessages(
      'rss-normal',
      () => new Promise<void>((resolve) => setTimeout(resolve, 60_000)),
      { handlerTimeoutMs: BUDGET_MS, inFlightFilePath }
    );
    expect(readFileSync(inFlightFilePath, 'utf8')).toBe('');

    deliver(receiver, 'msg-1');
    await vi.advanceTimersByTimeAsync(0);
    expect(readFileSync(inFlightFilePath, 'utf8')).toBe(
      String(Math.floor(new Date('2026-11-01T12:00:00.000Z').getTime() / 1000))
    );

    await vi.advanceTimersByTimeAsync(60_000);
    expect(readFileSync(inFlightFilePath, 'utf8')).toBe('');
  });
});
