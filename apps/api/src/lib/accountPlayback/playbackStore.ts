import type { DTOPlaybackDevice, DTOPlaybackDevices, DTOPlaybackState } from '@podverse/helpers';
import {
  isDTOPlaybackDevice,
  isDTOPlaybackState,
  isPlainObject,
  PLAYBACK_PRESENCE_TTL_MS,
} from '@podverse/helpers';

import { getPlaybackRedis } from './playbackRedis.js';
import {
  PRESENCE_PRUNE,
  PRESENCE_REMOVE,
  PRESENCE_SHORTEN,
  PRESENCE_STREAM_BEGIN,
  PRESENCE_TOUCH,
  STATE_COMPARE_AND_SET,
} from './playbackStoreScripts.js';

/** Presence keys outlive the longest presence, so an account nobody uses leaves nothing behind. */
export const PLAYBACK_PRESENCE_KEY_TTL_MS = PLAYBACK_PRESENCE_TTL_MS * 3;
/**
 * State keys live this long after each state write and each check-in by the active device, so a
 * long pause on a present device never expires the slot under it.
 */
export const PLAYBACK_STATE_TTL_MS = 60 * 60 * 1000;
/** Longer than the command itself, because a tap-to-play prompt can take a while to fail. */
export const PLAYBACK_COMMAND_RECORD_TTL_MS = 60_000;

/** `DTOPlaybackState` as stored: everything but the per-write `sent_at_ms`. */
export type StoredPlaybackState = Omit<DTOPlaybackState, 'sent_at_ms'>;

export interface StoredPlaybackCommand {
  account_id: number;
  sender_session_id_text: string;
  target_session_id_text: string;
  expires_at_ms: number;
}

export interface PlaybackPresenceResult {
  devicesChanged: boolean;
  devicesRevision: number;
  /** Members this call removed. Each removal is reported to exactly one caller. */
  removedSessionIdTexts: string[];
  /**
   * False when this check-in did not extend presence because the session's stream had already
   * ended. Absent on prune and remove.
   */
  extended?: boolean;
}

export interface PlaybackStateRead {
  state: StoredPlaybackState | null;
  revision: number;
  activeSessionIdText: string | null;
}

export type PlaybackStateWriteResult =
  | { kind: 'written'; revision: number }
  | { kind: 'conflict'; revision: number; activeSessionIdText: string | null };

/** Every key of one account shares the prefix `podverse:playback:<account_id>:`. */
const playbackAccountKeys = (accountId: number) => {
  const prefix = `podverse:playback:${accountId}:`;
  return {
    presence: `${prefix}presence`,
    devices: `${prefix}devices`,
    devicesRev: `${prefix}devices_rev`,
    state: `${prefix}state`,
    stateRev: `${prefix}state_rev`,
    active: `${prefix}active`,
  };
};

const playbackCommandKey = (commandIdText: string): string =>
  `podverse:playback:command:${commandIdText}`;

/** Per session, beside the account keys. The generation outlives one stream; the leave key does not. */
const playbackSessionKeys = (accountId: number, sessionIdText: string) => {
  const prefix = `podverse:playback:${accountId}:`;
  return {
    generation: `${prefix}presence_gen:${sessionIdText}`,
    leave: `${prefix}presence_leave:${sessionIdText}`,
  };
};

const unexpectedReply = (source: string): Error =>
  new Error(`Unexpected ${source} reply from the playback store`);

const readReplyArray = (reply: unknown, source: string): unknown[] => {
  if (!Array.isArray(reply)) {
    throw unexpectedReply(source);
  }
  const entries: unknown[] = reply;
  return entries;
};

const readReplyInteger = (value: unknown, source: string): number => {
  let parsed = Number.NaN;
  if (typeof value === 'number') {
    parsed = value;
  } else if (typeof value === 'string' && value !== '') {
    parsed = Number(value);
  }
  if (!Number.isSafeInteger(parsed)) {
    throw unexpectedReply(source);
  }
  return parsed;
};

const readReplyFlag = (value: unknown, source: string): boolean => {
  const flag = readReplyInteger(value, source);
  if (flag !== 0 && flag !== 1) {
    throw unexpectedReply(source);
  }
  return flag === 1;
};

