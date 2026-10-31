import { config } from '@api/config/index.js';
import { loggerService } from '@api/factories/loggerService.js';
import type { AccountEventSubscription } from '@api/lib/accountEvents/accountEventRedis.js';
import { subscribeAccountEvents } from '@api/lib/accountEvents/accountEventRedis.js';
import { accountNotificationToJson } from '@api/lib/accountNotificationApiSerialization.js';
import { PlaybackStoreUnavailableError } from '@api/lib/accountPlayback/playbackRedis.js';
import {
  handlePlaybackPresenceChange,
  readPlaybackSnapshot,
} from '@api/lib/accountPlayback/playbackService.js';
import {
  beginPlaybackPresenceSession,
  prunePlaybackPresence,
  removePlaybackPresence,
  shortenPlaybackPresence,
} from '@api/lib/accountPlayback/playbackStore.js';

import type {
  AccountPlaybackStreamEvent,
  AuthSessionEndedNotice,
  DTOAccountNotificationStreamCreated,
  DTOAccountNotificationStreamRead,
  DTOAccountNotificationStreamResync,
  DTOAccountNotificationStreamState,
  DTOAccountSessionStreamEnded,
  DTOPlaybackDevices,
  DTOPlaybackSnapshot,
} from '@podverse/helpers';
import {
  ACCOUNT_EVENTS_STREAM_HEARTBEAT_MS,
  ACCOUNT_NOTIFICATION_STREAM_EVENT,
  ACCOUNT_NOTIFICATIONS_REPLAY_LIMIT,
  ACCOUNT_PLAYBACK_STREAM_EVENT,
  ACCOUNT_SESSION_STREAM_EVENT,
  getAuthSessionEndedNotice,
  toAccountPlaybackStreamEvent,
} from '@podverse/helpers';
import type {
  AccountEvent,
  AccountNotification,
  AccountNotificationSignal,
  AccountSessionEndedSignal,
} from '@podverse/orm';
import {
  AccountNotificationService,
  AccountService,
  toAccountNotificationSignal,
  toAccountSessionEndedSignal,
} from '@podverse/orm';

import { formatSseComment, formatSseEvent, formatSseRetry } from './sseWire.js';

/**
 * Backstop for a stream whose `session.ended` event never arrives. A session-ended event closes
 * a stream at once, but a revocation published during a Redis outage is dropped, and deleting an
 * account removes its sessions without publishing. The cap also spreads clients across pods after
 * a scale-out. Its cost is one authenticated reconnect per client per 30 minutes, which is why the
 * hub does not re-check every open stream's session when Redis recovers.
 */
export const ACCOUNT_EVENT_STREAM_MAX_LIFETIME_MS = 30 * 60_000;

/** Per account, per pod. Web shares one stream across tabs, so this is a guard. */
export const ACCOUNT_EVENT_STREAM_MAX_PER_ACCOUNT = 10;

/** Browser reconnect delay, sent as the first bytes of every stream. */
export const ACCOUNT_EVENT_STREAM_RETRY_MS = 5_000;

/** Delivered notification ids each stream remembers, so a repeated id is not sent twice. */
const RECENT_IDS_LIMIT = 200;

/**
 * How long the hub remembers an ended session. The session check runs a few milliseconds before
 * the stream registers, so an event that lands in that gap still closes the stream.
 */
const RECENTLY_ENDED_SESSION_TTL_MS = 60_000;

/** Most remembered ended sessions; the oldest are dropped first. */
const RECENTLY_ENDED_SESSION_MAX = 10_000;

/**
 * How often each pod prunes playback presence for the accounts it holds streams for, so a device
 * that vanished without closing its stream (sleep, lost network) leaves the device menu.
 */
export const PLAYBACK_PRESENCE_SWEEP_INTERVAL_MS = 10_000;

/** One device alone has nobody to show its departure to, so smaller accounts are not swept. */
const PLAYBACK_PRESENCE_SWEEP_MIN_DEVICES = 2;

/** The leave check runs this long after the grace, so the shortened check-in has passed. */
const PLAYBACK_PRESENCE_LEAVE_CHECK_MARGIN_MS = 250;

/** Live playback events one stream holds while its snapshot is read; the oldest go first. */
const PENDING_PLAYBACK_EVENTS_LIMIT = 50;

/** The part of an Express response a stream writes to. */
export type AccountEventStreamResponse = {
  readonly writable: boolean;
  readonly writableEnded: boolean;
  write(chunk: string): boolean;
  end(): unknown;
};

/** Playback events relayed from the fanout. Only this hub writes `playback.snapshot`. */
type RelayedPlaybackStreamEvent = Exclude<
  AccountPlaybackStreamEvent,
  { type: typeof ACCOUNT_PLAYBACK_STREAM_EVENT.snapshot }
