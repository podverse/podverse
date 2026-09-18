import { describe, expect, it } from 'vitest';

import type {
  ConnectivityInput,
  ConnectivityMachine,
  ConnectivityTransition,
} from './connectivityMachine';
import {
  MIN_STATE_DWELL_MS,
  OFFLINE_ENTRY_DEBOUNCE_MS,
  OFFLINE_ENTRY_FAILURE_THRESHOLD,
  PROBE_BASE_DELAY_MS,
  PROBE_MAX_DELAY_MS,
  createConnectivityMachine,
  probeDelayForStep,
  reduceConnectivity,
} from './connectivityMachine';

/** Fold a script of inputs, so a test reads as the sequence of events it is describing. */
const run = (inputs: ConnectivityInput[], from?: ConnectivityMachine): ConnectivityTransition => {
  let machine = from ?? createConnectivityMachine();
  let effects: ConnectivityTransition['effects'] = { probeInMs: null, tickInMs: null };
  for (const input of inputs) {
    ({ effects, machine } = reduceConnectivity(machine, input));
  }
  return { effects, machine };
};

const netInfo = (at: number, isConnected: boolean): ConnectivityInput => ({
  at,
  isConnected,
  kind: 'net-info',
});

const failedRequest = (at: number): ConnectivityInput => ({
  at,
  kind: 'request-outcome',
  outcome: 'no_response',
});

const gatewayError = (at: number): ConnectivityInput => ({
  at,
  kind: 'request-outcome',
  outcome: 'server_error',
});

/** Drive a machine all the way into `device_offline` and hand back the state at that moment. */
const enterDeviceOffline = (startAt = 0): ConnectivityMachine =>
  run([netInfo(startAt, false), { at: startAt + OFFLINE_ENTRY_DEBOUNCE_MS, kind: 'tick' }]).machine;

describe('entry debounce', () => {
  it('stays online through a disconnect shorter than the debounce window', () => {
    const { machine } = run([netInfo(1000, false), netInfo(1500, true)]);
    expect(machine.state).toBe('online');
  });

  it('leaves nothing pending after the blip, so a later tick cannot post a stale banner', () => {
    const afterBlip = run([netInfo(1000, false), netInfo(1500, true)]).machine;
    const { machine } = run([{ at: 9000, kind: 'tick' }], afterBlip);
    expect(machine.state).toBe('online');
  });

  it('asks to be woken when the window closes, since nothing else may arrive to mature it', () => {
    const { effects } = run([netInfo(1000, false)]);
    expect(effects.tickInMs).toBe(OFFLINE_ENTRY_DEBOUNCE_MS);
  });

  it('goes offline once the window elapses', () => {
    const { machine } = run([
      netInfo(1000, false),
      { at: 1000 + OFFLINE_ENTRY_DEBOUNCE_MS, kind: 'tick' },
    ]);
    expect(machine.state).toBe('device_offline');
  });

  it('skips the wait once enough separate requests have failed', () => {
    const inputs = Array.from({ length: OFFLINE_ENTRY_FAILURE_THRESHOLD }, (_unused, index) =>
      failedRequest(index * 50)
    );
    const { machine } = run([netInfo(0, false), ...inputs]);

    expect(machine.state).toBe('device_offline');
    // Well inside the debounce window — the failure count, not the clock, is what let it through.
    expect(inputs.at(-1)?.at).toBeLessThan(OFFLINE_ENTRY_DEBOUNCE_MS);
  });

  it('does not go offline on a single failed request', () => {
    const { machine } = run([netInfo(0, true), failedRequest(100)]);
    expect(machine.state).toBe('online');
  });
});