const readReplyString = (value: unknown, source: string): string => {
  if (typeof value !== 'string') {
    throw unexpectedReply(source);
  }
  return value;
};

const readReplyStrings = (values: unknown[], source: string): string[] =>
  values.map((value) => readReplyString(value, source));

const parseJson = (json: string | null | undefined): unknown => {
  if (json === null || json === undefined) {
    return null;
  }
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
};

const toStoredPlaybackDevice = (device: DTOPlaybackDevice): DTOPlaybackDevice => ({
  session_id_text: device.session_id_text,
  client_type: device.client_type,
  device_label: device.device_label,
  session_created_at: device.session_created_at,
});

const toStoredPlaybackState = (state: StoredPlaybackState): StoredPlaybackState => ({
  revision: state.revision,
  active_session_id_text: state.active_session_id_text,
  resource: state.resource,
  status: state.status,
  is_live: state.is_live,
  position_seconds: state.position_seconds,
  duration_seconds: state.duration_seconds,
  rate: state.rate,
  updated_at_ms: state.updated_at_ms,
});

const parseStoredPlaybackState = (json: string | null | undefined): StoredPlaybackState | null => {
  const parsed = parseJson(json);
  if (!isPlainObject(parsed)) {
    return null;
  }
  const candidate: unknown = { ...parsed, sent_at_ms: 0 };
  return isDTOPlaybackState(candidate) ? toStoredPlaybackState(candidate) : null;
};

const isStoredPlaybackCommand = (value: unknown): value is StoredPlaybackCommand =>
  isPlainObject(value) &&
  typeof value.account_id === 'number' &&
  Number.isSafeInteger(value.account_id) &&
  value.account_id > 0 &&
  typeof value.sender_session_id_text === 'string' &&
  value.sender_session_id_text.length > 0 &&
  typeof value.target_session_id_text === 'string' &&
  value.target_session_id_text.length > 0 &&
  typeof value.expires_at_ms === 'number' &&
  Number.isSafeInteger(value.expires_at_ms);

const toStoredPlaybackCommand = (record: StoredPlaybackCommand): StoredPlaybackCommand => ({
  account_id: record.account_id,
  sender_session_id_text: record.sender_session_id_text,
  target_session_id_text: record.target_session_id_text,
  expires_at_ms: record.expires_at_ms,
});

const toExpectedActiveArg = (
  expectedActive: { kind: 'session'; sessionIdText: string } | { kind: 'none' } | { kind: 'any' }
): string => {
  switch (expectedActive.kind) {
    case 'session':
      return expectedActive.sessionIdText;
    case 'none':
      return '';
    case 'any':
      return '*';
  }
};

/**
 * Checks the device in until `nowMs + PLAYBACK_PRESENCE_TTL_MS` and prunes members whose check-in
 * expired. A check-in by the active device also extends the state keys. While the session's leave
 * key is set, the check-in does not extend presence (`extended: false`).
 */
export async function touchPlaybackPresence(params: {
  accountId: number;
  device: DTOPlaybackDevice;
  nowMs: number;
}): Promise<PlaybackPresenceResult> {
  const keys = playbackAccountKeys(params.accountId);
  const sessionKeys = playbackSessionKeys(params.accountId, params.device.session_id_text);
  const reply = await getPlaybackRedis().eval(
    PRESENCE_TOUCH,
    7,
    keys.presence,
    keys.devices,
    keys.devicesRev,
    keys.state,
    keys.stateRev,
    keys.active,
    sessionKeys.leave,
    params.device.session_id_text,
    JSON.stringify(toStoredPlaybackDevice(params.device)),
    params.nowMs + PLAYBACK_PRESENCE_TTL_MS,
    params.nowMs,
    PLAYBACK_PRESENCE_KEY_TTL_MS,
    PLAYBACK_STATE_TTL_MS
  );
  const [extended, changed, revision, ...removed] = readReplyArray(reply, 'PRESENCE_TOUCH');
  return {
    extended: readReplyFlag(extended, 'PRESENCE_TOUCH'),
    devicesChanged: readReplyFlag(changed, 'PRESENCE_TOUCH'),
    devicesRevision: readReplyInteger(revision, 'PRESENCE_TOUCH'),
    removedSessionIdTexts: readReplyStrings(removed, 'PRESENCE_TOUCH'),
  };
}

