/**
 * The rules that decide whether the app is usable on the network, kept pure.
 *
 * This module is deliberately free of React Native and Expo imports, and it never reads the clock —
 * callers pass `at` and re-enter with `tick`. The semantics that are easy to get wrong here
 * (debounce, dwell, backoff, and a probe result racing a newer reachability event) are therefore
 * unit-testable in node. Timers, NetInfo, and the probe itself live in `connectivity.ts`.
 *
 * Distinct from the user's Offline Mode pref: this is what the network is doing, not what the user
 * asked for. Effective offline is the OR of the two and lives in `connectivity.ts`.
 */

export type ConnectivityState = 'device_offline' | 'online' | 'server_unreachable';

/**
 * What a finished request proved. Named for the evidence rather than the HTTP status, because a
 * 401 or a 404 proves the network works just as well as a 200 does.
 */
export type RequestOutcome =
  /** The request produced no response at all — transport failure. */
  | 'no_response'
  /** The server answered. Any status except the gateway trio below. */
  | 'reached_server'
  /** 502 / 503 / 504: something answered, but the app behind it is not serving. */
  | 'server_error';

export type ConnectivityInput =
  | { at: number; didSucceed: boolean; kind: 'probe-result' }
  | { at: number; isConnected: boolean; kind: 'net-info' }
  | { at: number; kind: 'request-outcome'; outcome: RequestOutcome }
  | { at: number; kind: 'tick' }
  | { at: number; kind: 'user-action' };

/**
 * What the caller should have running after this transition. Both fields are absolute
 * instructions, not deltas: re-arm each timer to the value given, and cancel it when null.
 */
export type ConnectivityEffects = {
  /** Run a health probe after this delay. */
  probeInMs: number | null;
  /** Re-enter the reducer with a `tick` after this delay, so a pending change can mature. */
  tickInMs: number | null;
};

/**
 * How long an offline condition must persist before the user is told.
 *
 * Three seconds swallows an elevator, a tunnel, and a single slow request without putting anything
 * on screen. Below about a second the strip would flicker on ordinary mobile jitter; much above
 * five and it starts arriving after the screen underneath has already given up, which reads as the
 * app contradicting itself.
 */
export const OFFLINE_ENTRY_DEBOUNCE_MS = 3000;

/**
 * Consecutive failures that skip the debounce.
 *
 * Three independent requests failing back to back is confident evidence, so waiting out the rest of
 * the window only delays an explanation the user has already earned. One or two failures are
 * routinely a single flaky socket or one unhappy endpoint, which is why the threshold is not lower.
 */
export const OFFLINE_ENTRY_FAILURE_THRESHOLD = 3;

/**
 * Floor on how often the reported state may change.
 *
 * A strip that changes at most once every ten seconds reads as informative; one that changes every
 * second reads as broken, and on a dying signal the underlying evidence really does alternate that
 * fast. Proof that the network works is exempt — see `toOnline`.
 */
export const MIN_STATE_DWELL_MS = 10000;

/** First retry delay after entering an offline state, doubling from here. */
export const PROBE_BASE_DELAY_MS = 2000;

/**
 * Ceiling on the retry ladder: 2s, 4s, 8s, 16s, 32s, then 60s from there on.
 *
 * A minute is about the longest an app in the foreground should take to notice that service came
 * back on its own. It is also the worst case rather than the normal one, because a returning
 * interface and any deliberate user action both probe immediately.
 */
export const PROBE_MAX_DELAY_MS = 60000;

export type ConnectivityMachine = {
  /** Failed requests and probes since the last proof the network works. */
  consecutiveFailures: number;
  /** Last reading from the platform. Null until the first event arrives. */
  isNetInfoConnected: boolean | null;
  /** The state waiting out debounce or dwell, or null when nothing is pending. */
  pendingState: ConnectivityState | null;
  /** When `pendingState` was first observed. */
  pendingSince: number | null;
  /** Index into the backoff ladder. */
  probeStep: number;
  /** What the rest of the app reads. */
  state: ConnectivityState;
  /** When `state` last changed, for the dwell floor. */
  stateChangedAt: number;
};

export type ConnectivityTransition = {
  effects: ConnectivityEffects;
  machine: ConnectivityMachine;
};

const NO_EFFECTS: ConnectivityEffects = { probeInMs: null, tickInMs: null };