>;

export type AccountEventStream = {
  readonly account_id: number;
  /** The session the stream's token names; null for an API key, which no session event closes. */
  readonly sessionIdText: string | null;
  /**
   * Generation from when this stream opened, or null when it has no session. A leave hold is
   * stored only while this is still the session's generation, so a later stream is not held.
   */
  readonly presenceGeneration: number | null;
  readonly response: AccountEventStreamResponse;
  /** This stream's copy of the account's Mark All as Read cutoff. */
  cutoff: Date | null;
  /** Highest notification id this stream has delivered or knows the client has. */
  highWaterId: number;
  readonly recentIds: Set<number>;
  heartbeat: ReturnType<typeof setInterval> | null;
  endTimer: ReturnType<typeof setTimeout> | null;
  /** Set once the stream has ended by any path; nothing is written after that. */
  closed: boolean;
  /**
   * Playback snapshot reads in flight for this stream, 1 from registration. While above zero, live
   * playback events wait in `pendingPlaybackEvents`, so none is written ahead of an older
   * snapshot; clients apply a snapshot without a revision check.
   */
  playbackSnapshotReads: number;
  /** In arrival order, at most `PENDING_PLAYBACK_EVENTS_LIMIT`. */
  readonly pendingPlaybackEvents: RelayedPlaybackStreamEvent[];
};

export type AccountEventStreamAdmission = 'open' | 'limit' | 'closed';

/**
 * Why a stream ended. Only the client leaving (`client_closed`, `write_failed`) or its session
 * ending changes the device's playback presence. After any other end the client reconnects and
 * keeps checking in.
 */
export type AccountEventStreamEndReason =
  | 'client_closed'
  | 'write_failed'
  | 'lifetime'
  | 'token_expiry'
  | 'session_ended'
  | 'shutdown'
  | 'start_failed'
  | 'account_deleted';

type RecentlyEndedSession = {
  account_id: number;
  notice: AuthSessionEndedNotice | null;
  expiresAtMs: number;
};

const streamsByAccount = new Map<number, Set<AccountEventStream>>();
const chainsByAccount = new Map<number, Promise<void>>();
/** Keyed by session id text, in insertion order. */
const recentlyEndedSessions = new Map<string, RecentlyEndedSession>();
const loggedUnhandledTypes = new Set<string>();
const loggedInvalidPlaybackTypes = new Set<string>();
/**
 * The newest device list size seen per account with a stream on this pod, from snapshots and
 * `playback.devices` events. The sweep reads it.
 */
const knownPlaybackDevicesByAccount = new Map<number, { revision: number; count: number }>();
const presenceLeaveTimers = new Set<ReturnType<typeof setTimeout>>();
let presenceSweepTimer: ReturnType<typeof setInterval> | null = null;
let presenceSweepRunning = false;
let playbackStoreOutageLogged = false;
let subscription: AccountEventSubscription | null = null;
let hubClosed = false;
let accountNotificationService: AccountNotificationService | null = null;
let accountService: AccountService | null = null;

const getAccountNotificationService = (): AccountNotificationService => {
  accountNotificationService ??= new AccountNotificationService();
  return accountNotificationService;
};

const getAccountService = (): AccountService => {
  accountService ??= new AccountService();
  return accountService;
};

const getOpenStreams = (account_id: number): AccountEventStream[] =>
  Array.from(streamsByAccount.get(account_id) ?? []).filter((stream) => !stream.closed);

/**
 * Runs each account's work in arrival order, so two events for one account are delivered in the
 * order they were received even when the first one's queries resolve last.
 */
const enqueueForAccount = (account_id: number, work: () => Promise<void>): void => {
  const previous = chainsByAccount.get(account_id) ?? Promise.resolve();
  const next = previous.then(work).catch((error: unknown) => {
    loggerService.logError('Account event stream delivery failed', error);
  });
  chainsByAccount.set(account_id, next);
  void next.finally(() => {
    if (chainsByAccount.get(account_id) === next) {
      chainsByAccount.delete(account_id);
    }
  });
};

/** False when the stream has ended, the socket is gone, the write threw, or the socket backed up. */
const tryWrite = (stream: AccountEventStream, chunk: string): boolean => {
  if (stream.closed) {
    return false;
  }
  const { response } = stream;
  if (!response.writable || response.writableEnded) {
    return false;
  }
  try {
    return response.write(chunk);
  } catch {
    return false;
  }
};

/**
 * A client that is not draining its socket is ended rather than buffered; it reconnects with
 * `Last-Event-ID` and replay covers the gap.
 */
