# 01 — Connectivity machine and store

**Cursor model:** Opus 5
**Reasoning:** high

Detail doc:
[779-automatic-offline-detection](/docs/proposals/mobile/_master-plan_/phase-2/details/779-automatic-offline-detection.md)
· Decisions: [00-SUMMARY.md](00-SUMMARY.md)

## Scope

Build the derived connectivity state. Nothing consumes it yet — 02 feeds it, 03 and 04 read it. This
step is the floor, and it is the one with real correctness risk.

## Why the machine is pure

Put the state machine in its own module with **no React Native and no Expo imports**, exactly as
[`syncQueue.ts`](/apps/mobile/src/sync/syncQueue.ts) does, so debounce, dwell, and backoff are
unit-testable in node. Timers and NetInfo wiring live in the store module around it.

Pass time in rather than reading the clock inside the machine, so tests drive it deterministically
instead of sleeping.

## Files

### `apps/mobile/src/net/connectivityMachine.ts` (new)

The pure reducer. Suggested shape — adjust names if something reads better, but keep the boundary:

```typescript
export type ConnectivityState = 'device_offline' | 'online' | 'server_unreachable';

export type ConnectivityInput =
  | { at: number; kind: 'net-info'; isConnected: boolean }
  | { at: number; kind: 'probe-result'; didSucceed: boolean }
  | { at: number; kind: 'request-outcome'; outcome: RequestOutcome }
  | { at: number; kind: 'tick' }
  | { at: number; kind: 'user-action' };
```

`RequestOutcome` distinguishes three things, because they are three different pieces of evidence:
a request that **succeeded**, one that **never reached the server**, and one the **server answered
with 502 / 503 / 504**. The first exits offline, the second argues for `device_offline`, the third
for `server_unreachable`.

The reducer returns the next state plus what the caller should schedule — a probe delay, or nothing.
Do not let the machine own timers.

Rules it must encode:

- **Entry debounce.** A single offline-classified failure or one NetInfo disconnect does not change
  the public state. Require the condition to persist for the debounce window, or N consecutive
  offline-classified failures. Pick concrete values, name them as exported constants, and comment
  what the number is protecting against.
- **Success-only exit.** Only a successful request or a successful probe returns `online`. A NetInfo
  `isConnected: true` event never exits on its own — it schedules a probe.
- **Exponential backoff with a cap** on probe scheduling, reset on success.
- **Minimum dwell time** in each state so the banner cannot flicker.
- **`user-action` probes immediately**, bypassing backoff, and resets the backoff step.

`device_offline` vs `server_unreachable` is decided by the most recent evidence: NetInfo saying
disconnected means the device; NetInfo connected plus failing requests means the server. When both
could apply, prefer `device_offline` — it is the one the user can act on.

### `apps/mobile/src/net/connectivity.ts` (new)

The live store. Mirror the shape of
[`prefs/offlineMode.ts`](/apps/mobile/src/prefs/offlineMode.ts) so consumers find it familiar:
in-memory mirror, `Set` of listeners, a subscribe function, and a `use*` hook.

Exports:

- `getConnectivity(): ConnectivityState` — sync read for non-React callers.
- `reportNetworkOutcome(outcome: RequestOutcome): void` — the sensor entry point 02 calls.
- `reportUserNetworkAction(): void` — called when a user deliberately asks for network work.
- `subscribeConnectivity(listener)` / `useConnectivity()`.
- `isEffectivelyOffline(): boolean` — `isOfflineModeEnabled() || getConnectivity() !== 'online'`.
  04 consumes this from non-React code.

This module owns the **NetInfo subscription** (moved here from `SyncProvider` in 02) and the timers
the machine asks for. Treat `isInternetReachable === null` as connected, matching the comment
already in `SyncProvider`: a slow probe must not hold the app back on a working network.

### `apps/mobile/src/net/connectivityProbe.ts` (new)

`GET /api/v2/health` built from `getMobileConfig().api`, unauthenticated, short timeout (well under
the sync queue's 20s job budget — a probe that outlives a backoff step is useless). Returns a plain
boolean. Do not route it through `authRequestWithRefresh`; the probe must never trigger a token
refresh, and it must run while auth is in any state.

Do not read `process.env` here — `getMobileConfig()` is the env boundary
([`mobile-react-native`](/.cursor/rules/mobile-react-native.mdc)).

### `apps/mobile/src/net/connectivityMachine.test.ts` (new)

The load-bearing tests. Cover at minimum:

- A blip shorter than the debounce never changes the public state.
- The debounce elapsing does change it.
- `net-info` connected alone does **not** return `online`.
- A successful probe does return `online`.
- A successful request outcome returns `online` without a probe.
- Backoff grows across consecutive probe failures and stops at the cap.
- `user-action` schedules a probe immediately regardless of backoff position.
- Dwell time prevents an immediate re-transition.
- 502 / 503 / 504 with NetInfo connected yields `server_unreachable`, not `device_offline`.
- NetInfo disconnected yields `device_offline` even while requests are also failing.

## Do not

- Do not import NetInfo, Expo, or anything React in `connectivityMachine.ts`.
- Do not read `Date.now()` inside the machine.
- Do not write connectivity to AsyncStorage or the account. It is ephemeral by design.
- Do not touch `offline.mode`, the More switch, or any screen in this step.
- Do not add a package. NetInfo is already installed.

## Verification

Operator commands only; do not run them.

```bash
npm run build:packages
npm --prefix apps/mobile run test
```