describe('success-only exit', () => {
  it('does not return online when the platform alone says the interface is back', () => {
    const offline = enterDeviceOffline();
    const { machine } = run([netInfo(20000, true)], offline);
    expect(machine.state).toBe('device_offline');
  });

  it('probes immediately instead, and restarts the ladder', () => {
    const offline = run(
      [
        { at: 5000, didSucceed: false, kind: 'probe-result' },
        { at: 7000, didSucceed: false, kind: 'probe-result' },
      ],
      enterDeviceOffline()
    ).machine;
    expect(offline.probeStep).toBeGreaterThan(0);

    const { effects, machine } = run([netInfo(20000, true)], offline);
    expect(effects.probeInMs).toBe(0);
    expect(machine.probeStep).toBe(0);
  });

  it('returns online on a successful probe', () => {
    const offline = enterDeviceOffline();
    const { machine } = run([{ at: 20000, didSucceed: true, kind: 'probe-result' }], offline);
    expect(machine.state).toBe('online');
  });

  it('returns online on a request that reached the server, without scheduling a probe', () => {
    const offline = enterDeviceOffline();
    const { effects, machine } = run(
      [{ at: 20000, kind: 'request-outcome', outcome: 'reached_server' }],
      offline
    );

    expect(machine.state).toBe('online');
    expect(effects.probeInMs).toBeNull();
  });

  it('honors proof of a working network even inside the dwell window', () => {
    const offline = enterDeviceOffline(0);
    const at = offline.stateChangedAt + 1;
    const { machine } = run([{ at, kind: 'request-outcome', outcome: 'reached_server' }], offline);

    expect(at - offline.stateChangedAt).toBeLessThan(MIN_STATE_DWELL_MS);
    expect(machine.state).toBe('online');
  });
});

describe('probe backoff', () => {
  it('doubles across consecutive probe failures and stops at the cap', () => {
    let machine = enterDeviceOffline();
    const delays: (number | null)[] = [];

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const transition = reduceConnectivity(machine, {
        at: 20000 + attempt * 1000,
        didSucceed: false,
        kind: 'probe-result',
      });
      machine = transition.machine;
      delays.push(transition.effects.probeInMs);
    }

    expect(delays).toEqual([4000, 8000, 16000, 32000, 60000, 60000, 60000, 60000]);
    expect(delays.at(-1)).toBe(PROBE_MAX_DELAY_MS);
  });

  it('starts the ladder at the base delay on entering an offline state', () => {
    const { effects } = run([netInfo(0, false), { at: OFFLINE_ENTRY_DEBOUNCE_MS, kind: 'tick' }]);
    expect(effects.probeInMs).toBe(PROBE_BASE_DELAY_MS);
  });

  it('resets the ladder once the network is proven working again', () => {
    let machine = enterDeviceOffline();
    machine = run([{ at: 20000, didSucceed: false, kind: 'probe-result' }], machine).machine;
    machine = run([{ at: 25000, didSucceed: true, kind: 'probe-result' }], machine).machine;

    expect(machine.probeStep).toBe(0);
    expect(probeDelayForStep(machine.probeStep)).toBe(PROBE_BASE_DELAY_MS);
  });
});

describe('user action', () => {
  it('probes now from deep in the backoff ladder, and starts the ladder over', () => {
    let machine = enterDeviceOffline();
    for (let attempt = 0; attempt < 6; attempt += 1) {
      machine = reduceConnectivity(machine, {
        at: 20000 + attempt * 1000,
        didSucceed: false,
        kind: 'probe-result',
      }).machine;
    }
    expect(probeDelayForStep(machine.probeStep)).toBe(PROBE_MAX_DELAY_MS);

    const { effects, machine: next } = run([{ at: 30000, kind: 'user-action' }], machine);
    expect(effects.probeInMs).toBe(0);
    expect(next.probeStep).toBe(0);
  });

  it('does nothing while already online', () => {
    const { effects, machine } = run([{ at: 1000, kind: 'user-action' }]);
    expect(effects.probeInMs).toBeNull();
    expect(machine.state).toBe('online');
  });
});

