import type { PlaybackPresenceResult } from '@api/lib/accountPlayback/playbackStore.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  DTOPlaybackCommandEnvelope,
  DTOPlaybackDevice,
  DTOPlaybackDevices,
  DTOPlaybackSnapshot,
  DTOPlaybackStartFailed,
  DTOPlaybackState,
} from '@podverse/helpers';
import { MediumEnum } from '@podverse/helpers';
import type { AccountEvent } from '@podverse/orm';

type NotificationRow = {
  id: number;
  account_id: number;
  category: string;
  title: string;
  body: string | null;
  link_path: string | null;
  payload: Record<string, unknown> | null;
  created_at: Date;
  expires_at: Date;
};

const {
  accountGetMock,
  captured,
  countUnreadMock,
  getManyByIdsForAccountMock,
  getMaxIdForAccountMock,
  beginPlaybackPresenceSessionMock,
  handlePlaybackPresenceChangeMock,
  listForAccountAfterIdMock,
  loggerService,
  prunePlaybackPresenceMock,
  readPlaybackSnapshotMock,
  removePlaybackPresenceMock,
  shortenPlaybackPresenceMock,
  subscriptionCloseMock,
} = vi.hoisted(() => {
  const captured: {
    handlers?: { onEvent: (event: AccountEvent) => void; onRecovered: () => void };
  } = {};
  return {
    accountGetMock: vi.fn(
      async (
        account_id: number
      ): Promise<{ id: number; notifications_last_read_at: Date | null }> => ({
        id: account_id,
        notifications_last_read_at: null,
      })
    ),
    captured,
    countUnreadMock: vi.fn(async (_account_id: number, _cutoff: Date | null) => 3),
    getManyByIdsForAccountMock: vi.fn(
      async (_account_id: number, _ids: number[]): Promise<NotificationRow[]> => []
    ),
    getMaxIdForAccountMock: vi.fn(async (_account_id: number): Promise<number | null> => 10),
    beginPlaybackPresenceSessionMock: vi.fn(async (): Promise<number> => 1),
    handlePlaybackPresenceChangeMock: vi.fn(
      async (_params: {
        accountId: number;
        result: PlaybackPresenceResult;
        nowMs: number;
      }): Promise<void> => undefined
    ),
    listForAccountAfterIdMock: vi.fn(
      async (
        _account_id: number,
        _after_id: number,
        _limit: number
      ): Promise<NotificationRow[]> => []
    ),
    loggerService: {
      debug: vi.fn(),
      info: vi.fn(),
      logError: vi.fn(),
      warn: vi.fn(),
    },
    prunePlaybackPresenceMock: vi.fn(
      async (_params: { accountId: number; nowMs: number }): Promise<PlaybackPresenceResult> => ({
        devicesChanged: false,
        devicesRevision: 0,
        removedSessionIdTexts: [],
      })
    ),
    readPlaybackSnapshotMock: vi.fn(
      async (_params: { accountId: number; nowMs: number }): Promise<DTOPlaybackSnapshot> => ({
        devices: { revision: 0, devices: [] },
        state: null,
      })
    ),
    removePlaybackPresenceMock: vi.fn(
      async (_params: {
        accountId: number;
        sessionIdText: string;
        nowMs: number;
      }): Promise<PlaybackPresenceResult> => ({
        devicesChanged: false,
        devicesRevision: 0,
        removedSessionIdTexts: [],
      })
    ),
    shortenPlaybackPresenceMock: vi.fn(
      async (_params: {
        accountId: number;
        sessionIdText: string;
        expiresAtMs: number;
        presenceGeneration: number | null;
      }): Promise<void> => undefined
    ),
    subscriptionCloseMock: vi.fn(async () => undefined),
  };
});

vi.mock('@api/factories/loggerService.js', () => ({ loggerService }));

vi.mock('@api/lib/accountPlayback/playbackService.js', () => ({
  handlePlaybackPresenceChange: handlePlaybackPresenceChangeMock,
  readPlaybackSnapshot: readPlaybackSnapshotMock,
}));

vi.mock('@api/lib/accountPlayback/playbackStore.js', () => ({
  beginPlaybackPresenceSession: beginPlaybackPresenceSessionMock,
  prunePlaybackPresence: prunePlaybackPresenceMock,
  removePlaybackPresence: removePlaybackPresenceMock,
  shortenPlaybackPresence: shortenPlaybackPresenceMock,
}));

vi.mock('@api/lib/accountEvents/accountEventRedis.js', () => ({
  subscribeAccountEvents: vi.fn(
    (handlers: { onEvent: (event: AccountEvent) => void; onRecovered: () => void }) => {
      captured.handlers = handlers;
      return { close: subscriptionCloseMock };
    }
  ),
}));

vi.mock('@podverse/orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@podverse/orm')>();

  class MockAccountNotificationService {
    countUnread = countUnreadMock;
    getManyByIdsForAccount = getManyByIdsForAccountMock;
    getMaxIdForAccount = getMaxIdForAccountMock;
    listForAccountAfterId = listForAccountAfterIdMock;
  }

  class MockAccountService {
    get = accountGetMock;
  }

  return {
    ...actual,
    AccountNotificationService: MockAccountNotificationService,
    AccountService: MockAccountService,
  };
});

