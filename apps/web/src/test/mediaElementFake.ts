/**
 * Fake `HTMLMediaElement` test harness.
 *
 * Used by orchestration tests under
 * `apps/web/src/components/MediaPlayer/Controller/__tests__/` to lock current
 * playback behavior in place as an executable contract.
 *
 * The fake records every `currentTime` write with a timestamp so tests can
 * assert exact seek policy after `loadedmetadata` (the regression oracle for
 * the media-player architecture refactor — see
 * [`MEDIA-PLAYER-DECISION-MATRIX.md`](../components/MediaPlayer/MEDIA-PLAYER-DECISION-MATRIX.md)).
 *
 * The fake intentionally does not run a real playback clock. Tests fire
 * synthetic `loadedmetadata`, `play`, `pause`, `timeupdate`, and `ended`
 * events to walk the controller through deterministic states.
 */

export type MediaElementFakeEventKind =
  | 'loadedmetadata'
  | 'play'
  | 'pause'
  | 'timeupdate'
  | 'ended'
  | 'seeked'
  | 'durationchange'
  | 'volumechange'
  | 'ratechange';

export type MediaElementFakeEventLogEntry =
  | { kind: 'set-src'; value: string; t: number }
  | { kind: 'set-currentTime'; value: number; t: number }
  | { kind: 'set-volume'; value: number; t: number }
  | { kind: 'set-muted'; value: boolean; t: number }
  | { kind: 'set-playbackRate'; value: number; t: number }
  | { kind: 'method-load'; t: number }
  | { kind: 'method-play'; t: number }
  | { kind: 'method-pause'; t: number }
  | { kind: 'event-dispatch'; type: MediaElementFakeEventKind; t: number };

export interface MediaElementFakeOptions {
  /** Initial readyState. Defaults to 0 (HAVE_NOTHING). */
  readyState?: number;
  /** Initial duration. Defaults to NaN until a `loadedmetadata` is fired. */
  duration?: number;
  /** Initial paused state. Defaults to true. */
  paused?: boolean;
  /** Clock function (millisecond timestamp). Defaults to `() => Date.now()`. */
  now?: () => number;
}

/**
 * Subset of `HTMLMediaElement` exercised by `NonLiveMediaOrchestrator` and
 * related controllers. Cast to `HTMLAudioElement & HTMLVideoElement` at the
 * test boundary where needed; the controller code only touches members that
 * are implemented here.
 */
export class MediaElementFake {
  src: string = '';
  currentTime: number = 0;
  duration: number = NaN;
  paused: boolean = true;
  volume: number = 1;
  muted: boolean = false;
  playbackRate: number = 1;
  readyState: number = 0;

  private readonly _now: () => number;
  private readonly _listeners: Map<string, Set<EventListener>> = new Map();
  private readonly _eventLog: MediaElementFakeEventLogEntry[] = [];

  constructor(options: MediaElementFakeOptions = {}) {
    this._now = options.now ?? (() => Date.now());
    if (typeof options.readyState === 'number') this.readyState = options.readyState;
    if (typeof options.duration === 'number') this.duration = options.duration;
    if (typeof options.paused === 'boolean') this.paused = options.paused;

    return new Proxy(this, {
      set: (target, prop, value) => {
        if (prop === 'src' && typeof value === 'string') {
          target._eventLog.push({ kind: 'set-src', value, t: target._now() });
        } else if (prop === 'currentTime' && typeof value === 'number') {
          target._eventLog.push({ kind: 'set-currentTime', value, t: target._now() });
        } else if (prop === 'volume' && typeof value === 'number') {
          target._eventLog.push({ kind: 'set-volume', value, t: target._now() });
        } else if (prop === 'muted' && typeof value === 'boolean') {
          target._eventLog.push({ kind: 'set-muted', value, t: target._now() });
        } else if (prop === 'playbackRate' && typeof value === 'number') {
          target._eventLog.push({ kind: 'set-playbackRate', value, t: target._now() });
        }
        Reflect.set(target, prop, value);
        return true;
      },
    });
  }

  addEventListener(type: string, listener: EventListener, _opts?: AddEventListenerOptions): void {
    let listeners = this._listeners.get(type);
    if (!listeners) {
      listeners = new Set();
      this._listeners.set(type, listeners);
    }
    listeners.add(listener);
  }

  removeEventListener(type: string, listener: EventListener): void {
    this._listeners.get(type)?.delete(listener);
  }

  removeAttribute(name: string): void {
    if (name === 'src') this.src = '';
  }

  load(): void {
    this._eventLog.push({ kind: 'method-load', t: this._now() });
  }

  async play(): Promise<void> {
    this._eventLog.push({ kind: 'method-play', t: this._now() });
    this.paused = false;
    this._dispatch('play');
  }

  pause(): void {
    this._eventLog.push({ kind: 'method-pause', t: this._now() });
    this.paused = true;
    this._dispatch('pause');
  }