const writeChunk = (stream: AccountEventStream, chunk: string): boolean => {
  if (tryWrite(stream, chunk)) {
    return true;
  }
  endStream(stream, 'write_failed');
  return false;
};

const writeState = (stream: AccountEventStream, unread_count: number): void => {
  const data: DTOAccountNotificationStreamState = {
    unread_count,
    last_read_at: stream.cutoff?.toISOString() ?? null,
  };
  writeChunk(stream, formatSseEvent({ event: ACCOUNT_NOTIFICATION_STREAM_EVENT.state, data }));
};

const writeRead = (stream: AccountEventStream, data: DTOAccountNotificationStreamRead): void => {
  writeChunk(stream, formatSseEvent({ event: ACCOUNT_NOTIFICATION_STREAM_EVENT.read, data }));
};

const rememberDelivered = (stream: AccountEventStream, id: number): void => {
  stream.highWaterId = Math.max(stream.highWaterId, id);
  stream.recentIds.add(id);
  if (stream.recentIds.size > RECENT_IDS_LIMIT) {
    const oldest = stream.recentIds.values().next();
    if (oldest.done !== true) {
      stream.recentIds.delete(oldest.value);
    }
  }
};

const writeCreated = (
  stream: AccountEventStream,
  row: AccountNotification,
  unread_count: number
): void => {
  if (stream.recentIds.has(row.id)) {
    return;
  }
  const data: DTOAccountNotificationStreamCreated = {
    notification: accountNotificationToJson(row, stream.cutoff),
    unread_count,
  };
  const event = ACCOUNT_NOTIFICATION_STREAM_EVENT.created;
  if (writeChunk(stream, formatSseEvent({ event, data, id: row.id }))) {
    rememberDelivered(stream, row.id);
  }
};

/** One count per distinct cutoff for the duration of one piece of work. */
const createUnreadCounter = (account_id: number): ((cutoff: Date | null) => Promise<number>) => {
  const counts = new Map<number | null, Promise<number>>();
  return (cutoff) => {
    const key = cutoff?.getTime() ?? null;
    let count = counts.get(key);
    if (count === undefined) {
      count = getAccountNotificationService().countUnread(account_id, cutoff);
      counts.set(key, count);
    }
    return count;
  };
};

const raiseHighWaterToLatest = async (stream: AccountEventStream): Promise<void> => {
  const maxId = await getAccountNotificationService().getMaxIdForAccount(stream.account_id);
  stream.highWaterId = Math.max(stream.highWaterId, maxId ?? 0);
};

/**
 * Sends every notification after `afterId`, or one `notification.resync` when there are more than
 * the replay limit. Only `notification.created` carries an SSE id, so it is the only event that
 * replays.
 */
const replayAfter = async (
  stream: AccountEventStream,
  afterId: number,
  unread_count: number
): Promise<void> => {
  const rows = await getAccountNotificationService().listForAccountAfterId(
    stream.account_id,
    afterId,
    ACCOUNT_NOTIFICATIONS_REPLAY_LIMIT + 1
  );
  if (rows.length > ACCOUNT_NOTIFICATIONS_REPLAY_LIMIT) {
    const data: DTOAccountNotificationStreamResync = { reason: 'replay_limit' };
    writeChunk(stream, formatSseEvent({ event: ACCOUNT_NOTIFICATION_STREAM_EVENT.resync, data }));
    await raiseHighWaterToLatest(stream);
    return;
  }
  for (const row of rows) {
    writeCreated(stream, row, unread_count);
  }
};

const startStream = async (
  stream: AccountEventStream,
  lastEventId: number | null
): Promise<void> => {
  try {
    const unreadCount = await getAccountNotificationService().countUnread(
      stream.account_id,
      stream.cutoff
    );
    writeState(stream, unreadCount);
    if (lastEventId === null) {
      await raiseHighWaterToLatest(stream);
    } else {
      await replayAfter(stream, lastEventId, unreadCount);
    }
  } catch (error) {
    loggerService.logError('Failed to start account event stream', error);
    endStream(stream, 'start_failed');
  }
};

