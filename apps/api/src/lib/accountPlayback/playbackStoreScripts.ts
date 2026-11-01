/**
 * Lua scripts for the playback store, run with `connection.eval(script, numKeys, ...keysAndArgs)`.
 * Each read-modify-write is one script, so several API pods writing at once cannot interleave.
 * Every script touches only keys named in `KEYS`.
 *
 * Revisions never go backwards: a bump sets `max(previous + 1, nowMs)`, so after a key expires
 * its next revision is the current time, above anything a client saw before. Numbers are
 * written and returned with `string.format('%d', n)` so a large Lua number is never written in
 * exponent form.
 */

const READ_REVISION_LUA = `
local function readRevision(key)
  return tonumber(redis.call('GET', key)) or 0
end
`;

const BUMP_REVISION_LUA = `
local function bumpRevision(key, nowMs, ttlMs)
  local nextRevision = math.max(readRevision(key) + 1, nowMs)
  redis.call('SET', key, string.format('%d', nextRevision), 'PX', ttlMs)
  return nextRevision
end
`;

/** Removes members whose expiry is at or before `nowMs` and their device entries. */
const PRUNE_LUA = `
local function prune(presenceKey, devicesKey, nowMs)
  local removed = redis.call('ZRANGEBYSCORE', presenceKey, '-inf', nowMs)
  if #removed > 0 then
    redis.call('ZREMRANGEBYSCORE', presenceKey, '-inf', nowMs)
    redis.call('HDEL', devicesKey, unpack(removed))
  end
  return removed
end
`;

const APPEND_LUA = `
local function append(reply, values)
  for _, value in ipairs(values) do
    reply[#reply + 1] = value
  end
  return reply
end
`;

/**
 * Keys: presence, devices, devices_rev, state, state_rev, active, leave.
 * Args: sessionId, deviceJson, expiresAtMs, nowMs, presenceKeyTtlMs, stateTtlMs.
 * Reply: `[extended (0|1), changed (0|1), revision, ...removedSessionIds]`.
 *
 * The caller's member is written before the prune, so its new future score keeps it out of the
 * prune even when its old score had already passed. `extended` is 0 when the session's leave key
 * is set: the check-in does not refresh that member or the state keys. A stream that opens later
 * deletes the key.
 */
export const PRESENCE_TOUCH = `
${READ_REVISION_LUA}
${BUMP_REVISION_LUA}
${PRUNE_LUA}
${APPEND_LUA}
local presenceKey = KEYS[1]
local devicesKey = KEYS[2]
local devicesRevKey = KEYS[3]
local stateKey = KEYS[4]
local stateRevKey = KEYS[5]
local activeKey = KEYS[6]
local leaveKey = KEYS[7]
local sessionId = ARGV[1]
local presenceKeyTtlMs = ARGV[5]
local stateTtlMs = ARGV[6]

if redis.call('EXISTS', leaveKey) == 1 then
  local removed = prune(presenceKey, devicesKey, ARGV[4])
  local changed = 0
  local revision
  if #removed > 0 then
    changed = 1
    revision = bumpRevision(devicesRevKey, tonumber(ARGV[4]), presenceKeyTtlMs)
  else
    revision = readRevision(devicesRevKey)
  end
  return append({ 0, changed, string.format('%d', revision) }, removed)
end

local added = redis.call('ZADD', presenceKey, ARGV[3], sessionId)
redis.call('HSET', devicesKey, sessionId, ARGV[2])
local removed = prune(presenceKey, devicesKey, ARGV[4])

local changed = 0
local revision
if added == 1 or #removed > 0 then
  changed = 1
  revision = bumpRevision(devicesRevKey, tonumber(ARGV[4]), presenceKeyTtlMs)
else
  revision = readRevision(devicesRevKey)
end

redis.call('PEXPIRE', presenceKey, presenceKeyTtlMs)
redis.call('PEXPIRE', devicesKey, presenceKeyTtlMs)
redis.call('PEXPIRE', devicesRevKey, presenceKeyTtlMs)

if redis.call('GET', activeKey) == sessionId then
  redis.call('PEXPIRE', stateKey, stateTtlMs)
  redis.call('PEXPIRE', stateRevKey, stateTtlMs)
  redis.call('PEXPIRE', activeKey, stateTtlMs)
end

return append({ 1, changed, string.format('%d', revision) }, removed)
`;