  /**
   * Fire a synthetic `loadedmetadata` event. Sets `readyState >= 1` and the
   * supplied `duration` first, then dispatches the event so that controller
   * handlers see the new state.
   */
  fireLoadedMetadata(durationSeconds: number): void {
    this.duration = durationSeconds;
    if (this.readyState < 1) this.readyState = 1;
    this._dispatch('loadedmetadata');
  }

  /**
   * Fire a synthetic `timeupdate` after setting `currentTime` to the supplied
   * value. The write is recorded in the event log so tests can distinguish
   * controller-initiated seeks from synthetic playback progression.
   */
  fireTimeUpdate(currentTimeSeconds: number): void {
    this.currentTime = currentTimeSeconds;
    this._dispatch('timeupdate');
  }

  /** Fire a synthetic `play` event without going through `play()`. */
  firePlay(): void {
    this.paused = false;
    this._dispatch('play');
  }

  /** Fire a synthetic `pause` event without going through `pause()`. */
  firePause(): void {
    this.paused = true;
    this._dispatch('pause');
  }

  /** Fire a synthetic `ended` event. */
  fireEnded(): void {
    this._dispatch('ended');
  }

  /** Get a copy of every recorded mutation, in order. */
  getEventLog(): readonly MediaElementFakeEventLogEntry[] {
    return [...this._eventLog];
  }

  /**
   * Get just the `currentTime` writes (in seconds, in order). The seek policy
   * for each (source kind x trigger) cell is asserted from this list.
   */
  getCurrentTimeWrites(): readonly number[] {
    return this._eventLog
      .filter((e) => e.kind === 'set-currentTime')
      .map((e) => (e as { kind: 'set-currentTime'; value: number }).value);
  }

  /** Reset the event log; useful when running phases inside a single test. */
  resetEventLog(): void {
    this._eventLog.length = 0;
  }

  /** Convenience: assert the last seek matched `seconds` (within 1e-9). */
  assertSeekedTo(seconds: number): void {
    const writes = this.getCurrentTimeWrites();
    const last = writes[writes.length - 1];
    if (last === undefined) {
      throw new Error(`assertSeekedTo(${seconds}) failed: no currentTime writes recorded`);
    }
    if (Math.abs(last - seconds) > 1e-9) {
      throw new Error(
        `assertSeekedTo(${seconds}) failed: last write was ${last}; all writes: ${JSON.stringify(writes)}`
      );
    }
  }

  /** Convenience: assert no `currentTime` write ever happened. */
  assertNeverSeeked(): void {
    const writes = this.getCurrentTimeWrites();
    if (writes.length > 0) {
      throw new Error(
        `assertNeverSeeked() failed: ${writes.length} writes recorded: ${JSON.stringify(writes)}`
      );
    }
  }

  private _dispatch(type: MediaElementFakeEventKind): void {
    this._eventLog.push({ kind: 'event-dispatch', type, t: this._now() });
    const listeners = this._listeners.get(type);
    if (!listeners) return;
    const synthetic = { type } as unknown as Event;
    for (const listener of [...listeners]) {
      listener(synthetic);
    }
  }
}

/**
 * Create a fake element that pretends to be an `HTMLAudioElement &
 * HTMLVideoElement`. Use this where the production code annotates
 * `mediaRef.current` with that intersection type.
 *
 * The fake is structurally compatible with the subset of the DOM API the
 * controllers use. Tests should reach into the underlying `MediaElementFake`
 * via the returned `fake` reference for assertions and synthetic events.
 */
export function createMediaElementFakeRef(options?: MediaElementFakeOptions): {
  current: HTMLAudioElement & HTMLVideoElement;
  fake: MediaElementFake;
} {
  const fake = new MediaElementFake(options);
  return {
    current: fake as unknown as HTMLAudioElement & HTMLVideoElement,
    fake,
  };
}

export interface InstalledMediaElementFake {
  readonly el: HTMLMediaElement;
  getEventLog(): readonly MediaElementFakeEventLogEntry[];
  getCurrentTimeWrites(): readonly number[];
  resetEventLog(): void;
  assertSeekedTo(seconds: number): void;
  assertNeverSeeked(): void;
  fireLoadedMetadata(durationSeconds: number): void;
  fireTimeUpdate(currentTimeSeconds: number): void;
  firePlay(): void;
  firePause(): void;
  fireEnded(): void;
  setReadyState(readyState: number): void;
  /** Restore original descriptors and method implementations. */
  uninstall(): void;
}

/**
 * Patch a real DOM `<audio>` or `<video>` element so that it behaves like
 * `MediaElementFake`: settable `currentTime` / `duration`, no-op `play` /
 * `pause` / `load`, and a recorded event log of every state mutation.
 *
 * Use this when the controller is rendered through React Testing Library so
 * that the React ref still points at a real DOM node, while seek policy can
 * be asserted by walking the recorded event log.
 */