const deliverSignal = async (
  account_id: number,
  signal: AccountNotificationSignal
): Promise<void> => {
  if (getOpenStreams(account_id).length === 0) {
    return;
  }
  const countUnread = createUnreadCounter(account_id);

  switch (signal.kind) {
    case 'created': {
      const ids = signal.pairs.map(([, notification_id]) => notification_id);
      const rows = await getAccountNotificationService().getManyByIdsForAccount(account_id, ids);
      if (rows.length === 0) {
        return;
      }
      const deliveries = await Promise.all(
        getOpenStreams(account_id).map(async (stream) => ({
          stream,
          unreadCount: await countUnread(stream.cutoff),
        }))
      );
      // Rows can commit out of id order across workers, so delivery follows the ids in the event
      // and never filters on the high-water mark.
      for (const { stream, unreadCount } of deliveries) {
        for (const row of rows) {
          writeCreated(stream, row, unreadCount);
        }
      }
      return;
    }
    case 'read_all': {
      const cutoff = new Date(signal.last_read_at);
      if (Number.isNaN(cutoff.getTime())) {
        return;
      }
      for (const stream of getOpenStreams(account_id)) {
        stream.cutoff = cutoff;
      }
      const unreadCount = await countUnread(cutoff);
      for (const stream of getOpenStreams(account_id)) {
        writeRead(stream, {
          scope: 'all',
          last_read_at: signal.last_read_at,
          unread_count: unreadCount,
        });
      }
      return;
    }
    case 'read_one': {
      const deliveries = await Promise.all(
        getOpenStreams(account_id).map(async (stream) => ({
          stream,
          unreadCount: await countUnread(stream.cutoff),
        }))
      );
      for (const { stream, unreadCount } of deliveries) {
        writeRead(stream, {
          scope: 'one',
          notification_id: signal.notification_id,
          unread_count: unreadCount,
        });
      }
      return;
    }
  }
};

/**
 * Events published while this pod's subscriber was disconnected never arrived, including read
 * changes, so each stream replays from its high-water mark and then gets a fresh state snapshot.
 */
const recoverAccount = async (account_id: number): Promise<void> => {
  if (getOpenStreams(account_id).length === 0) {
    return;
  }
  const account = await getAccountService().get(account_id);
  if (account === null) {
    for (const stream of getOpenStreams(account_id)) {
      endStream(stream, 'account_deleted');
    }
    return;
  }
  const cutoff = account.notifications_last_read_at ?? null;
  for (const stream of getOpenStreams(account_id)) {
    stream.cutoff = cutoff;
  }
  const unreadCount = await getAccountNotificationService().countUnread(account_id, cutoff);
  for (const stream of getOpenStreams(account_id)) {
    await replayAfter(stream, stream.highWaterId, unreadCount);
  }
  for (const stream of getOpenStreams(account_id)) {
    writeState(stream, unreadCount);
  }
};

/**
 * The last event on the stream, with no SSE id so it never replays. A failed write still ends the
 * stream as a session end.
 */
const endWithSessionEnded = (
  stream: AccountEventStream,
  notice: AuthSessionEndedNotice | null
): void => {
  const data: DTOAccountSessionStreamEnded = { notice };
  tryWrite(stream, formatSseEvent({ event: ACCOUNT_SESSION_STREAM_EVENT.ended, data }));
  endStream(stream, 'session_ended');
};

const rememberEndedSession = (sessionIdText: string, entry: RecentlyEndedSession): void => {
  const nowMs = Date.now();
  for (const [key, existing] of recentlyEndedSessions) {
    if (existing.expiresAtMs > nowMs) {
      break;
    }
    recentlyEndedSessions.delete(key);
  }
  recentlyEndedSessions.delete(sessionIdText);
  recentlyEndedSessions.set(sessionIdText, entry);
  while (recentlyEndedSessions.size > RECENTLY_ENDED_SESSION_MAX) {
    const oldest = recentlyEndedSessions.keys().next();
    if (oldest.done === true) {
      break;
    }
    recentlyEndedSessions.delete(oldest.value);
  }
};

const findRecentlyEndedSession = (
  account_id: number,
  sessionIdText: string
): RecentlyEndedSession | null => {
  const entry = recentlyEndedSessions.get(sessionIdText);
  if (entry === undefined || entry.account_id !== account_id || entry.expiresAtMs <= Date.now()) {
    return null;
  }
  return entry;
};

/**
 * Runs at once, outside the account's queue and with no query. The ids are remembered whether or
 * not this pod holds a stream for the account, because a stream may be registering.
 */
const handleSessionsEnded = (signal: AccountSessionEndedSignal): void => {
  const notice = getAuthSessionEndedNotice(signal.reason);
  const expiresAtMs = Date.now() + RECENTLY_ENDED_SESSION_TTL_MS;
  for (const sessionIdText of signal.session_id_texts) {
    rememberEndedSession(sessionIdText, { account_id: signal.account_id, notice, expiresAtMs });
  }

  const endedIds = new Set(signal.session_id_texts);
  for (const stream of getOpenStreams(signal.account_id)) {
    if (stream.sessionIdText !== null && endedIds.has(stream.sessionIdText)) {
      endWithSessionEnded(stream, notice);
    }
  }
};