export async function prunePlaybackPresence(params: {
  accountId: number;
  nowMs: number;
}): Promise<PlaybackPresenceResult> {
  const keys = playbackAccountKeys(params.accountId);
  const reply = await getPlaybackRedis().eval(
    PRESENCE_PRUNE,
    3,
    keys.presence,
    keys.devices,
    keys.devicesRev,
    params.nowMs,
    PLAYBACK_PRESENCE_KEY_TTL_MS
  );
  const [revision, ...removed] = readReplyArray(reply, 'PRESENCE_PRUNE');
  const removedSessionIdTexts = readReplyStrings(removed, 'PRESENCE_PRUNE');
  return {
    devicesChanged: removedSessionIdTexts.length > 0,
    devicesRevision: readReplyInteger(revision, 'PRESENCE_PRUNE'),
    removedSessionIdTexts,
  };
}

/**
 * Lowers the device's expiry to `expiresAtMs`; never raises it and never adds a member.
 * When `presenceGeneration` is the generation from this stream's open, also holds the session
 * so a later check-in does not extend it. A newer stream's generation makes this a no-op.
 */
export async function shortenPlaybackPresence(params: {
  accountId: number;
  sessionIdText: string;
  expiresAtMs: number;
  presenceGeneration: number | null;
}): Promise<void> {
  const keys = playbackAccountKeys(params.accountId);
  const sessionKeys = playbackSessionKeys(params.accountId, params.sessionIdText);
  await getPlaybackRedis().eval(
    PRESENCE_SHORTEN,
    3,
    keys.presence,
    sessionKeys.generation,
    sessionKeys.leave,
    params.sessionIdText,
    params.expiresAtMs,
    params.presenceGeneration === null ? '' : String(params.presenceGeneration),
    PLAYBACK_PRESENCE_TTL_MS
  );
}

/**
 * Records that a stream for this session is open. Returns the generation that stream must pass
 * when it leaves, and clears any leave hold so the session's check-ins extend presence again.
 * `generationTtlMs` has to outlive the stream.
 */
export async function beginPlaybackPresenceSession(params: {
  accountId: number;
  sessionIdText: string;
  generationTtlMs: number;
}): Promise<number> {
  const sessionKeys = playbackSessionKeys(params.accountId, params.sessionIdText);
  const reply: unknown = await getPlaybackRedis().eval(
    PRESENCE_STREAM_BEGIN,
    2,
    sessionKeys.generation,
    sessionKeys.leave,
    params.generationTtlMs
  );
  return readReplyInteger(reply, 'PRESENCE_STREAM_BEGIN');
}

export async function removePlaybackPresence(params: {
  accountId: number;
  sessionIdText: string;
  nowMs: number;
}): Promise<PlaybackPresenceResult> {
  const keys = playbackAccountKeys(params.accountId);
  const reply = await getPlaybackRedis().eval(
    PRESENCE_REMOVE,
    3,
    keys.presence,
    keys.devices,
    keys.devicesRev,
    params.sessionIdText,
    params.nowMs,
    PLAYBACK_PRESENCE_KEY_TTL_MS
  );
  const [removed, revision] = readReplyArray(reply, 'PRESENCE_REMOVE');
  const wasRemoved = readReplyFlag(removed, 'PRESENCE_REMOVE');
  return {
    devicesChanged: wasRemoved,
    devicesRevision: readReplyInteger(revision, 'PRESENCE_REMOVE'),
    removedSessionIdTexts: wasRemoved ? [params.sessionIdText] : [],
  };
}

export async function isPlaybackSessionPresent(params: {
  accountId: number;
  sessionIdText: string;
  nowMs: number;
}): Promise<boolean> {
  const keys = playbackAccountKeys(params.accountId);
  const score: unknown = await getPlaybackRedis().zscore(keys.presence, params.sessionIdText);
  if (score === null) {
    return false;
  }
  return readReplyInteger(score, 'ZSCORE presence') > params.nowMs;
}