/**
 * Start optimistic. A cold launch has no evidence either way, and the first real request is a
 * faster and more honest test than refusing to try — the app should not open wearing an offline
 * strip it has not earned.
 *
 * `stateChangedAt` is negative infinity rather than the launch time so the dwell floor does not
 * apply to the first transition. Dwell exists to stop the strip flickering between readings; at
 * launch there is no earlier reading to flicker against, and charging the app ten seconds of
 * silence for that would leave a genuinely offline user without an explanation.
 */
export const createConnectivityMachine = (): ConnectivityMachine => ({
  consecutiveFailures: 0,
  isNetInfoConnected: null,
  pendingState: null,
  pendingSince: null,
  probeStep: 0,
  state: 'online',
  stateChangedAt: Number.NEGATIVE_INFINITY,
});

export const probeDelayForStep = (step: number): number =>
  Math.min(PROBE_BASE_DELAY_MS * 2 ** step, PROBE_MAX_DELAY_MS);

/** While offline, keep a probe on the ladder so recovery never depends on the user doing anything. */
const offlineEffects = (
  machine: ConnectivityMachine,
  tickInMs: number | null = null
): ConnectivityEffects => ({
  probeInMs: probeDelayForStep(machine.probeStep),
  tickInMs,
});

/**
 * Which offline flavor the current evidence supports.
 *
 * A platform that reports no connection wins, because that is the reading the user can act on and
 * the one they can confirm by glancing at the status bar. Everything else is attributed to the
 * server: with a working interface, the thing we demonstrably cannot reach is the far end. That
 * misreads a captive portal as a server problem, which is not distinguishable from the client and
 * is an imprecise explanation rather than a wrong one.
 *
 * `hasReachedNetwork` outranks the platform reading, since a gateway had to answer for us to know
 * about it. That is first-hand proof against a reading that has gone stale.
 */
const offlineStateForEvidence = (
  isNetInfoConnected: boolean | null,
  hasReachedNetwork: boolean
): ConnectivityState =>
  isNetInfoConnected === false && !hasReachedNetwork ? 'device_offline' : 'server_unreachable';

const withState = (
  machine: ConnectivityMachine,
  state: ConnectivityState,
  at: number
): ConnectivityMachine => ({
  ...machine,
  pendingState: null,
  pendingSince: null,
  state,
  stateChangedAt: at,
});

/**
 * Proof the network works. This is the only path back to `online`, and it ignores the dwell floor:
 * leaving a working app in an offline state is a much worse failure than changing the strip early,
 * and a successful response is not the kind of evidence worth sitting on.
 */
const toOnline = (machine: ConnectivityMachine, at: number): ConnectivityTransition => {
  const cleared = { consecutiveFailures: 0, probeStep: 0 };

  if (machine.state === 'online' && machine.pendingState === null) {
    return { effects: NO_EFFECTS, machine: { ...machine, ...cleared } };
  }

  return {
    effects: NO_EFFECTS,
    machine: { ...withState(machine, 'online', at), ...cleared },
  };
};

/**
 * Register evidence that the network is not working, and decide whether the user hears about it.
 *
 * `hasReachedNetwork` is set when the failure itself proves the interface is up — a gateway error
 * came from somewhere, so it can only mean the server. It is kept out of `isNetInfoConnected` so
 * the platform's reading stays the platform's.
 *
 * Entry is gated two ways and either is enough: the condition has persisted for the debounce
 * window, or enough separate requests have failed that waiting is only latency.
 */
const toOffline = (
  machine: ConnectivityMachine,
  at: number,
  hasReachedNetwork = false
): ConnectivityTransition => {
  const candidate = offlineStateForEvidence(machine.isNetInfoConnected, hasReachedNetwork);
  const sinceStateChange = at - machine.stateChangedAt;

  if (machine.state !== 'online') {
    if (candidate === machine.state) {
      return {
        effects: offlineEffects(machine),
        machine: { ...machine, pendingState: null, pendingSince: null },
      };
    }

    // Swapping flavor only rewrites the strip's copy, so it waits out the dwell floor in full.
    if (sinceStateChange < MIN_STATE_DWELL_MS) {
      return {
        effects: offlineEffects(machine, MIN_STATE_DWELL_MS - sinceStateChange),
        machine: {
          ...machine,
          pendingState: candidate,
          pendingSince: machine.pendingSince ?? at,
        },
      };
    }

    const next = withState(machine, candidate, at);
    return { effects: offlineEffects(next), machine: next };
  }

  const pendingSince = machine.pendingSince ?? at;
  const hasWaitedOutDebounce = at - pendingSince >= OFFLINE_ENTRY_DEBOUNCE_MS;
  const hasEnoughFailures = machine.consecutiveFailures >= OFFLINE_ENTRY_FAILURE_THRESHOLD;
  const isReadyToShow = hasWaitedOutDebounce || hasEnoughFailures;

  // Re-entering offline right after leaving it still respects the floor, so a connection that comes
  // and goes cannot drive the strip faster than a person can read it.
  const remainingDwell = Math.max(MIN_STATE_DWELL_MS - sinceStateChange, 0);

  if (!isReadyToShow || remainingDwell > 0) {
    const remainingDebounce = Math.max(OFFLINE_ENTRY_DEBOUNCE_MS - (at - pendingSince), 0);
    return {
      effects: {
        probeInMs: null,
        // Nothing may arrive on its own to mature this, so ask to be woken when the wait is over.
        tickInMs: Math.max(isReadyToShow ? remainingDwell : remainingDebounce, remainingDwell),
      },
      machine: { ...machine, pendingState: candidate, pendingSince },
    };
  }

  const next = withState(machine, candidate, at);
  return { effects: offlineEffects(next), machine: next };
};