/**
 * A store outage is logged once, until a playback store call succeeds again. Every other failure
 * is logged each time.
 */
const logPlaybackStoreFailure = (message: string, error: unknown): void => {
  if (error instanceof PlaybackStoreUnavailableError) {
    if (!playbackStoreOutageLogged) {
      playbackStoreOutageLogged = true;
      loggerService.warn(message, { error: error.message });
    }
    return;
  }
  loggerService.logError(message, error);
};

/** Runs playback store work without making the caller wait or fail. */
const runPlaybackStoreWork = (message: string, work: () => Promise<void>): void => {
  void work().then(
    () => {
      playbackStoreOutageLogged = false;
    },
    (error: unknown) => {
      logPlaybackStoreFailure(message, error);
    }
  );
};

/** An older list never replaces a newer one, and an account with no stream here is not kept. */
const rememberPlaybackDevices = (account_id: number, devices: DTOPlaybackDevices): void => {
  if (!streamsByAccount.has(account_id)) {
    return;
  }
  const known = knownPlaybackDevicesByAccount.get(account_id);
  if (known !== undefined && known.revision > devices.revision) {
    return;
  }
  knownPlaybackDevicesByAccount.set(account_id, {
    revision: devices.revision,
    count: devices.devices.length,
  });
};

/** The prune script reports each removal to one caller, so pods pruning one account publish once. */
const prunePlaybackPresenceAndPublish = async (accountId: number): Promise<void> => {
  const nowMs = Date.now();
  const result = await prunePlaybackPresence({ accountId, nowMs });
  if (result.devicesChanged) {
    await handlePlaybackPresenceChange({ accountId, result, nowMs });
  }
};

/**
 * Lowers the device's check-in to the leave grace, so a quick reconnect keeps it in the menu, and
 * prunes once the grace has passed, so its departure is published even when no sweep covers the
 * account.
 */
const startPlaybackPresenceLeave = (
  accountId: number,
  sessionIdText: string,
  presenceGeneration: number | null
): void => {
  const graceMs = config.playback.presenceLeaveGraceMs;
  runPlaybackStoreWork('Failed to shorten playback presence', async () => {
    await shortenPlaybackPresence({
      accountId,
      sessionIdText,
      expiresAtMs: Date.now() + graceMs,
      presenceGeneration,
    });
  });
  const timer = setTimeout(() => {
    presenceLeaveTimers.delete(timer);
    runPlaybackStoreWork('Failed to prune playback presence', () =>
      prunePlaybackPresenceAndPublish(accountId)
    );
  }, graceMs + PLAYBACK_PRESENCE_LEAVE_CHECK_MARGIN_MS);
  timer.unref();
  presenceLeaveTimers.add(timer);
};

/**
 * Several tabs share one session, so presence changes only when the session's last open stream on
 * this pod ends.
 */
const updatePlaybackPresenceAfterEnd = (
  stream: AccountEventStream,
  reason: AccountEventStreamEndReason
): void => {
  const { account_id: accountId, sessionIdText } = stream;
  if (sessionIdText === null || hubClosed) {
    return;
  }
  if (getOpenStreams(accountId).some((other) => other.sessionIdText === sessionIdText)) {
    return;
  }
  if (reason === 'client_closed' || reason === 'write_failed') {
    startPlaybackPresenceLeave(accountId, sessionIdText, stream.presenceGeneration);
    return;
  }
  if (reason === 'session_ended') {
    runPlaybackStoreWork('Failed to remove playback presence for an ended session', async () => {
      const nowMs = Date.now();
      const result = await removePlaybackPresence({ accountId, sessionIdText, nowMs });
      if (result.devicesChanged) {
        await handlePlaybackPresenceChange({ accountId, result, nowMs });
      }
    });
  }
};

/** Accounts run one after another; a removal's publish returns through Redis like any event. */
const sweepPlaybackPresence = async (): Promise<void> => {
  for (const accountId of Array.from(streamsByAccount.keys())) {
    if (hubClosed) {
      return;
    }
    const known = knownPlaybackDevicesByAccount.get(accountId);
    if (known === undefined || known.count < PLAYBACK_PRESENCE_SWEEP_MIN_DEVICES) {
      continue;
    }
    try {
      await prunePlaybackPresenceAndPublish(accountId);
      playbackStoreOutageLogged = false;
    } catch (error) {
      logPlaybackStoreFailure('Failed to sweep playback presence', error);
    }
  }
};