/**
 * Keys: presence, devices, devices_rev.
 * Args: nowMs, presenceKeyTtlMs.
 * Reply: `[revision, ...removedSessionIds]`.
 */
export const PRESENCE_PRUNE = `
${READ_REVISION_LUA}
${BUMP_REVISION_LUA}
${PRUNE_LUA}
${APPEND_LUA}
local removed = prune(KEYS[1], KEYS[2], ARGV[1])
local revision
if #removed > 0 then
  revision = bumpRevision(KEYS[3], tonumber(ARGV[1]), ARGV[2])
else
  revision = readRevision(KEYS[3])
end

return append({ string.format('%d', revision) }, removed)
`;

/**
 * Keys: presence, generation, leave.
 * Args: sessionId, expiresAtMs, expectedGeneration, leaveTtlMs.
 *
 * Only lowers an existing score, so a check-in that already arrived is not cut short, and never
 * adds a member. `expectedGeneration` of `''` does only that. A generation that is no longer the
 * session's current one does nothing, so a stream that opened later keeps its check-in. A matching
 * generation also sets the leave key for `leaveTtlMs`; a check-in does not extend presence while
 * that key exists. The revision does not change; the next prune removes the member.
 */
export const PRESENCE_SHORTEN = `
local expectedGen = ARGV[3]
if expectedGen ~= '' then
  local gen = redis.call('GET', KEYS[2])
  if gen ~= expectedGen then
    return 0
  end
  redis.call('SET', KEYS[3], '1', 'PX', ARGV[4])
end
return redis.call('ZADD', KEYS[1], 'XX', 'LT', ARGV[2], ARGV[1])
`;

/**
 * Keys: generation, leave.
 * Args: generationTtlMs.
 * Reply: the session's new generation.
 *
 * Opening a stream bumps the generation and clears the leave key, so this connection's check-ins
 * can extend presence and a leave from an older stream does not hold them.
 */
export const PRESENCE_STREAM_BEGIN = `
local gen = redis.call('INCR', KEYS[1])
redis.call('PEXPIRE', KEYS[1], ARGV[1])
redis.call('DEL', KEYS[2])
return gen
`;

/**
 * Keys: presence, devices, devices_rev.
 * Args: sessionId, nowMs, presenceKeyTtlMs.
 * Reply: `[removed (0|1), revision]`.
 */
export const PRESENCE_REMOVE = `
${READ_REVISION_LUA}
${BUMP_REVISION_LUA}
local removed = redis.call('ZREM', KEYS[1], ARGV[1])
local revision
if removed == 1 then
  redis.call('HDEL', KEYS[2], ARGV[1])
  revision = bumpRevision(KEYS[3], tonumber(ARGV[2]), ARGV[3])
else
  revision = readRevision(KEYS[3])
end

return { removed, string.format('%d', revision) }
`;

/**
 * Keys: state, state_rev, active.
 * Args: expectedRev, newRev, expectedActive, newActive, stateJson, stateTtlMs.
 * Reply: `[1, newRev]` when written, `[0, currentRev, currentActive]` on conflict.
 *
 * `expectedActive` is a session id, `''` for no active device, or `'*'` for any. `newActive` of
 * `''` clears the active slot. The state JSON is opaque here: the API builds it with `newRev` as
 * its `revision`, and this keeps `state_rev` equal to it.
 */
export const STATE_COMPARE_AND_SET = `
${READ_REVISION_LUA}
local stateKey = KEYS[1]
local stateRevKey = KEYS[2]
local activeKey = KEYS[3]
local expectedActive = ARGV[3]
local newActive = ARGV[4]
local stateTtlMs = ARGV[6]

local currentRev = readRevision(stateRevKey)
local currentActive = redis.call('GET', activeKey)
if not currentActive then
  currentActive = ''
end

if currentRev ~= tonumber(ARGV[1]) or (expectedActive ~= '*' and expectedActive ~= currentActive) then
  return { 0, string.format('%d', currentRev), currentActive }
end

redis.call('SET', stateKey, ARGV[5], 'PX', stateTtlMs)
redis.call('SET', stateRevKey, ARGV[2], 'PX', stateTtlMs)
if newActive == '' then
  redis.call('DEL', activeKey)
else
  redis.call('SET', activeKey, newActive, 'PX', stateTtlMs)
end

return { 1, ARGV[2] }
`;