/**
 * Fold one input into the machine.
 *
 * Returns the next machine plus the timers the caller should be running. The caller must apply
 * `effects` verbatim — a stale probe timer left armed is how a recovered app keeps polling, and a
 * dropped tick is how a pending change never matures.
 */
export const reduceConnectivity = (
  machine: ConnectivityMachine,
  input: ConnectivityInput
): ConnectivityTransition => {
  switch (input.kind) {
    case 'net-info': {
      const withReading: ConnectivityMachine = {
        ...machine,
        isNetInfoConnected: input.isConnected,
      };

      if (!input.isConnected) {
        return toOffline(withReading, input.at);
      }

      /**
       * An interface coming up is a hint, never a verdict. NetInfo reports a captive portal and a
       * dying signal as connected, so exiting on this alone is how the app claims to be back while
       * every request still fails. Probe instead, and let the result decide.
       */
      if (withReading.state === 'online') {
        if (withReading.pendingState === null) {
          return { effects: NO_EFFECTS, machine: withReading };
        }

        /**
         * A pending `device_offline` was the platform's claim, and the platform has withdrawn it —
         * a blip that resolves inside the debounce window must leave no trace, or every elevator
         * ride posts a banner three seconds after the doors open. Nothing was ever shown, so
         * dropping it is not an exit from an offline state.
         *
         * A pending `server_unreachable` stays: real requests were failing, and an interface
         * coming back says nothing about the far end.
         */
        if (withReading.pendingState === 'device_offline') {
          return {
            effects: { probeInMs: 0, tickInMs: null },
            machine: { ...withReading, pendingState: null, pendingSince: null },
          };
        }

        return {
          effects: {
            probeInMs: 0,
            tickInMs: Math.max(
              OFFLINE_ENTRY_DEBOUNCE_MS - (input.at - (withReading.pendingSince ?? input.at)),
              0
            ),
          },
          machine: withReading,
        };
      }

      return {
        effects: { probeInMs: 0, tickInMs: null },
        machine: { ...withReading, probeStep: 0 },
      };
    }

    case 'probe-result': {
      if (input.didSucceed) {
        return toOnline(machine, input.at);
      }
      return toOffline(
        {
          ...machine,
          consecutiveFailures: machine.consecutiveFailures + 1,
          probeStep: machine.probeStep + 1,
        },
        input.at
      );
    }

    case 'request-outcome': {
      if (input.outcome === 'reached_server') {
        return toOnline(machine, input.at);
      }
      return toOffline(
        { ...machine, consecutiveFailures: machine.consecutiveFailures + 1 },
        input.at,
        input.outcome === 'server_error'
      );
    }

    case 'tick': {
      if (machine.pendingState === null) {
        return {
          effects: machine.state === 'online' ? NO_EFFECTS : offlineEffects(machine),
          machine,
        };
      }
      return toOffline(machine, input.at, machine.pendingState === 'server_unreachable');
    }

    case 'user-action': {
      /**
       * Somebody asked for network work on purpose. Probe now rather than making them wait out a
       * ladder that may have climbed to a minute, and start the ladder over so a deliberate action
       * is never punished by earlier failures.
       */
      if (machine.state === 'online') {
        return { effects: NO_EFFECTS, machine };
      }
      return {
        effects: { probeInMs: 0, tickInMs: null },
        machine: { ...machine, probeStep: 0 },
      };
    }
  }
};
