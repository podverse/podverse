import { randomInt, randomUUID } from 'node:crypto';
import type { Server } from 'node:http';

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import type { DTOPlaybackDevice } from '@podverse/helpers';
import { MediumEnum, PLAYBACK_PRESENCE_TTL_MS } from '@podverse/helpers';
import type { ORMContext } from '@podverse/orm';

import type { StoredPlaybackState } from '../lib/accountPlayback/playbackStore.js';
import { startTestApp, stopTestApp } from './helpers/index.js';

vi.mock('@podverse/orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@podverse/orm')>();

  class MockCategoryService {
    async setCategoryCache(): Promise<void> {}
  }

  return {
    ...actual,
    CategoryService: MockCategoryService,
  };
});

type PlaybackRedisModule = typeof import('../lib/accountPlayback/playbackRedis.js');
type PlaybackStoreModule = typeof import('../lib/accountPlayback/playbackStore.js');
type PlaybackServiceModule = typeof import('../lib/accountPlayback/playbackService.js');
type OrmModule = typeof import('@podverse/orm');

type PlaybackAccountKeyName =
  'presence' | 'devices' | 'devices_rev' | 'state' | 'state_rev' | 'active';

const PLAYBACK_ACCOUNT_KEY_NAMES: PlaybackAccountKeyName[] = [
  'presence',
  'devices',
  'devices_rev',
  'state',
  'state_rev',
  'active',
];

const SESSION_A = 'playback-store-session-a';
const SESSION_B = 'playback-store-session-b';

const playbackAccountKey = (accountId: number, name: PlaybackAccountKeyName): string =>
  `podverse:playback:${accountId}:${name}`;

const playbackSessionKey = (
  accountId: number,
  sessionIdText: string,
  name: 'presence_gen' | 'presence_leave'
): string => `podverse:playback:${accountId}:${name}:${sessionIdText}`;

const playbackSessionKeysFor = (accountId: number): string[] =>
  [SESSION_A, SESSION_B].flatMap((sessionIdText) => [
    playbackSessionKey(accountId, sessionIdText, 'presence_gen'),
    playbackSessionKey(accountId, sessionIdText, 'presence_leave'),
  ]);

const playbackCommandKey = (commandIdText: string): string =>
  `podverse:playback:command:${commandIdText}`;

const device = (sessionIdText: string): DTOPlaybackDevice => ({
  session_id_text: sessionIdText,
  client_type: 'web',
  device_label: `Browser ${sessionIdText}`,
  session_created_at: '2026-10-20T00:00:00.000Z',
});

const playingState = (params: {
  revision: number;
  activeSessionIdText: string | null;
  updatedAtMs: number;
}): StoredPlaybackState => ({
  revision: params.revision,
  active_session_id_text: params.activeSessionIdText,
  resource: {
    ref: { kind: 'item', item_id_text: 'item-one' },
    medium: MediumEnum.Podcast,
    title: 'Episode One',
    channel_title: 'The Show',
    image_url: null,
  },
  status: 'playing',
  is_live: false,
  position_seconds: 100,
  duration_seconds: 3600,
  rate: 1,
  updated_at_ms: params.updatedAtMs,
});