/**
 * `GET devices_rev` (0 when missing) and `ZRANGEBYSCORE presence (nowMs +inf`, sent in that
 * order on one connection, then `HMGET devices` for those ids. Reading the revision first means
 * the list is never older than the revision it carries. Skips ids whose JSON fails
 * `isDTOPlaybackDevice`, including one removed between the two reads.
 */
export async function readPlaybackDevices(params: {
  accountId: number;
  nowMs: number;
}): Promise<DTOPlaybackDevices> {
  const keys = playbackAccountKeys(params.accountId);
  const redis = getPlaybackRedis();
  const [revisionReply, sessionIdTexts] = await Promise.all([
    redis.get(keys.devicesRev),
    redis.zrangebyscore(keys.presence, `(${params.nowMs}`, '+inf'),
  ]);
  const revision = revisionReply === null ? 0 : readReplyInteger(revisionReply, 'GET devices_rev');
  if (sessionIdTexts.length === 0) {
    return { revision, devices: [] };
  }

  const deviceJsons = await redis.hmget(keys.devices, ...sessionIdTexts);
  const devices: DTOPlaybackDevice[] = [];
  for (const deviceJson of deviceJsons) {
    const device = parseJson(deviceJson);
    if (isDTOPlaybackDevice(device)) {
      devices.push(toStoredPlaybackDevice(device));
    }
  }
  return { revision, devices };
}

/** One `MGET state state_rev active`. A state whose JSON fails the guard reads as null. */
export async function readPlaybackState(accountId: number): Promise<PlaybackStateRead> {
  const keys = playbackAccountKeys(accountId);
  const [stateJson, revisionReply, activeReply] = await getPlaybackRedis().mget(
    keys.state,
    keys.stateRev,
    keys.active
  );
  return {
    state: parseStoredPlaybackState(stateJson),
    revision:
      revisionReply === null || revisionReply === undefined
        ? 0
        : readReplyInteger(revisionReply, 'MGET state_rev'),
    activeSessionIdText: activeReply ?? null,
  };
}

/** Writes `params.state`; its `revision` is the new revision. */
export async function compareAndSetPlaybackState(params: {
  accountId: number;
  expectedRevision: number;
  expectedActive: { kind: 'session'; sessionIdText: string } | { kind: 'none' } | { kind: 'any' };
  newActiveSessionIdText: string | null;
  state: StoredPlaybackState;
}): Promise<PlaybackStateWriteResult> {
  const keys = playbackAccountKeys(params.accountId);
  const reply = await getPlaybackRedis().eval(
    STATE_COMPARE_AND_SET,
    3,
    keys.state,
    keys.stateRev,
    keys.active,
    params.expectedRevision,
    params.state.revision,
    toExpectedActiveArg(params.expectedActive),
    params.newActiveSessionIdText ?? '',
    JSON.stringify(toStoredPlaybackState(params.state)),
    PLAYBACK_STATE_TTL_MS
  );
  const [written, revision, active] = readReplyArray(reply, 'STATE_COMPARE_AND_SET');
  const revisionNumber = readReplyInteger(revision, 'STATE_COMPARE_AND_SET');
  if (readReplyFlag(written, 'STATE_COMPARE_AND_SET')) {
    return { kind: 'written', revision: revisionNumber };
  }

  const activeSessionIdText = readReplyString(active, 'STATE_COMPARE_AND_SET');
  return {
    kind: 'conflict',
    revision: revisionNumber,
    activeSessionIdText: activeSessionIdText === '' ? null : activeSessionIdText,
  };
}

export async function savePlaybackCommand(
  commandIdText: string,
  record: StoredPlaybackCommand
): Promise<void> {
  await getPlaybackRedis().set(
    playbackCommandKey(commandIdText),
    JSON.stringify(toStoredPlaybackCommand(record)),
    'PX',
    PLAYBACK_COMMAND_RECORD_TTL_MS
  );
}

export async function readPlaybackCommand(
  commandIdText: string
): Promise<StoredPlaybackCommand | null> {
  const parsed = parseJson(await getPlaybackRedis().get(playbackCommandKey(commandIdText)));
  return isStoredPlaybackCommand(parsed) ? toStoredPlaybackCommand(parsed) : null;
}