/** A tick that arrives while the previous sweep is still running is skipped. */
const runPlaybackPresenceSweep = (): void => {
  if (presenceSweepRunning) {
    return;
  }
  presenceSweepRunning = true;
  void sweepPlaybackPresence().finally(() => {
    presenceSweepRunning = false;
  });
};

/** A command goes only to its target's streams, and a start-failed report only to its sender's. */
const isPlaybackEventForStream = (
  stream: AccountEventStream,
  event: RelayedPlaybackStreamEvent
): boolean => {
  switch (event.type) {
    case ACCOUNT_PLAYBACK_STREAM_EVENT.command:
      return stream.sessionIdText === event.data.target_session_id_text;
    case ACCOUNT_PLAYBACK_STREAM_EVENT.startFailed:
      return stream.sessionIdText === event.data.sender_session_id_text;
    case ACCOUNT_PLAYBACK_STREAM_EVENT.state:
    case ACCOUNT_PLAYBACK_STREAM_EVENT.devices:
      return true;
  }
};

/** True, with a debug log, for a command whose `expires_at_ms` has passed. */
const shouldDropExpiredPlaybackCommand = (event: RelayedPlaybackStreamEvent): boolean => {
  if (
    event.type !== ACCOUNT_PLAYBACK_STREAM_EVENT.command ||
    Date.now() < event.data.expires_at_ms
  ) {
    return false;
  }
  loggerService.debug('Dropping expired playback command', {
    command_id: event.data.command_id,
    expires_at_ms: event.data.expires_at_ms,
  });
  return true;
};

/**
 * The one write for a relayed playback event, live or held, so targeting and expiry apply to
 * both. No SSE id: playback events never replay.
 */
const writePlaybackEvent = (
  stream: AccountEventStream,
  event: RelayedPlaybackStreamEvent
): void => {
  if (!isPlaybackEventForStream(stream, event) || shouldDropExpiredPlaybackCommand(event)) {
    return;
  }
  const data =
    event.type === ACCOUNT_PLAYBACK_STREAM_EVENT.state
      ? { ...event.data, sent_at_ms: Date.now() }
      : event.data;
  writeChunk(stream, formatSseEvent({ event: event.type, data }));
};

const holdPlaybackEvent = (stream: AccountEventStream, event: RelayedPlaybackStreamEvent): void => {
  if (!isPlaybackEventForStream(stream, event)) {
    return;
  }
  stream.pendingPlaybackEvents.push(event);
  if (stream.pendingPlaybackEvents.length > PENDING_PLAYBACK_EVENTS_LIMIT) {
    stream.pendingPlaybackEvents.shift();
  }
};

/**
 * Written at once, outside the account's queue: playback events need no query, and waiting
 * behind a notification query would make remote progress and controls lag.
 */
const deliverPlaybackEvent = (account_id: number, event: RelayedPlaybackStreamEvent): void => {
  if (shouldDropExpiredPlaybackCommand(event)) {
    return;
  }
  if (event.type === ACCOUNT_PLAYBACK_STREAM_EVENT.devices) {
    rememberPlaybackDevices(account_id, event.data);
  }
  for (const stream of getOpenStreams(account_id)) {
    if (stream.playbackSnapshotReads > 0) {
      holdPlaybackEvent(stream, event);
    } else {
      writePlaybackEvent(stream, event);
    }
  }
};

/** `playback.snapshot` from Redis is not expected, since only this hub writes it. */
const handlePlaybackEvent = (event: AccountEvent): void => {
  const playbackEvent = toAccountPlaybackStreamEvent(event.type, event.data);
  if (playbackEvent === null || playbackEvent.type === ACCOUNT_PLAYBACK_STREAM_EVENT.snapshot) {
    if (!loggedInvalidPlaybackTypes.has(event.type)) {
      loggedInvalidPlaybackTypes.add(event.type);
      loggerService.warn('Dropping playback account event with an unknown type or invalid data', {
        type: event.type,
      });
    }
    return;
  }
  deliverPlaybackEvent(event.account_id, playbackEvent);
};

const writePlaybackSnapshot = (stream: AccountEventStream, snapshot: DTOPlaybackSnapshot): void => {
  const data: DTOPlaybackSnapshot = {
    devices: snapshot.devices,
    state: snapshot.state === null ? null : { ...snapshot.state, sent_at_ms: Date.now() },
  };
  writeChunk(stream, formatSseEvent({ event: ACCOUNT_PLAYBACK_STREAM_EVENT.snapshot, data }));
};

/**
 * Reads one snapshot for `streams`, all of one account, and writes it to each. A stream with no
 * other read in flight then gets the events it held, in arrival order; the client's revision
 * check drops any the snapshot already covers. A failed read still releases held events, and the
 * client has no snapshot until its next connection, as it would see with the store down anyway.
 */