describe('account playback store against the test Valkey', () => {
  let server: Server | undefined;
  let ormContext: ORMContext | undefined;
  let playbackRedis: PlaybackRedisModule;
  let store: PlaybackStoreModule;
  let service: PlaybackServiceModule;
  let orm: OrmModule;

  const usedAccountIds: number[] = [];
  const usedCommandIds: string[] = [];
  let lastAccountId = randomInt(900_000_000, 990_000_000);

  const newAccountId = (): number => {
    lastAccountId += 1;
    usedAccountIds.push(lastAccountId);
    return lastAccountId;
  };

  const deleteAccountKeys = async (accountId: number): Promise<void> => {
    await playbackRedis
      .getPlaybackRedis()
      .del(
        ...PLAYBACK_ACCOUNT_KEY_NAMES.map((name) => playbackAccountKey(accountId, name)),
        ...playbackSessionKeysFor(accountId)
      );
  };

  const touch = (accountId: number, sessionIdText: string, nowMs: number) =>
    store.touchPlaybackPresence({ accountId, device: device(sessionIdText), nowMs });

  /** Writes a playing state with `sessionIdText` active, as a first claim on an empty account. */
  const writeActiveState = async (
    accountId: number,
    sessionIdText: string,
    nowMs: number
  ): Promise<StoredPlaybackState> => {
    const state = playingState({
      revision: nowMs,
      activeSessionIdText: sessionIdText,
      updatedAtMs: nowMs,
    });
    const result = await store.compareAndSetPlaybackState({
      accountId,
      expectedRevision: 0,
      expectedActive: { kind: 'none' },
      newActiveSessionIdText: sessionIdText,
      state,
    });
    expect(result).toEqual({ kind: 'written', revision: nowMs });
    return state;
  };

  beforeAll(async () => {
    const started = await startTestApp();
    server = started.server;
    ormContext = started.ormContext;
    playbackRedis = await import('../lib/accountPlayback/playbackRedis.js');
    store = await import('../lib/accountPlayback/playbackStore.js');
    service = await import('../lib/accountPlayback/playbackService.js');
    orm = await import('@podverse/orm');
  }, 30000);

  afterEach(async () => {
    const keys = [
      ...usedAccountIds.flatMap((accountId) => [
        ...PLAYBACK_ACCOUNT_KEY_NAMES.map((name) => playbackAccountKey(accountId, name)),
        ...playbackSessionKeysFor(accountId),
      ]),
      ...usedCommandIds.map(playbackCommandKey),
    ];
    usedAccountIds.length = 0;
    usedCommandIds.length = 0;
    if (keys.length > 0) {
      await playbackRedis.getPlaybackRedis().del(...keys);
    }
  });

  afterAll(async () => {
    await stopTestApp(server, ormContext);
  });

  it('a first touch adds the device at revision nowMs, a repeat touch is no change, and a join after the keys are gone is again at least nowMs', async () => {
    const accountId = newAccountId();
    const nowMs = Date.now();

    const joined = await touch(accountId, SESSION_A, nowMs);
    expect(joined).toEqual({
      extended: true,
      devicesChanged: true,
      devicesRevision: nowMs,
      removedSessionIdTexts: [],
    });
    expect(await store.readPlaybackDevices({ accountId, nowMs })).toEqual({
      revision: nowMs,
      devices: [device(SESSION_A)],
    });

    const repeated = await touch(accountId, SESSION_A, nowMs + 1_000);
    expect(repeated).toEqual({
      extended: true,
      devicesChanged: false,
      devicesRevision: nowMs,
      removedSessionIdTexts: [],
    });

    await deleteAccountKeys(accountId);
    const rejoinedAtMs = nowMs + 2_000;
    const rejoined = await touch(accountId, SESSION_A, rejoinedAtMs);
    expect(rejoined.devicesChanged).toBe(true);
    expect(rejoined.devicesRevision).toBeGreaterThanOrEqual(rejoinedAtMs);
  });

  it('a device whose check-in expired is removed by the next touch of another device and reported once', async () => {
    const accountId = newAccountId();
    const nowMs = Date.now();
    await touch(accountId, SESSION_A, nowMs);
    const laterMs = nowMs + PLAYBACK_PRESENCE_TTL_MS + 1;

    const touched = await touch(accountId, SESSION_B, laterMs);
    expect(touched).toEqual({
      extended: true,
      devicesChanged: true,
      devicesRevision: laterMs,
      removedSessionIdTexts: [SESSION_A],
    });

    const pruned = await store.prunePlaybackPresence({ accountId, nowMs: laterMs });
    expect(pruned).toEqual({
      devicesChanged: false,
      devicesRevision: laterMs,
      removedSessionIdTexts: [],
    });
    expect(await store.readPlaybackDevices({ accountId, nowMs: laterMs })).toEqual({
      revision: laterMs,
      devices: [device(SESSION_B)],
    });
  });

  it('two concurrent prunes of one expired device report it exactly once', async () => {
    const accountId = newAccountId();
    const nowMs = Date.now();
    await touch(accountId, SESSION_A, nowMs);
    const laterMs = nowMs + PLAYBACK_PRESENCE_TTL_MS + 1;

    const results = await Promise.all([
      store.prunePlaybackPresence({ accountId, nowMs: laterMs }),
      store.prunePlaybackPresence({ accountId, nowMs: laterMs }),
    ]);

    expect(results.flatMap((result) => result.removedSessionIdTexts)).toEqual([SESSION_A]);
    expect(results.filter((result) => result.devicesChanged)).toHaveLength(1);
  });

  it('a leave hold blocks a later check-in until a new stream begins, and a stale generation does not shorten', async () => {
    const accountId = newAccountId();
    const nowMs = Date.now();
    const redis = playbackRedis.getPlaybackRedis();
    const expiryOf = async (sessionIdText: string): Promise<number | null> => {
      const score: unknown = await redis.zscore(
        playbackAccountKey(accountId, 'presence'),
        sessionIdText
      );
      return score === null ? null : Number(score);
    };
    const begin = (sessionIdText: string) =>
      store.beginPlaybackPresenceSession({
        accountId,
        sessionIdText,
        generationTtlMs: 60_000,
      });

    await touch(accountId, SESSION_A, nowMs);
    expect(await expiryOf(SESSION_A)).toBe(nowMs + PLAYBACK_PRESENCE_TTL_MS);

    const generation = await begin(SESSION_A);
    await store.shortenPlaybackPresence({
      accountId,
      sessionIdText: SESSION_A,
      expiresAtMs: nowMs + 5_000,
      presenceGeneration: generation,
    });
    expect(await expiryOf(SESSION_A)).toBe(nowMs + 5_000);
    expect(
      await store.isPlaybackSessionPresent({
        accountId,
        sessionIdText: SESSION_A,
        nowMs: nowMs + 4_999,
      })
    ).toBe(true);
    expect(
      await store.isPlaybackSessionPresent({
        accountId,
        sessionIdText: SESSION_A,
        nowMs: nowMs + 5_000,
      })
    ).toBe(false);

    const held = await touch(accountId, SESSION_A, nowMs + 1_000);
    expect(held.extended).toBe(false);
    expect(await expiryOf(SESSION_A)).toBe(nowMs + 5_000);

    const reconnected = await begin(SESSION_A);
    expect(reconnected).toBe(generation + 1);
    const resumed = await touch(accountId, SESSION_A, nowMs + 1_000);
    const resumedExpiryMs = nowMs + 1_000 + PLAYBACK_PRESENCE_TTL_MS;
    expect(resumed.extended).toBe(true);
    expect(await expiryOf(SESSION_A)).toBe(resumedExpiryMs);

    await store.shortenPlaybackPresence({
      accountId,
      sessionIdText: SESSION_A,
      expiresAtMs: nowMs + 2_000,
      presenceGeneration: generation,
    });
    expect(await expiryOf(SESSION_A)).toBe(resumedExpiryMs);

    await store.shortenPlaybackPresence({
      accountId,
      sessionIdText: SESSION_A,
      expiresAtMs: resumedExpiryMs + 30_000,
      presenceGeneration: reconnected,
    });
    expect(await expiryOf(SESSION_A)).toBe(resumedExpiryMs);

    await store.shortenPlaybackPresence({
      accountId,
      sessionIdText: SESSION_B,
      expiresAtMs: nowMs + 5_000,
      presenceGeneration: 1,
    });
    expect(await expiryOf(SESSION_B)).toBeNull();
  });

  it('removePlaybackPresence reports the removal once', async () => {
    const accountId = newAccountId();
    const nowMs = Date.now();
    await touch(accountId, SESSION_A, nowMs);
    await touch(accountId, SESSION_B, nowMs);

    const first = await store.removePlaybackPresence({
      accountId,
      sessionIdText: SESSION_A,
      nowMs: nowMs + 10,
    });
    expect(first).toEqual({
      devicesChanged: true,
      devicesRevision: nowMs + 10,
      removedSessionIdTexts: [SESSION_A],
    });

    const second = await store.removePlaybackPresence({
      accountId,
      sessionIdText: SESSION_A,
      nowMs: nowMs + 20,
    });
    expect(second).toEqual({
      devicesChanged: false,
      devicesRevision: nowMs + 10,
      removedSessionIdTexts: [],
    });
  });

  it('compareAndSetPlaybackState refuses a stale revision or a different expected active device, and writes with any', async () => {
    const accountId = newAccountId();
    const nowMs = Date.now();
    const state = await writeActiveState(accountId, SESSION_A, nowMs);
    expect(await store.readPlaybackState(accountId)).toEqual({
      state,
      revision: nowMs,
      activeSessionIdText: SESSION_A,
    });

    const claimedByB = playingState({
      revision: nowMs + 1,
      activeSessionIdText: SESSION_B,
      updatedAtMs: nowMs + 1,
    });

    const stale = await store.compareAndSetPlaybackState({
      accountId,
      expectedRevision: 0,
      expectedActive: { kind: 'any' },
      newActiveSessionIdText: SESSION_B,
      state: claimedByB,
    });
    expect(stale).toEqual({ kind: 'conflict', revision: nowMs, activeSessionIdText: SESSION_A });

    const otherActive = await store.compareAndSetPlaybackState({
      accountId,
      expectedRevision: nowMs,
      expectedActive: { kind: 'session', sessionIdText: SESSION_B },
      newActiveSessionIdText: SESSION_B,
      state: claimedByB,
    });
    expect(otherActive).toEqual({
      kind: 'conflict',
      revision: nowMs,
      activeSessionIdText: SESSION_A,
    });

    const claimed = await store.compareAndSetPlaybackState({
      accountId,
      expectedRevision: nowMs,
      expectedActive: { kind: 'any' },
      newActiveSessionIdText: SESSION_B,
      state: claimedByB,
    });
    expect(claimed).toEqual({ kind: 'written', revision: nowMs + 1 });
    expect(await store.readPlaybackState(accountId)).toEqual({
      state: claimedByB,
      revision: nowMs + 1,
      activeSessionIdText: SESSION_B,
    });
  });

  it('a touch by the active device extends the state keys and a touch by another device does not', async () => {
    const accountId = newAccountId();
    const nowMs = Date.now();
    const redis = playbackRedis.getPlaybackRedis();
    const stateKeys = [
      playbackAccountKey(accountId, 'state'),
      playbackAccountKey(accountId, 'state_rev'),
      playbackAccountKey(accountId, 'active'),
    ];
    const shortTtlMs = 10_000;

    await touch(accountId, SESSION_A, nowMs);
    await touch(accountId, SESSION_B, nowMs);
    await writeActiveState(accountId, SESSION_A, nowMs);
    await Promise.all(stateKeys.map((key) => redis.pexpire(key, shortTtlMs)));

    await touch(accountId, SESSION_B, nowMs + 1_000);
    for (const ttlMs of await Promise.all(stateKeys.map((key) => redis.pttl(key)))) {
      expect(ttlMs).toBeGreaterThan(0);
      expect(ttlMs).toBeLessThanOrEqual(shortTtlMs);
    }

    await touch(accountId, SESSION_A, nowMs + 2_000);
    for (const ttlMs of await Promise.all(stateKeys.map((key) => redis.pttl(key)))) {
      expect(ttlMs).toBeGreaterThan(shortTtlMs);
    }
  });

  it('handlePlaybackPresenceChange with the active device removed writes a paused state with no active device and publishes devices, then state', async () => {
    const accountId = newAccountId();
    const nowMs = Date.now();
    await touch(accountId, SESSION_A, nowMs);
    await touch(accountId, SESSION_B, nowMs);
    const state = await writeActiveState(accountId, SESSION_A, nowMs);

    const messages: string[] = [];
    orm.registerAccountEventPublisher({
      publish: async (_channel: string, message: string) => {
        messages.push(message);
        return 0;
      },
    });
    try {
      const leftAtMs = nowMs + 5_000;
      const removal = await store.removePlaybackPresence({
        accountId,
        sessionIdText: SESSION_A,
        nowMs: leftAtMs,
      });
      await service.handlePlaybackPresenceChange({ accountId, result: removal, nowMs: leftAtMs });

      const pausedState: StoredPlaybackState = {
        ...state,
        revision: leftAtMs,
        active_session_id_text: null,
        status: 'paused',
        updated_at_ms: leftAtMs,
      };
      const events = messages.flatMap((message) => orm.parseAccountEventMessage(message) ?? []);
      expect(events).toEqual([
        {
          account_id: accountId,
          type: 'playback.devices',
          data: { revision: removal.devicesRevision, devices: [device(SESSION_B)] },
        },
        {
          account_id: accountId,
          type: 'playback.state',
          data: { ...pausedState, sent_at_ms: leftAtMs },
        },
      ]);
      expect(await store.readPlaybackState(accountId)).toEqual({
        state: pausedState,
        revision: leftAtMs,
        activeSessionIdText: null,
      });
    } finally {
      orm.registerAccountEventPublisher({ publish: async () => 0 });
    }
  });

  it('a saved command record reads back with a positive TTL of at most the record TTL, and an unknown id reads as null', async () => {
    const accountId = newAccountId();
    const commandIdText = randomUUID();
    usedCommandIds.push(commandIdText);
    const record = {
      account_id: accountId,
      sender_session_id_text: SESSION_A,
      target_session_id_text: SESSION_B,
      expires_at_ms: Date.now() + 5_000,
    };

    await store.savePlaybackCommand(commandIdText, record);

    expect(await store.readPlaybackCommand(commandIdText)).toEqual(record);
    const ttlMs = await playbackRedis.getPlaybackRedis().pttl(playbackCommandKey(commandIdText));
    expect(ttlMs).toBeGreaterThan(0);
    expect(ttlMs).toBeLessThanOrEqual(store.PLAYBACK_COMMAND_RECORD_TTL_MS);
    expect(await store.readPlaybackCommand(randomUUID())).toBeNull();
  });
});
