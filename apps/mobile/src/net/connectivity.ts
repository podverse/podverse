import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

import { isOfflineModeEnabled } from '../prefs/offlineMode';
import type {
  ConnectivityEffects,
  ConnectivityInput,
  ConnectivityState,
  RequestOutcome,
} from './connectivityMachine';
import { createConnectivityMachine, reduceConnectivity } from './connectivityMachine';
import { probeServerReachable } from './connectivityProbe';

/**
 * Live connectivity state: the platform subscription, the timers, and the probe loop wrapped
 * around the pure machine in `connectivityMachine.ts`.
 *
 * Shaped like `prefs/offlineMode.ts` — in-memory mirror, listener set, subscribe function, hook —
 * so consumers reach for the same pattern. Unlike that module, nothing here is persisted:
 * connectivity is a reading of the moment, and a stale one restored at launch would be worse than
 * no reading at all.
 */

export type { ConnectivityState, RequestOutcome } from './connectivityMachine';

type Listener = (state: ConnectivityState) => void;

const listeners = new Set<Listener>();

let machine = createConnectivityMachine();
let probeTimer: ReturnType<typeof setTimeout> | null = null;
let tickTimer: ReturnType<typeof setTimeout> | null = null;
let isProbeInFlight = false;
let unsubscribeNetInfo: (() => void) | null = null;

const notify = (state: ConnectivityState): void => {
  for (const listener of listeners) {
    listener(state);
  }
};

const clearProbeTimer = (): void => {
  if (probeTimer !== null) {
    clearTimeout(probeTimer);
    probeTimer = null;
  }
};

const clearTickTimer = (): void => {
  if (tickTimer !== null) {
    clearTimeout(tickTimer);
    tickTimer = null;
  }
};

const runProbe = (): void => {
  // One probe at a time. Overlapping probes would report stale results out of order and inflate
  // the failure count on a single bad network moment.
  if (isProbeInFlight) {
    return;
  }
  isProbeInFlight = true;
  void probeServerReachable()
    .then((didSucceed) => {
      isProbeInFlight = false;
      dispatch({ at: Date.now(), didSucceed, kind: 'probe-result' });
    })
    .catch(() => {
      isProbeInFlight = false;
      dispatch({ at: Date.now(), didSucceed: false, kind: 'probe-result' });
    });
};

/** Timers are re-armed from scratch on every transition, because the machine returns absolutes. */
const applyEffects = (effects: ConnectivityEffects): void => {
  clearProbeTimer();
  clearTickTimer();

  if (effects.probeInMs !== null) {
    probeTimer = setTimeout(runProbe, effects.probeInMs);
  }
  if (effects.tickInMs !== null) {
    tickTimer = setTimeout(() => {
      dispatch({ at: Date.now(), kind: 'tick' });
    }, effects.tickInMs);
  }
};

const dispatch = (input: ConnectivityInput): void => {
  const previousState = machine.state;
  const { effects, machine: next } = reduceConnectivity(machine, input);
  machine = next;
  applyEffects(effects);

  if (next.state !== previousState) {
    notify(next.state);
  }
};

/**
 * Begin watching the platform. Idempotent, and safe to call from app boot or from the first
 * subscriber.
 */
export const startConnectivityMonitoring = (): void => {
  if (unsubscribeNetInfo !== null) {
    return;
  }

  unsubscribeNetInfo = NetInfo.addEventListener((netState) => {
    /**
     * `isInternetReachable` is null while the platform is still deciding. Treat that as connected:
     * a probe that has not finished must not hold back an app on a working network, and the
     * machine only trusts a real request or probe to declare the network usable anyway.
     */
    const isConnected = netState.isConnected === true && netState.isInternetReachable !== false;
    dispatch({ at: Date.now(), isConnected, kind: 'net-info' });
  });
};

/** Sync read for non-React callers. */
export const getConnectivity = (): ConnectivityState => machine.state;

/**
 * Feed a finished request back in. Every request the app makes is a free reachability test, which
 * is why the sensors report outcomes instead of the store polling on its own.
 */
export const reportNetworkOutcome = (outcome: RequestOutcome): void => {
  dispatch({ at: Date.now(), kind: 'request-outcome', outcome });
};

/** A deliberate ask for network work — pull to refresh, retry, a tapped download. Probes now. */
export const reportUserNetworkAction = (): void => {
  dispatch({ at: Date.now(), kind: 'user-action' });
};

export const subscribeConnectivity = (listener: Listener): (() => void) => {
  startConnectivityMonitoring();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/**
 * The single question most callers want answered: should this avoid the network right now,
 * whether because the user asked for that or because the network is not working.
 *
 * Not a substitute for `isOfflineModeEnabled()` at the hard gates. Refusing to stream a remote
 * episode is the user's choice to make; a weak signal is not a reason to deny a tap that might
 * still work.
 */
export const isEffectivelyOffline = (): boolean =>
  isOfflineModeEnabled() || machine.state !== 'online';

/** React subscription to the derived connectivity state. */
export const useConnectivity = (): ConnectivityState => {
  const [state, setState] = useState(machine.state);

  useEffect(() => {
    setState(machine.state);
    return subscribeConnectivity(setState);
  }, []);

  return state;
};

/** Test seam: drop all platform wiring and start over from a known state. */
export const resetConnectivityForTests = (): void => {
  unsubscribeNetInfo?.();
  unsubscribeNetInfo = null;
  clearProbeTimer();
  clearTickTimer();
  isProbeInFlight = false;
  listeners.clear();
  machine = createConnectivityMachine();
};