const sendPlaybackSnapshot = async (
  account_id: number,
  streams: AccountEventStream[]
): Promise<void> => {
  let snapshot: DTOPlaybackSnapshot | null = null;
  try {
    snapshot = await readPlaybackSnapshot({ accountId: account_id, nowMs: Date.now() });
    playbackStoreOutageLogged = false;
    rememberPlaybackDevices(account_id, snapshot.devices);
  } catch (error) {
    logPlaybackStoreFailure('Failed to read the playback snapshot', error);
  }
  for (const stream of streams) {
    stream.playbackSnapshotReads -= 1;
    if (stream.closed) {
      continue;
    }
    if (snapshot !== null) {
      writePlaybackSnapshot(stream, snapshot);
    }
    if (stream.playbackSnapshotReads === 0) {
      for (const event of stream.pendingPlaybackEvents.splice(0)) {
        writePlaybackEvent(stream, event);
      }
    }
  }
};

/** Playback events published while the subscriber was down were lost too. */
const refreshPlaybackSnapshot = (account_id: number): void => {
  const streams = getOpenStreams(account_id);
  if (streams.length === 0) {
    return;
  }
  for (const stream of streams) {
    stream.playbackSnapshotReads += 1;
  }
  void sendPlaybackSnapshot(account_id, streams);
};

const handleAccountEvent = (event: AccountEvent): void => {
  const sessionsEnded = toAccountSessionEndedSignal(event);
  if (sessionsEnded !== null) {
    handleSessionsEnded(sessionsEnded);
    return;
  }
  if (!streamsByAccount.has(event.account_id)) {
    return;
  }
  if (event.type.startsWith('playback.')) {
    handlePlaybackEvent(event);
    return;
  }
  const signal = toAccountNotificationSignal(event);
  if (signal === null) {
    // Notification types newer than this build, and namespaces it has no handler for.
    if (!loggedUnhandledTypes.has(event.type)) {
      loggedUnhandledTypes.add(event.type);
      loggerService.debug('Ignoring account event with no stream handler', { type: event.type });
    }
    return;
  }
  enqueueForAccount(event.account_id, () => deliverSignal(event.account_id, signal));
};

const handleRecovered = (): void => {
  for (const account_id of Array.from(streamsByAccount.keys())) {
    enqueueForAccount(account_id, async () => {
      try {
        await recoverAccount(account_id);
      } finally {
        refreshPlaybackSnapshot(account_id);
      }
    });
  }
};

/** Whichever comes first: the lifetime cap or the token's expiry. */
const getEndTimer = (
  tokenExpiresAt: number | undefined
): { delayMs: number; reason: 'lifetime' | 'token_expiry' } => {
  if (tokenExpiresAt === undefined) {
    return { delayMs: ACCOUNT_EVENT_STREAM_MAX_LIFETIME_MS, reason: 'lifetime' };
  }
  const untilTokenExpiryMs = Math.max(0, tokenExpiresAt * 1000 - Date.now());
  return untilTokenExpiryMs < ACCOUNT_EVENT_STREAM_MAX_LIFETIME_MS
    ? { delayMs: untilTokenExpiryMs, reason: 'token_expiry' }
    : { delayMs: ACCOUNT_EVENT_STREAM_MAX_LIFETIME_MS, reason: 'lifetime' };
};

/**
 * Subscribes this pod to account events and starts the playback presence sweep. Returns at once;
 * Redis connects in the background.
 */
export function startAccountEventStreamHub(): void {
  if (subscription !== null) {
    return;
  }
  hubClosed = false;
  subscription = subscribeAccountEvents({
    onEvent: handleAccountEvent,
    onRecovered: handleRecovered,
  });
  presenceSweepTimer = setInterval(runPlaybackPresenceSweep, PLAYBACK_PRESENCE_SWEEP_INTERVAL_MS);
  presenceSweepTimer.unref();
}

/**
 * Ends every open stream, stops the presence sweep and leave timers, and closes the subscription.
 * Call it before `server.close`, which waits for open connections. Safe to call twice.
 */
export async function closeAccountEventStreamHub(): Promise<void> {
  hubClosed = true;
  if (presenceSweepTimer !== null) {
    clearInterval(presenceSweepTimer);
    presenceSweepTimer = null;
  }
  for (const streams of Array.from(streamsByAccount.values())) {
    for (const stream of Array.from(streams)) {
      endStream(stream, 'shutdown');
    }
  }
  for (const timer of presenceLeaveTimers) {
    clearTimeout(timer);
  }
  presenceLeaveTimers.clear();
  knownPlaybackDevicesByAccount.clear();
  recentlyEndedSessions.clear();
  const current = subscription;
  subscription = null;
  if (current !== null) {
    await current.close();
  }
}