describe('minimum dwell time', () => {
  it('will not go straight back offline after recovering', () => {
    const recovered = run(
      [{ at: 5000, didSucceed: true, kind: 'probe-result' }],
      enterDeviceOffline()
    ).machine;

    // Enough failures to clear the debounce outright, so the dwell floor is the only thing left
    // holding the banner back.
    const at = recovered.stateChangedAt + 1000;
    const failures = Array.from({ length: OFFLINE_ENTRY_FAILURE_THRESHOLD }, (_unused, index) =>
      failedRequest(at + index + 1)
    );
    const { machine } = run([netInfo(at, false), ...failures], recovered);

    expect(machine.state).toBe('online');
    expect(machine.pendingState).toBe('device_offline');
  });

  it('transitions once the floor has passed', () => {
    const recovered = run(
      [{ at: 5000, didSucceed: true, kind: 'probe-result' }],
      enterDeviceOffline()
    ).machine;

    const at = recovered.stateChangedAt + 1000;
    const pending = run([netInfo(at, false)], recovered).machine;
    const { machine } = run(
      [{ at: recovered.stateChangedAt + MIN_STATE_DWELL_MS, kind: 'tick' }],
      pending
    );

    expect(machine.state).toBe('device_offline');
  });

  it('holds the banner copy steady when the flavor of the outage changes', () => {
    const offline = enterDeviceOffline();
    const at = offline.stateChangedAt + 1000;
    const { machine } = run([netInfo(at, true), gatewayError(at + 1)], offline);

    expect(machine.state).toBe('device_offline');
    expect(machine.pendingState).toBe('server_unreachable');
  });

  it('lets the flavor change once the floor has passed', () => {
    const offline = enterDeviceOffline();
    const at = offline.stateChangedAt + MIN_STATE_DWELL_MS;
    const { machine } = run([netInfo(at, true), gatewayError(at + 1)], offline);

    expect(machine.state).toBe('server_unreachable');
  });
});

describe('device_offline vs server_unreachable', () => {
  it('blames the server when the interface is up and gateways are erroring', () => {
    const inputs = Array.from({ length: OFFLINE_ENTRY_FAILURE_THRESHOLD }, (_unused, index) =>
      gatewayError(index * 50)
    );
    const { machine } = run([netInfo(0, true), ...inputs]);
    expect(machine.state).toBe('server_unreachable');
  });

  it('blames the server when the interface is up and requests never get a response', () => {
    const inputs = Array.from({ length: OFFLINE_ENTRY_FAILURE_THRESHOLD }, (_unused, index) =>
      failedRequest(index * 50)
    );
    const { machine } = run([netInfo(0, true), ...inputs]);
    expect(machine.state).toBe('server_unreachable');
  });

  it('blames the device when the platform reports no connection, even as requests fail', () => {
    const inputs = Array.from({ length: OFFLINE_ENTRY_FAILURE_THRESHOLD }, (_unused, index) =>
      failedRequest(index * 50)
    );
    const { machine } = run([netInfo(0, false), ...inputs]);
    expect(machine.state).toBe('device_offline');
  });

  it('blames the server when the platform has not reported anything yet', () => {
    // No NetInfo event has arrived, so there is nothing to accuse the device with. The vaguer
    // message is the honest one.
    const inputs = Array.from({ length: OFFLINE_ENTRY_FAILURE_THRESHOLD }, (_unused, index) =>
      failedRequest(index * 50)
    );
    const { machine } = run(inputs);

    expect(machine.isNetInfoConnected).toBeNull();
    expect(machine.state).toBe('server_unreachable');
  });

  it('trusts a gateway answer over a stale disconnected reading', () => {
    const inputs = Array.from({ length: OFFLINE_ENTRY_FAILURE_THRESHOLD }, (_unused, index) =>
      gatewayError(index * 50)
    );
    const { machine } = run([netInfo(0, false), ...inputs]);
    expect(machine.state).toBe('server_unreachable');
  });
});

describe('initial state', () => {
  it('opens online, so a cold launch does not wear a banner it has not earned', () => {
    const machine = createConnectivityMachine();
    expect(machine.state).toBe('online');
    expect(machine.isNetInfoConnected).toBeNull();
  });

  it('does not charge the first transition a dwell wait', () => {
    const { machine } = run([netInfo(0, false), { at: OFFLINE_ENTRY_DEBOUNCE_MS, kind: 'tick' }]);
    expect(machine.state).toBe('device_offline');
    expect(machine.stateChangedAt).toBe(OFFLINE_ENTRY_DEBOUNCE_MS);
  });
});