type FakeResponse = {
  chunks: string[];
  endCalls: number;
  writable: boolean;
  writableEnded: boolean;
  write: (chunk: string) => boolean;
  end: () => void;
};

type WrittenEvent = { id?: string; event: string; data: unknown };

const DEFAULT_SESSION_ID_TEXT = 'sessdefault1';

const createResponse = (): FakeResponse => {
  const response: FakeResponse = {
    chunks: [],
    endCalls: 0,
    writable: true,
    writableEnded: false,
    write: (chunk) => {
      response.chunks.push(chunk);
      return true;
    },
    end: () => {
      response.endCalls += 1;
      response.writable = false;
      response.writableEnded = true;
    },
  };
  return response;
};

const eventsOf = (response: FakeResponse): WrittenEvent[] =>
  response.chunks.flatMap((chunk): WrittenEvent[] => {
    let id: string | undefined;
    let event: string | undefined;
    let data: unknown;
    for (const line of chunk.split('\n')) {
      if (line.startsWith('id: ')) {
        id = line.slice('id: '.length);
      } else if (line.startsWith('event: ')) {
        event = line.slice('event: '.length);
      } else if (line.startsWith('data: ')) {
        data = JSON.parse(line.slice('data: '.length));
      }
    }
    if (event === undefined) {
      return [];
    }
    return id === undefined ? [{ event, data }] : [{ id, event, data }];
  });

const createdIdsOf = (response: FakeResponse): Array<string | undefined> =>
  eventsOf(response)
    .filter((entry) => entry.event === 'notification.created')
    .map((entry) => entry.id);

const pingCountOf = (response: FakeResponse): number =>
  response.chunks.filter((chunk) => chunk === ': ping\n\n').length;

const row = (id: number, account_id = 1): NotificationRow => ({
  id,
  account_id,
  category: 'new-item',
  title: `Notification ${id}`,
  body: null,
  link_path: null,
  payload: null,
  created_at: new Date('2026-10-01T00:00:00.000Z'),
  expires_at: new Date('2026-11-01T00:00:00.000Z'),
});

const NO_PRESENCE_CHANGE: PlaybackPresenceResult = {
  devicesChanged: false,
  devicesRevision: 0,
  removedSessionIdTexts: [],
};

const EMPTY_PLAYBACK_SNAPSHOT: DTOPlaybackSnapshot = {
  devices: { revision: 0, devices: [] },
  state: null,
};

const playbackDevice = (session_id_text: string): DTOPlaybackDevice => ({
  session_id_text,
  client_type: 'web',
  device_label: `Browser ${session_id_text}`,
  session_created_at: '2026-10-20T00:00:00.000Z',
});

const playbackDevices = (revision: number, sessionIdTexts: string[]): DTOPlaybackDevices => ({
  revision,
  devices: sessionIdTexts.map((sessionIdText) => playbackDevice(sessionIdText)),
});

const playbackState = (revision: number): DTOPlaybackState => ({
  revision,
  active_session_id_text: 'sessaaaaa1',
  resource: {
    ref: { kind: 'item', item_id_text: 'itemaaaaa1' },
    medium: MediumEnum.Podcast,
    title: 'Episode One',
    channel_title: 'The Show',
    image_url: null,
  },
  status: 'playing',
  is_live: false,
  position_seconds: 120,
  duration_seconds: 3_600,
  rate: 1,
  updated_at_ms: Date.parse('2026-10-22T11:59:59.000Z'),
  sent_at_ms: Date.parse('2026-10-22T11:59:59.500Z'),
});

const playbackCommand = (
  target_session_id_text: string,
  expires_at_ms: number
): DTOPlaybackCommandEnvelope => ({
  command_id: 'commandaaa1',
  sender_session_id_text: 'sessaaaaa1',
  target_session_id_text,
  issued_at_ms: expires_at_ms - 5_000,
  expires_at_ms,
  command: { type: 'pause' },
  state: null,
});

const playbackStartFailed: DTOPlaybackStartFailed = {
  command_id: 'commandaaa1',
  sender_session_id_text: 'sessaaaaa1',
  target_session_id_text: 'sessbbbbb2',
  reason: 'autoplay_blocked',
};

/** Every mocked query resolves as a microtask, so one macrotask turn drains the account queues. */
const flush = (): Promise<void> =>
  new Promise<void>((resolve) => {
    setImmediate(resolve);
  });

const loadHub = async () => import('./accountEventStreamHub.js');
type Hub = Awaited<ReturnType<typeof loadHub>>;

const openStream = async (
  hub: Hub,
  account_id: number,
  options: {
    lastEventId?: number | null;
    tokenExpiresAt?: number;
    sessionIdText?: string | null;
  } = {}
): Promise<FakeResponse> => {
  const response = createResponse();
  await hub.openAccountEventStream({
    account_id,
    sessionIdText:
      options.sessionIdText === undefined ? DEFAULT_SESSION_ID_TEXT : options.sessionIdText,
    response,
    cutoff: null,
    lastEventId: options.lastEventId ?? null,
    tokenExpiresAt: options.tokenExpiresAt,
  });
  await flush();
  return response;
};