export function installMediaElementFake(
  el: HTMLMediaElement,
  options: MediaElementFakeOptions = {}
): InstalledMediaElementFake {
  const now = options.now ?? (() => Date.now());
  let _currentTime = el.currentTime ?? 0;
  let _duration = typeof options.duration === 'number' ? options.duration : NaN;
  let _paused = options.paused !== false;
  let _readyState = typeof options.readyState === 'number' ? options.readyState : 0;
  let _src = '';
  let _volume = 1;
  let _muted = false;
  let _playbackRate = 1;
  const eventLog: MediaElementFakeEventLogEntry[] = [];

  const define = <T>(
    name: keyof HTMLMediaElement,
    descriptor: PropertyDescriptor & { get?: () => T; set?: (v: T) => void }
  ) => {
    Object.defineProperty(el, name, { configurable: true, ...descriptor });
  };

  define('currentTime', {
    get: () => _currentTime,
    set: (v: number) => {
      _currentTime = v;
      eventLog.push({ kind: 'set-currentTime', value: v, t: now() });
    },
  });
  define('duration', { get: () => _duration });
  define('paused', { get: () => _paused });
  define('readyState', { get: () => _readyState });
  define('src', {
    get: () => _src,
    set: (v: string) => {
      _src = v;
      eventLog.push({ kind: 'set-src', value: v, t: now() });
    },
  });
  define('volume', {
    get: () => _volume,
    set: (v: number) => {
      _volume = v;
      eventLog.push({ kind: 'set-volume', value: v, t: now() });
    },
  });
  define('muted', {
    get: () => _muted,
    set: (v: boolean) => {
      _muted = v;
      eventLog.push({ kind: 'set-muted', value: v, t: now() });
    },
  });
  define('playbackRate', {
    get: () => _playbackRate,
    set: (v: number) => {
      _playbackRate = v;
      eventLog.push({ kind: 'set-playbackRate', value: v, t: now() });
    },
  });

  const originalLoad = el.load.bind(el);
  const originalPlay = el.play.bind(el);
  const originalPause = el.pause.bind(el);
  const originalRemoveAttr = el.removeAttribute.bind(el);

  el.load = () => {
    eventLog.push({ kind: 'method-load', t: now() });
  };
  el.play = async () => {
    eventLog.push({ kind: 'method-play', t: now() });
    _paused = false;
    el.dispatchEvent(new Event('play'));
  };
  el.pause = () => {
    eventLog.push({ kind: 'method-pause', t: now() });
    _paused = true;
    el.dispatchEvent(new Event('pause'));
  };
  el.removeAttribute = (name: string) => {
    if (name === 'src') {
      _src = '';
    }
  };

  const fire = (type: MediaElementFakeEventKind) => {
    eventLog.push({ kind: 'event-dispatch', type, t: now() });
    el.dispatchEvent(new Event(type));
  };

  return {
    el,
    getEventLog: () => [...eventLog],
    getCurrentTimeWrites: () =>
      eventLog
        .filter((e) => e.kind === 'set-currentTime')
        .map((e) => (e as { kind: 'set-currentTime'; value: number }).value),
    resetEventLog: () => {
      eventLog.length = 0;
    },
    assertSeekedTo(seconds) {
      const writes = eventLog
        .filter((e) => e.kind === 'set-currentTime')
        .map((e) => (e as { kind: 'set-currentTime'; value: number }).value);
      const last = writes[writes.length - 1];
      if (last === undefined) {
        throw new Error(`assertSeekedTo(${seconds}) failed: no currentTime writes recorded`);
      }
      if (Math.abs(last - seconds) > 1e-9) {
        throw new Error(
          `assertSeekedTo(${seconds}) failed: last write was ${last}; writes: ${JSON.stringify(writes)}`
        );
      }
    },
    assertNeverSeeked() {
      const writes = eventLog.filter((e) => e.kind === 'set-currentTime');
      if (writes.length > 0) {
        throw new Error(
          `assertNeverSeeked() failed: ${writes.length} writes: ${JSON.stringify(writes)}`
        );
      }
    },
    fireLoadedMetadata(durationSeconds) {
      _duration = durationSeconds;
      if (_readyState < 1) _readyState = 1;
      fire('loadedmetadata');
    },
    fireTimeUpdate(currentTimeSeconds) {
      _currentTime = currentTimeSeconds;
      fire('timeupdate');
    },
    firePlay() {
      _paused = false;
      fire('play');
    },
    firePause() {
      _paused = true;
      fire('pause');
    },
    fireEnded() {
      fire('ended');
    },
    setReadyState(readyState) {
      _readyState = readyState;
    },
    uninstall() {
      el.load = originalLoad;
      el.play = originalPlay;
      el.pause = originalPause;
      el.removeAttribute = originalRemoveAttr;
      for (const name of [
        'currentTime',
        'duration',
        'paused',
        'readyState',
        'src',
        'volume',
        'muted',
        'playbackRate',
      ] as const) {
        try {
          delete (el as unknown as Record<string, unknown>)[name];
        } catch {
          // Ignore — descriptor may not be deletable; uninstall is best-effort.
        }
      }
    },
  };
}