export function getAccountEventStreamAdmission(account_id: number): AccountEventStreamAdmission {
  if (hubClosed) {
    return 'closed';
  }
  const openCount = streamsByAccount.get(account_id)?.size ?? 0;
  return openCount >= ACCOUNT_EVENT_STREAM_MAX_PER_ACCOUNT ? 'limit' : 'open';
}

/**
 * Registers a response whose headers are already sent. Writes the retry line at once, then the
 * state snapshot and any replay on the account's queue, ahead of later live notification events,
 * then `playback.snapshot`; live playback events wait until it is written. A session that ended in
 * the last minute gets only `session.ended`, and the stream ends. A session stream bumps the
 * presence generation before any bytes are written, so a leave from an older stream cannot hold
 * this connection's check-ins.
 */
export async function openAccountEventStream(params: {
  account_id: number;
  /** Null for an API key. */
  sessionIdText: string | null;
  response: AccountEventStreamResponse;
  cutoff: Date | null;
  lastEventId: number | null;
  /** Epoch seconds; the stream ends then if that is sooner than the lifetime cap. */
  tokenExpiresAt?: number;
}): Promise<AccountEventStream> {
  const sessionIdText = params.sessionIdText;
  const presenceGeneration =
    sessionIdText === null || sessionIdText === ''
      ? null
      : await beginPlaybackPresenceSession({
          accountId: params.account_id,
          sessionIdText,
          generationTtlMs: ACCOUNT_EVENT_STREAM_MAX_LIFETIME_MS + 60_000,
        });
  const stream: AccountEventStream = {
    account_id: params.account_id,
    sessionIdText,
    presenceGeneration,
    response: params.response,
    cutoff: params.cutoff,
    highWaterId: params.lastEventId ?? 0,
    recentIds: new Set(),
    heartbeat: null,
    endTimer: null,
    closed: false,
    playbackSnapshotReads: 1,
    pendingPlaybackEvents: [],
  };

  let streams = streamsByAccount.get(params.account_id);
  if (streams === undefined) {
    streams = new Set();
    streamsByAccount.set(params.account_id, streams);
  }
  streams.add(stream);

  stream.heartbeat = setInterval(() => {
    writeChunk(stream, formatSseComment('ping'));
  }, ACCOUNT_EVENTS_STREAM_HEARTBEAT_MS);
  const endTimer = getEndTimer(params.tokenExpiresAt);
  stream.endTimer = setTimeout(() => {
    endStream(stream, endTimer.reason);
  }, endTimer.delayMs);

  if (!writeChunk(stream, formatSseRetry(ACCOUNT_EVENT_STREAM_RETRY_MS))) {
    return stream;
  }
  const endedSession =
    params.sessionIdText === null
      ? null
      : findRecentlyEndedSession(params.account_id, params.sessionIdText);
  if (endedSession !== null) {
    endWithSessionEnded(stream, endedSession.notice);
    return stream;
  }
  enqueueForAccount(params.account_id, async () => {
    await startStream(stream, params.lastEventId);
    if (!stream.closed) {
      void sendPlaybackSnapshot(params.account_id, [stream]);
    }
  });
  return stream;
}

/** Ends a stream whose client closed the connection. Safe to call twice. */
export function closeAccountEventStream(stream: AccountEventStream): void {
  endStream(stream, 'client_closed');
}

/**
 * The one way a stream ends: token expiry, the lifetime cap, a failed or backed-up write, client
 * close, hub shutdown, and session end all come here. Ends the response, clears its timers,
 * removes it from the hub, then updates the device's playback presence for `reason` without
 * waiting on the store. Safe to call twice; only the first reason counts.
 */
function endStream(stream: AccountEventStream, reason: AccountEventStreamEndReason): void {
  if (stream.closed) {
    return;
  }
  stream.closed = true;
  if (stream.heartbeat !== null) {
    clearInterval(stream.heartbeat);
    stream.heartbeat = null;
  }
  if (stream.endTimer !== null) {
    clearTimeout(stream.endTimer);
    stream.endTimer = null;
  }

  const streams = streamsByAccount.get(stream.account_id);
  streams?.delete(stream);
  if (streams?.size === 0) {
    streamsByAccount.delete(stream.account_id);
    knownPlaybackDevicesByAccount.delete(stream.account_id);
  }

  if (!stream.response.writableEnded) {
    try {
      stream.response.end();
    } catch {
      // The socket is already gone; there is nothing left to end.
    }
  }

  updatePlaybackPresenceAfterEnd(stream, reason);
}