/** For a test that ends the stream itself, as the controller does when the client closes. */
const openClosableStream = async (hub: Hub, account_id: number, sessionIdText: string) => {
  const response = createResponse();
  const stream = await hub.openAccountEventStream({
    account_id,
    sessionIdText,
    response,
    cutoff: null,
    lastEventId: null,
  });
  await flush();
  return { response, stream };
};

const playbackEventsOf = (response: FakeResponse): WrittenEvent[] =>
  eventsOf(response).filter((entry) => entry.event.startsWith('playback.'));

const emit = (event: AccountEvent): void => {
  if (captured.handlers === undefined) {
    throw new Error('subscribeAccountEvents was not called');
  }
  captured.handlers.onEvent(event);
};

describe('account event stream hub', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    captured.handlers = undefined;
    vi.useFakeTimers({
      now: new Date('2026-10-22T12:00:00.000Z'),
      toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'],
    });
    countUnreadMock.mockImplementation(async () => 3);
    getMaxIdForAccountMock.mockImplementation(async () => 10);
    listForAccountAfterIdMock.mockImplementation(async () => []);
    getManyByIdsForAccountMock.mockImplementation(async (account_id, ids) =>
      ids.map((id) => row(id, account_id))
    );
    accountGetMock.mockImplementation(async (account_id) => ({
      id: account_id,
      notifications_last_read_at: null,
    }));
    readPlaybackSnapshotMock.mockImplementation(async () => EMPTY_PLAYBACK_SNAPSHOT);
    prunePlaybackPresenceMock.mockImplementation(async () => NO_PRESENCE_CHANGE);
    removePlaybackPresenceMock.mockImplementation(async () => NO_PRESENCE_CHANGE);
    shortenPlaybackPresenceMock.mockImplementation(async () => undefined);
    handlePlaybackPresenceChangeMock.mockImplementation(async () => undefined);
  });

  afterEach(async () => {
    const hub = await loadHub();
    await hub.closeAccountEventStreamHub();
    vi.useRealTimers();
  });

  it('sends a notification.created event to both streams of that account and to no stream of another account', async () => {
    const hub = await loadHub();
    hub.startAccountEventStreamHub();
    const first = await openStream(hub, 1);
    const second = await openStream(hub, 1);
    const otherAccount = await openStream(hub, 2);

    expect(first.chunks[0]).toBe('retry: 5000\n\n');
    expect(eventsOf(first)[0]).toEqual({
      event: 'notification.state',
      data: { unread_count: 3, last_read_at: null },
    });

    emit({ account_id: 1, type: 'notification.created', data: { notification_ids: [11] } });
    await flush();

    for (const response of [first, second]) {
      expect(eventsOf(response).filter((entry) => entry.event === 'notification.created')).toEqual([
        {
          id: '11',
          event: 'notification.created',
          data: {
            notification: expect.objectContaining({ id: 11, account_id: 1, is_unread: true }),
            unread_count: 3,
          },
        },
      ]);
    }
    expect(createdIdsOf(otherAccount)).toEqual([]);
    expect(getManyByIdsForAccountMock).toHaveBeenCalledTimes(1);
    expect(getManyByIdsForAccountMock).toHaveBeenCalledWith(1, [11]);
  });

  it('does not send the same notification id twice when a second event repeats it', async () => {
    const hub = await loadHub();
    hub.startAccountEventStreamHub();
    const response = await openStream(hub, 1);

    emit({ account_id: 1, type: 'notification.created', data: { notification_ids: [11] } });
    await flush();
    emit({ account_id: 1, type: 'notification.created', data: { notification_ids: [11, 12] } });
    await flush();

    expect(createdIdsOf(response)).toEqual(['11', '12']);
  });

  it('delivers two events for one account in order even when the first query resolves last', async () => {
    const hub = await loadHub();
    hub.startAccountEventStreamHub();
    const response = await openStream(hub, 1);

    let releaseFirst: (rows: NotificationRow[]) => void = () => undefined;
    getManyByIdsForAccountMock.mockImplementationOnce(
      () =>
        new Promise<NotificationRow[]>((resolve) => {
          releaseFirst = resolve;
        })
    );

    emit({ account_id: 1, type: 'notification.created', data: { notification_ids: [11] } });
    emit({ account_id: 1, type: 'notification.created', data: { notification_ids: [12] } });
    await flush();
    expect(createdIdsOf(response)).toEqual([]);

    releaseFirst([row(11)]);
    await flush();

    expect(createdIdsOf(response)).toEqual(['11', '12']);
  });

  it('writes nothing, runs no query, and warns once per type for a playback.state with invalid data and for playback.progress', async () => {
    const hub = await loadHub();
    hub.startAccountEventStreamHub();
    const response = await openStream(hub, 1);
    const chunkCount = response.chunks.length;
    vi.clearAllMocks();

    const invalidState = { ...playbackState(5), rate: 0 };
    emit({ account_id: 1, type: 'playback.state', data: invalidState });
    emit({ account_id: 1, type: 'playback.state', data: invalidState });
    emit({ account_id: 1, type: 'playback.progress', data: { position_seconds: 120 } });
    emit({ account_id: 1, type: 'playback.progress', data: { position_seconds: 121 } });
    await flush();

    expect(response.chunks).toHaveLength(chunkCount);
    expect(countUnreadMock).not.toHaveBeenCalled();
    expect(getManyByIdsForAccountMock).not.toHaveBeenCalled();
    expect(loggerService.warn).toHaveBeenCalledTimes(2);
    expect(loggerService.warn).toHaveBeenCalledWith(expect.any(String), {
      type: 'playback.state',
    });
    expect(loggerService.warn).toHaveBeenCalledWith(expect.any(String), {
      type: 'playback.progress',
    });
  });

  it('refuses the eleventh stream for one account', async () => {
    const hub = await loadHub();
    hub.startAccountEventStreamHub();
    for (let index = 0; index < 10; index += 1) {
      await openStream(hub, 1);
    }

    expect(hub.getAccountEventStreamAdmission(1)).toBe('limit');
    expect(hub.getAccountEventStreamAdmission(2)).toBe('open');
  });

  it('writes a heartbeat every 25 seconds and ends the stream at token expiry or at 30 minutes, whichever is first', async () => {
    const hub = await loadHub();
    hub.startAccountEventStreamHub();
    const nowSeconds = Math.floor(Date.now() / 1000);
    const shortToken = await openStream(hub, 1, { tokenExpiresAt: nowSeconds + 60 });
    const longToken = await openStream(hub, 2, { tokenExpiresAt: nowSeconds + 24 * 60 * 60 });

    vi.advanceTimersByTime(25_000);
    expect(pingCountOf(shortToken)).toBe(1);
    vi.advanceTimersByTime(25_000);
    expect(pingCountOf(shortToken)).toBe(2);
    expect(shortToken.writableEnded).toBe(false);

    vi.advanceTimersByTime(10_000);
    expect(shortToken.writableEnded).toBe(true);
    expect(longToken.writableEnded).toBe(false);

    vi.advanceTimersByTime(30 * 60_000 - 60_000 - 1);
    expect(longToken.writableEnded).toBe(false);
    vi.advanceTimersByTime(1);
    expect(longToken.writableEnded).toBe(true);
    expect(pingCountOf(shortToken)).toBe(2);
  });

  it('replays rows after the high-water mark and sends a fresh state event on recovery', async () => {
    const hub = await loadHub();
    hub.startAccountEventStreamHub();
    const response = await openStream(hub, 1);
    const eventCountBeforeRecovery = eventsOf(response).length;

    const lastReadAt = new Date('2026-10-02T00:00:00.000Z');
    accountGetMock.mockResolvedValueOnce({ id: 1, notifications_last_read_at: lastReadAt });
    countUnreadMock.mockImplementation(async () => 2);
    listForAccountAfterIdMock.mockResolvedValueOnce([row(11), row(12)]);

    captured.handlers?.onRecovered();
    await flush();

    expect(listForAccountAfterIdMock).toHaveBeenCalledWith(1, 10, 51);
    expect(countUnreadMock).toHaveBeenLastCalledWith(1, lastReadAt);
    expect(eventsOf(response).slice(eventCountBeforeRecovery)).toEqual([
      expect.objectContaining({ id: '11', event: 'notification.created' }),
      expect.objectContaining({ id: '12', event: 'notification.created' }),
      {
        event: 'notification.state',
        data: { unread_count: 2, last_read_at: lastReadAt.toISOString() },
      },
      { event: 'playback.snapshot', data: EMPTY_PLAYBACK_SNAPSHOT },
    ]);
  });

  it('closeAccountEventStreamHub ends every stream and closes the subscription once', async () => {
    const hub = await loadHub();
    hub.startAccountEventStreamHub();
    const first = await openStream(hub, 1);
    const second = await openStream(hub, 2);

    await hub.closeAccountEventStreamHub();
    await hub.closeAccountEventStreamHub();

    expect(first.writableEnded).toBe(true);
    expect(second.writableEnded).toBe(true);
    expect(subscriptionCloseMock).toHaveBeenCalledTimes(1);
    expect(hub.getAccountEventStreamAdmission(1)).toBe('closed');

    vi.advanceTimersByTime(60_000);
    expect(pingCountOf(first)).toBe(0);
  });

  it('ends only the stream of the ended session with the mapped notice and runs no query', async () => {
    const hub = await loadHub();
    hub.startAccountEventStreamHub();
    const sessionA = await openStream(hub, 1, { sessionIdText: 'sessaaaaa1' });
    const sessionB = await openStream(hub, 1, { sessionIdText: 'sessbbbbb2' });
    const chunkCountOfB = sessionB.chunks.length;
    vi.clearAllMocks();

    emit({
      account_id: 1,
      type: 'session.ended',
      data: { session_id_texts: ['sessaaaaa1'], reason: 'admin_force_logout' },
    });

    expect(eventsOf(sessionA).at(-1)).toEqual({
      event: 'session.ended',
      data: { notice: 'admin_force_logout' },
    });
    expect(sessionA.writableEnded).toBe(true);
    expect(sessionB.writableEnded).toBe(false);
    expect(sessionB.chunks).toHaveLength(chunkCountOfB);
    await flush();
    expect(accountGetMock).not.toHaveBeenCalled();
    expect(countUnreadMock).not.toHaveBeenCalled();
    expect(getManyByIdsForAccountMock).not.toHaveBeenCalled();
    expect(getMaxIdForAccountMock).not.toHaveBeenCalled();
    expect(listForAccountAfterIdMock).not.toHaveBeenCalled();
  });

  it('sends a null notice when the device signed itself out', async () => {
    const hub = await loadHub();
    hub.startAccountEventStreamHub();
    const response = await openStream(hub, 1, { sessionIdText: 'sessaaaaa1' });

    emit({
      account_id: 1,
      type: 'session.ended',
      data: { session_id_texts: ['sessaaaaa1'], reason: 'signed_out' },
    });

    expect(eventsOf(response).at(-1)).toEqual({ event: 'session.ended', data: { notice: null } });
    expect(response.writableEnded).toBe(true);
  });

  it('leaves another account that uses the same session id text open', async () => {
    const hub = await loadHub();
    hub.startAccountEventStreamHub();
    const ownStream = await openStream(hub, 1, { sessionIdText: 'sessaaaaa1' });
    const otherAccount = await openStream(hub, 2, { sessionIdText: 'sessaaaaa1' });

    emit({
      account_id: 1,
      type: 'session.ended',
      data: { session_id_texts: ['sessaaaaa1'], reason: 'password_changed' },
    });

    expect(ownStream.writableEnded).toBe(true);
    expect(otherAccount.writableEnded).toBe(false);
    expect(eventsOf(otherAccount).some((entry) => entry.event === 'session.ended')).toBe(false);
  });

  it('writes nothing to a stream that ended while a notification query was in flight and still reaches the other stream', async () => {
    const hub = await loadHub();
    hub.startAccountEventStreamHub();
    const sessionA = await openStream(hub, 1, { sessionIdText: 'sessaaaaa1' });
    const sessionB = await openStream(hub, 1, { sessionIdText: 'sessbbbbb2' });

    let releaseRows: (rows: NotificationRow[]) => void = () => undefined;
    getManyByIdsForAccountMock.mockImplementationOnce(
      () =>
        new Promise<NotificationRow[]>((resolve) => {
          releaseRows = resolve;
        })
    );
    emit({ account_id: 1, type: 'notification.created', data: { notification_ids: [11] } });
    await flush();

    emit({
      account_id: 1,
      type: 'session.ended',
      data: { session_id_texts: ['sessaaaaa1'], reason: 'signed_out_elsewhere' },
    });
    const chunkCountOfA = sessionA.chunks.length;
    releaseRows([row(11)]);
    await flush();

    expect(sessionA.chunks).toHaveLength(chunkCountOfA);
    expect(createdIdsOf(sessionA)).toEqual([]);
    expect(createdIdsOf(sessionB)).toEqual(['11']);
  });

  it('closes a stream that registers for a session ended 30 seconds earlier, and not one 61 seconds later', async () => {
    const hub = await loadHub();
    hub.startAccountEventStreamHub();
    emit({
      account_id: 1,
      type: 'session.ended',
      data: {
        session_id_texts: ['sessaaaaa1', 'sessbbbbb2'],
        reason: 'signed_out_elsewhere',
      },
    });

    vi.advanceTimersByTime(30_000);
    vi.clearAllMocks();
    const early = await openStream(hub, 1, { sessionIdText: 'sessaaaaa1' });

    expect(early.chunks[0]).toBe('retry: 5000\n\n');
    expect(eventsOf(early)).toEqual([
      { event: 'session.ended', data: { notice: 'signed_out_elsewhere' } },
    ]);
    expect(early.writableEnded).toBe(true);
    expect(countUnreadMock).not.toHaveBeenCalled();

    vi.advanceTimersByTime(31_000);
    const late = await openStream(hub, 1, { sessionIdText: 'sessbbbbb2' });

    expect(late.writableEnded).toBe(false);
    expect(eventsOf(late)).toEqual([
      { event: 'notification.state', data: { unread_count: 3, last_read_at: null } },
      { event: 'playback.snapshot', data: EMPTY_PLAYBACK_SNAPSHOT },
    ]);
    expect(readPlaybackSnapshotMock).toHaveBeenCalledTimes(1);
  });

  it('calls res.end() once on every end path and leaves no timer', async () => {
    const hub = await loadHub();
    hub.startAccountEventStreamHub();
    const nowSeconds = Math.floor(Date.now() / 1000);

    const sessionEnd = await openStream(hub, 1, { sessionIdText: 'sessaaaaa1' });
    const clientClose = createResponse();
    const clientCloseStream = await hub.openAccountEventStream({
      account_id: 2,
      sessionIdText: 'sessbbbbb2',
      response: clientClose,
      cutoff: null,
      lastEventId: null,
    });
    await flush();
    const writeThrows = await openStream(hub, 3);
    const backpressure = await openStream(hub, 4);
    const tokenExpiry = await openStream(hub, 5, { tokenExpiresAt: nowSeconds + 60 });
    const lifetimeCap = await openStream(hub, 6);

    emit({
      account_id: 1,
      type: 'session.ended',
      data: { session_id_texts: ['sessaaaaa1'], reason: 'signed_out' },
    });
    hub.closeAccountEventStream(clientCloseStream);
    hub.closeAccountEventStream(clientCloseStream);

    writeThrows.write = () => {
      throw new Error('socket gone');
    };
    backpressure.write = () => false;
    vi.advanceTimersByTime(25_000);
    vi.advanceTimersByTime(35_000);
    vi.advanceTimersByTime(25 * 60_000 - 60_000);

    const hubShutdown = await openStream(hub, 7);
    vi.advanceTimersByTime(5 * 60_000);
    expect(lifetimeCap.writableEnded).toBe(true);
    expect(hubShutdown.writableEnded).toBe(false);
    await hub.closeAccountEventStreamHub();

    for (const response of [
      sessionEnd,
      clientClose,
      writeThrows,
      backpressure,
      tokenExpiry,
      lifetimeCap,
      hubShutdown,
    ]) {
      expect(response.endCalls).toBe(1);
    }
    expect(vi.getTimerCount()).toBe(0);
  });

  it('writes playback.snapshot after notification.state, with sent_at_ms set to the clock when it is written', async () => {
    const hub = await loadHub();
    hub.startAccountEventStreamHub();
    let releaseSnapshot: (snapshot: DTOPlaybackSnapshot) => void = () => undefined;
    readPlaybackSnapshotMock.mockImplementationOnce(
      () =>
        new Promise<DTOPlaybackSnapshot>((resolve) => {
          releaseSnapshot = resolve;
        })
    );
    const response = await openStream(hub, 1);
    expect(eventsOf(response).map((entry) => entry.event)).toEqual(['notification.state']);

    vi.advanceTimersByTime(1_234);
    const devices = playbackDevices(3, ['sessaaaaa1', 'sessbbbbb2']);
    releaseSnapshot({ devices, state: playbackState(5) });
    await flush();

    expect(eventsOf(response)).toEqual([
      { event: 'notification.state', data: { unread_count: 3, last_read_at: null } },
      {
        event: 'playback.snapshot',
        data: { devices, state: { ...playbackState(5), sent_at_ms: Date.now() } },
      },
    ]);
    expect(readPlaybackSnapshotMock).toHaveBeenCalledWith({
      accountId: 1,
      nowMs: Date.now() - 1_234,
    });
  });

  it('holds a playback.state that arrives while the snapshot is read and writes it after the snapshot', async () => {
    const hub = await loadHub();
    hub.startAccountEventStreamHub();
    let releaseSnapshot: (snapshot: DTOPlaybackSnapshot) => void = () => undefined;
    readPlaybackSnapshotMock.mockImplementationOnce(
      () =>
        new Promise<DTOPlaybackSnapshot>((resolve) => {
          releaseSnapshot = resolve;
        })
    );
    const response = await openStream(hub, 1);

    emit({ account_id: 1, type: 'playback.state', data: playbackState(6) });
    await flush();
    expect(playbackEventsOf(response)).toEqual([]);

    releaseSnapshot({ devices: playbackDevices(1, ['sessaaaaa1']), state: playbackState(5) });
    await flush();

    expect(playbackEventsOf(response)).toEqual([
      {
        event: 'playback.snapshot',
        data: {
          devices: playbackDevices(1, ['sessaaaaa1']),
          state: { ...playbackState(5), sent_at_ms: Date.now() },
        },
      },
      { event: 'playback.state', data: { ...playbackState(6), sent_at_ms: Date.now() } },
    ]);
  });

  it('sends a playback.state event to both streams of that account and to no stream of another account', async () => {
    const hub = await loadHub();
    hub.startAccountEventStreamHub();
    const first = await openStream(hub, 1, { sessionIdText: 'sessaaaaa1' });
    const second = await openStream(hub, 1, { sessionIdText: 'sessbbbbb2' });
    const otherAccount = await openStream(hub, 2);

    vi.advanceTimersByTime(2_000);
    emit({ account_id: 1, type: 'playback.state', data: playbackState(6) });

    for (const response of [first, second]) {
      expect(playbackEventsOf(response).at(-1)).toEqual({
        event: 'playback.state',
        data: { ...playbackState(6), sent_at_ms: Date.now() },
      });
    }
    expect(playbackEventsOf(otherAccount).map((entry) => entry.event)).toEqual([
      'playback.snapshot',
    ]);
  });

  it("sends a playback.command only to the target session's streams, and an expired command to none", async () => {
    const hub = await loadHub();
    hub.startAccountEventStreamHub();
    const sender = await openStream(hub, 1, { sessionIdText: 'sessaaaaa1' });
    const targetTabOne = await openStream(hub, 1, { sessionIdText: 'sessbbbbb2' });
    const targetTabTwo = await openStream(hub, 1, { sessionIdText: 'sessbbbbb2' });

    const live = playbackCommand('sessbbbbb2', Date.now() + 5_000);
    const expired = { ...playbackCommand('sessbbbbb2', Date.now()), command_id: 'commandbbb2' };
    emit({ account_id: 1, type: 'playback.command', data: live });
    emit({ account_id: 1, type: 'playback.command', data: expired });

    for (const response of [targetTabOne, targetTabTwo]) {
      expect(
        playbackEventsOf(response).filter((entry) => entry.event === 'playback.command')
      ).toEqual([{ event: 'playback.command', data: live }]);
    }
    expect(playbackEventsOf(sender).some((entry) => entry.event === 'playback.command')).toBe(
      false
    );
    expect(loggerService.debug).toHaveBeenCalledWith('Dropping expired playback command', {
      command_id: 'commandbbb2',
      expires_at_ms: expired.expires_at_ms,
    });
  });

  it("sends a playback.start_failed event only to the sender session's streams", async () => {
    const hub = await loadHub();
    hub.startAccountEventStreamHub();
    const sender = await openStream(hub, 1, { sessionIdText: 'sessaaaaa1' });
    const target = await openStream(hub, 1, { sessionIdText: 'sessbbbbb2' });

    emit({ account_id: 1, type: 'playback.start_failed', data: playbackStartFailed });

    expect(playbackEventsOf(sender).at(-1)).toEqual({
      event: 'playback.start_failed',
      data: playbackStartFailed,
    });
    expect(playbackEventsOf(target).map((entry) => entry.event)).toEqual(['playback.snapshot']);
  });

  it('writes a playback event while a notification query for the same account is still pending', async () => {
    const hub = await loadHub();
    hub.startAccountEventStreamHub();
    const response = await openStream(hub, 1);

    let releaseRows: (rows: NotificationRow[]) => void = () => undefined;
    getManyByIdsForAccountMock.mockImplementationOnce(
      () =>
        new Promise<NotificationRow[]>((resolve) => {
          releaseRows = resolve;
        })
    );
    emit({ account_id: 1, type: 'notification.created', data: { notification_ids: [11] } });
    await flush();
    emit({ account_id: 1, type: 'playback.state', data: playbackState(6) });

    expect(eventsOf(response).at(-1)?.event).toBe('playback.state');
    expect(createdIdsOf(response)).toEqual([]);

    releaseRows([row(11)]);
    await flush();
    expect(eventsOf(response).at(-1)?.event).toBe('notification.created');
  });

  it('shortens presence when the last stream of a session closes and prunes after the grace, and does neither when another stream of the session is open', async () => {
    const hub = await loadHub();
    const { config } = await import('@api/config/index.js');
    const graceMs = config.playback.presenceLeaveGraceMs;
    hub.startAccountEventStreamHub();
    const tabOne = await openClosableStream(hub, 1, 'sessaaaaa1');
    const tabTwo = await openClosableStream(hub, 1, 'sessaaaaa1');

    hub.closeAccountEventStream(tabOne.stream);
    vi.advanceTimersByTime(graceMs + 250);
    await flush();
    expect(tabOne.response.writableEnded).toBe(true);
    expect(shortenPlaybackPresenceMock).not.toHaveBeenCalled();
    expect(prunePlaybackPresenceMock).not.toHaveBeenCalled();

    const left: PlaybackPresenceResult = {
      devicesChanged: true,
      devicesRevision: 4,
      removedSessionIdTexts: ['sessaaaaa1'],
    };
    prunePlaybackPresenceMock.mockResolvedValueOnce(left);
    hub.closeAccountEventStream(tabTwo.stream);
    await flush();
    expect(shortenPlaybackPresenceMock).toHaveBeenCalledTimes(1);
    expect(shortenPlaybackPresenceMock).toHaveBeenCalledWith({
      accountId: 1,
      sessionIdText: 'sessaaaaa1',
      expiresAtMs: Date.now() + graceMs,
      presenceGeneration: 1,
    });

    vi.advanceTimersByTime(graceMs + 249);
    await flush();
    expect(prunePlaybackPresenceMock).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    await flush();
    expect(prunePlaybackPresenceMock).toHaveBeenCalledTimes(1);
    expect(prunePlaybackPresenceMock).toHaveBeenCalledWith({ accountId: 1, nowMs: Date.now() });
    expect(handlePlaybackPresenceChangeMock).toHaveBeenCalledWith({
      accountId: 1,
      result: left,
      nowMs: Date.now(),
    });
  });

  it('leaves presence alone when a stream reaches the 30-minute cap or token expiry, or the hub closes', async () => {
    const hub = await loadHub();
    hub.startAccountEventStreamHub();
    const nowSeconds = Math.floor(Date.now() / 1000);
    const capped = await openStream(hub, 1, { sessionIdText: 'sessaaaaa1' });
    const tokenExpiry = await openStream(hub, 2, {
      sessionIdText: 'sessbbbbb2',
      tokenExpiresAt: nowSeconds + 60,
    });

    vi.advanceTimersByTime(hub.ACCOUNT_EVENT_STREAM_MAX_LIFETIME_MS);
    expect(capped.writableEnded).toBe(true);
    expect(tokenExpiry.writableEnded).toBe(true);

    const shutdown = await openStream(hub, 3, { sessionIdText: 'sessccccc3' });
    await hub.closeAccountEventStreamHub();
    expect(shutdown.writableEnded).toBe(true);
    vi.advanceTimersByTime(60_000);
    await flush();

    expect(shortenPlaybackPresenceMock).not.toHaveBeenCalled();
    expect(removePlaybackPresenceMock).not.toHaveBeenCalled();
    expect(prunePlaybackPresenceMock).not.toHaveBeenCalled();
    expect(handlePlaybackPresenceChangeMock).not.toHaveBeenCalled();
  });

  it('removes presence once for an ended session with two streams and publishes the change', async () => {
    const hub = await loadHub();
    hub.startAccountEventStreamHub();
    await openStream(hub, 1, { sessionIdText: 'sessaaaaa1' });
    await openStream(hub, 1, { sessionIdText: 'sessaaaaa1' });
    const otherSession = await openStream(hub, 1, { sessionIdText: 'sessbbbbb2' });

    const removed: PlaybackPresenceResult = {
      devicesChanged: true,
      devicesRevision: 4,
      removedSessionIdTexts: ['sessaaaaa1'],
    };
    removePlaybackPresenceMock.mockResolvedValueOnce(removed);
    emit({
      account_id: 1,
      type: 'session.ended',
      data: { session_id_texts: ['sessaaaaa1'], reason: 'signed_out' },
    });
    await flush();

    expect(removePlaybackPresenceMock).toHaveBeenCalledTimes(1);
    expect(removePlaybackPresenceMock).toHaveBeenCalledWith({
      accountId: 1,
      sessionIdText: 'sessaaaaa1',
      nowMs: Date.now(),
    });
    expect(handlePlaybackPresenceChangeMock).toHaveBeenCalledTimes(1);
    expect(handlePlaybackPresenceChangeMock).toHaveBeenCalledWith({
      accountId: 1,
      result: removed,
      nowMs: Date.now(),
    });
    expect(shortenPlaybackPresenceMock).not.toHaveBeenCalled();
    expect(otherSession.writableEnded).toBe(false);
  });

  it('sweeps an account whose last device list had two devices and skips one that had one', async () => {
    const hub = await loadHub();
    hub.startAccountEventStreamHub();
    await openStream(hub, 1);
    await openStream(hub, 2);
    emit({
      account_id: 1,
      type: 'playback.devices',
      data: playbackDevices(2, ['sessaaaaa1', 'sessbbbbb2']),
    });
    emit({ account_id: 2, type: 'playback.devices', data: playbackDevices(2, ['sessccccc3']) });

    const pruned: PlaybackPresenceResult = {
      devicesChanged: true,
      devicesRevision: 3,
      removedSessionIdTexts: ['sessbbbbb2'],
    };
    prunePlaybackPresenceMock.mockResolvedValueOnce(pruned);
    vi.advanceTimersByTime(hub.PLAYBACK_PRESENCE_SWEEP_INTERVAL_MS);
    await flush();

    expect(prunePlaybackPresenceMock).toHaveBeenCalledTimes(1);
    expect(prunePlaybackPresenceMock).toHaveBeenCalledWith({ accountId: 1, nowMs: Date.now() });
    expect(handlePlaybackPresenceChangeMock).toHaveBeenCalledWith({
      accountId: 1,
      result: pruned,
      nowMs: Date.now(),
    });
  });

  it('writes a fresh playback.snapshot to each stream on recovery', async () => {
    const hub = await loadHub();
    hub.startAccountEventStreamHub();
    const first = await openStream(hub, 1, { sessionIdText: 'sessaaaaa1' });
    const second = await openStream(hub, 1, { sessionIdText: 'sessbbbbb2' });
    const otherAccount = await openStream(hub, 2);
    vi.clearAllMocks();

    const recoveredDevices = playbackDevices(7, ['sessaaaaa1', 'sessbbbbb2']);
    readPlaybackSnapshotMock.mockImplementation(async ({ accountId }) =>
      accountId === 1
        ? { devices: recoveredDevices, state: playbackState(9) }
        : EMPTY_PLAYBACK_SNAPSHOT
    );
    captured.handlers?.onRecovered();
    await flush();

    for (const response of [first, second]) {
      expect(eventsOf(response).at(-1)).toEqual({
        event: 'playback.snapshot',
        data: {
          devices: recoveredDevices,
          state: { ...playbackState(9), sent_at_ms: Date.now() },
        },
      });
    }
    expect(eventsOf(otherAccount).at(-1)).toEqual({
      event: 'playback.snapshot',
      data: EMPTY_PLAYBACK_SNAPSHOT,
    });
    expect(readPlaybackSnapshotMock).toHaveBeenCalledTimes(2);
  });

  it('still writes held playback events when the snapshot read fails with the store unavailable', async () => {
    const hub = await loadHub();
    const { PlaybackStoreUnavailableError } =
      await import('@api/lib/accountPlayback/playbackRedis.js');
    hub.startAccountEventStreamHub();
    let failSnapshot: (error: Error) => void = () => undefined;
    readPlaybackSnapshotMock.mockImplementationOnce(
      () =>
        new Promise<DTOPlaybackSnapshot>((_resolve, reject) => {
          failSnapshot = reject;
        })
    );
    const response = await openStream(hub, 1);
    vi.clearAllMocks();

    emit({ account_id: 1, type: 'playback.state', data: playbackState(6) });
    emit({ account_id: 1, type: 'playback.devices', data: playbackDevices(4, ['sessaaaaa1']) });
    await flush();
    expect(playbackEventsOf(response)).toEqual([]);

    failSnapshot(new PlaybackStoreUnavailableError());
    await flush();

    expect(playbackEventsOf(response)).toEqual([
      { event: 'playback.state', data: { ...playbackState(6), sent_at_ms: Date.now() } },
      { event: 'playback.devices', data: playbackDevices(4, ['sessaaaaa1']) },
    ]);
    expect(loggerService.warn).toHaveBeenCalledTimes(1);
    expect(loggerService.warn).toHaveBeenCalledWith('Failed to read the playback snapshot', {
      error: 'Playback store is unavailable',
    });
    expect(loggerService.logError).not.toHaveBeenCalled();
  });
});
