# 02 — Sensors and sync wiring

**Cursor model:** Codex 5.3
**Reasoning:** high

Detail doc:
[779-automatic-offline-detection](/docs/proposals/mobile/_master-plan_/phase-2/details/779-automatic-offline-detection.md)
· Decisions: [00-SUMMARY.md](00-SUMMARY.md) · Depends on: [01](01-connectivity-machine-and-store.md)

## Scope

Feed the machine real inputs and let it drive the sync queue. After this step the connectivity
states are genuinely reachable and observable; before it, nothing produces them.

## Files

### `apps/mobile/src/sync/syncErrorClassification.ts`

Today every HTTP status classifies as reached-the-server:

```61:76:apps/mobile/src/sync/syncErrorClassification.ts
  const status = getErrorResponseStatus(error);
  if (status !== undefined) {
    const bodyCode = getErrorResponseBodyCode(error);
    const code = bodyCode === undefined ? `http_${status}` : `http_${status}:${bodyCode}`;
    return { code, isOffline: false };
  }
```

That is why a **server outage** makes the serial queue walk every remaining job into the same wall
instead of parking. Split `502`, `503`, and `504` out: they are a real HTTP answer, so keep the
existing `http_<status>` code for the event log, but mark them as a reason to park the run and as
evidence of `server_unreachable`.

Add a third field rather than overloading `isOffline`, so the two consumers stay honest — the queue
wants "should I park", the machine wants "device or server". Something like
`{ code, isOffline, isServerUnreachable }`, with `isOffline` keeping its current meaning of "the
request never reached the server".

Keep `502` / `503` / `504` out of `OFFLINE_ERROR_CODES` — that set is for axios transport codes, not
HTTP statuses.

Update `syncErrorClassification.test.ts` for the new field and the three statuses. Leave the
`SyncJobTimeoutError`, `OfflineModeEnabledError`, and existing transport-code cases alone.

### `apps/mobile/src/sync/syncQueue.ts`

`reportFailure` parks on `isOffline`. Park on `isServerUnreachable` too — a down server is exactly
the case where continuing the run is pointless.

Leave everything else alone. In particular keep the existing behavior where a `priority: 'user'` job
arriving while parked clears the park and drains, and have that path also call
`reportUserNetworkAction()` so the machine probes immediately rather than waiting for a backoff tick.

### `apps/mobile/src/auth/authRequestWithRefresh.ts`

This is the main sensor. Report **every** outcome to `reportNetworkOutcome()`: success, transport
failure, and HTTP answer. Use `classifySyncError` so one function decides what an error means and the
machine and the event log cannot drift
([`reuse-beyond-components`](/.cursor/rules/reuse-beyond-components.mdc)).

The pref gate at the top of the function is **unchanged**:

```72:74:apps/mobile/src/auth/authRequestWithRefresh.ts
  if (isOfflineModeEnabled()) {
    throw new OfflineModeEnabledError();
  }
```

Do **not** add an `isEffectivelyOffline()` gate here. Auto-offline must keep attempting requests —
an attempt is the only reliable way to learn we are back. A thrown `OfflineModeEnabledError` is not
a network outcome and must not be reported to the machine.

### `apps/mobile/src/sync/SyncProvider.tsx`

Remove the local NetInfo subscription and the `netReachable` / `hasNetInfo` locals from the
reachability effect (currently lines ~151–198). The subscription now lives in
`net/connectivity.ts`.

Rewrite that effect to subscribe to **connectivity plus the offline pref** and call
`syncQueue.setNetworkReachable(isSyncNetworkUsable(connectivity === 'online', offlineModeEnabled))`.
Keep `isSyncNetworkUsable` — it already expresses exactly this AND and is unit-tested.

Keep the existing `connectivity-restored` trigger, now fired when the derived state returns to
`online` rather than on a raw NetInfo event. Keep the "park immediately if Offline Mode was left on
from a previous session" behavior.

Leave the `AppState` foreground listener as it is; it already requests a sync on foreground, which
doubles as a free reconnect probe trigger.

## Ownership

Files this step owns: the four above plus `syncErrorClassification.test.ts`.

Do not touch: the banner, `prefs/offlineMode.ts`, the i18n catalog, `downloadManager.ts`, or
`playbackOutboxRepository.ts`. Those belong to 03 and 04.

## Do not

- Do not gate request helpers on effective offline. Pref-only, as above.
- Do not change `DEFAULT_SYNC_JOB_TIMEOUT_MS` or the queue's serialization, dedupe, or growing-total
  semantics.
- Do not report `OfflineModeEnabledError` as a network outcome.
- Do not add retry logic to `authRequestWithRefresh`. Backoff belongs to the machine.

## Verification

Operator commands only; do not run them.

```bash
npm run build:packages
npm --prefix apps/mobile run test
```
