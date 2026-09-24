# 01a — Native frame monitor: iOS and the TypeScript surface

## Goal

Give the perf probe three abilities it lacks (perf and E2E builds only; nothing calls them yet):

1. **Session monitor.** A display link that runs for the rest of the app session and records every
   UI-thread frame gap over 25 ms, so stalls outside a tap window are no longer invisible.
2. **Frame stamps.** JS asks "time the next displayed frame" and gets back display time minus the
   tap-release time, on one clock (`CACurrentMediaTime`, which touch timestamps also use).
3. **Native log line.** `log(message)` writes through `os_log`, so timeline lines skip LogBox and
   survive Release builds.

01b does the same for Android.

## Files

- `apps/mobile/modules/podverse-perf-probe/ios/PodversePerfProbeModule.swift`
- `apps/mobile/modules/podverse-perf-probe/src/types.ts`
- `apps/mobile/modules/podverse-perf-probe/src/PodversePerfProbeModule.ts`
- `apps/mobile/modules/podverse-perf-probe/index.ts`

## Step 1 — `PodversePerfProbeModule.swift`

1a. After `import QuartzCore` add the line `import os.log`.

1b. Replace the class doc comment (the `/** … */` above `public class PodversePerfProbeModule`) with:

```swift
/**
 * UI-thread frame probe. `start`/`stop`/`snapshot` compare CADisplayLink timestamps inside one
 * window. The session monitor (`startSession`) runs for the rest of the app session: it records
 * every frame gap over 25 ms and the display time of frames JS asks to have stamped. Both use the
 * `CACurrentMediaTime` clock, which is also the clock of touch event timestamps.
 */
```

1c. Directly after the line `  private var maxGapMs: Double = 0` insert:

```swift

  private static let perfLog = OSLog(subsystem: "com.podverse.perf", category: "timeline")
  private static let longFrameMs: Double = 25
  private static let ignoreGapMs: Double = 5000
  private static let longFrameCap = 512
  private static let stampCap = 64

  // Written on the main thread by the session display link, drained on the JS thread.
  private let sessionLock = NSLock()
  private var sessionLink: CADisplayLink?
  private var sessionLastTimestamp: CFTimeInterval = 0
  private var longFrames: [(startMs: Double, gapMs: Double)] = []
  private var pendingStamps: [(tag: String, touchMs: Double)] = []
  private var readyStamps: [(tag: String, touchMs: Double, latencyMs: Double)] = []
```

1d. Replace this exact text (the end of the `Function("snapshot")` block and of `definition()`):

```swift
        "over33Ms": self.over33Ms,
      ]
    }
  }
```

with:

```swift
        "over33Ms": self.over33Ms,
      ]
    }

    Function("uptimeMs") { () -> Double in
      return CACurrentMediaTime() * 1000.0
    }

    Function("startSession") {
      DispatchQueue.main.async {
        self.startSessionLink()
      }
    }

    Function("drainLongFrames") { () -> [[String: Double]] in
      let nowMs = CACurrentMediaTime() * 1000.0
      self.sessionLock.lock()
      let frames = self.longFrames
      self.longFrames.removeAll()
      self.sessionLock.unlock()
      return frames.map { ["agoMs": nowMs - $0.startMs, "gapMs": $0.gapMs] }
    }

    Function("stampNextFrame") { (tag: String, touchMs: Double) in
      DispatchQueue.main.async {
        self.sessionLock.lock()
        if self.pendingStamps.count < PodversePerfProbeModule.stampCap {
          self.pendingStamps.append((tag: tag, touchMs: touchMs))
        }
        self.sessionLock.unlock()
        self.startSessionLink()
      }
    }

    Function("drainFrameStamps") { () -> [[String: Any]] in
      self.sessionLock.lock()
      let stamps = self.readyStamps
      self.readyStamps.removeAll()
      self.sessionLock.unlock()
      return stamps.map { ["latencyMs": $0.latencyMs, "tag": $0.tag, "touchMs": $0.touchMs] }
    }

    Function("log") { (message: String) in
      os_log("%{public}@", log: PodversePerfProbeModule.perfLog, type: .default, message)
    }
  }
```

1e. Directly after the closing `  }` of `fileprivate func onTick(_ link: CADisplayLink)` (still inside
the class), insert:

```swift

  // Main thread only. A stamp queued from a layout effect runs after React's mount block, so the
  // next tick's `targetTimestamp` is the display time of the frame that shows that commit.
  private func startSessionLink() {
    if sessionLink != nil {
      return
    }
    let link = CADisplayLink(
      target: ProbeTickTarget(owner: self),
      selector: #selector(ProbeTickTarget.sessionTick(_:))
    )
    link.add(to: .main, forMode: .common)
    sessionLink = link
    sessionLastTimestamp = 0
  }

  fileprivate func onSessionTick(_ link: CADisplayLink) {
    let now = link.timestamp
    let targetMs = link.targetTimestamp * 1000.0
    sessionLock.lock()
    defer { sessionLock.unlock() }
    if sessionLastTimestamp > 0 {
      let gapMs = (now - sessionLastTimestamp) * 1000.0
      if gapMs > PodversePerfProbeModule.longFrameMs && gapMs < PodversePerfProbeModule.ignoreGapMs {
        if longFrames.count >= PodversePerfProbeModule.longFrameCap {
          longFrames.removeFirst()
        }
        longFrames.append((startMs: sessionLastTimestamp * 1000.0, gapMs: gapMs))
      }
    }
    sessionLastTimestamp = now
    for stamp in pendingStamps {
      if readyStamps.count >= PodversePerfProbeModule.stampCap {
        readyStamps.removeFirst()
      }
      readyStamps.append((tag: stamp.tag, touchMs: stamp.touchMs, latencyMs: targetMs - stamp.touchMs))
    }
    pendingStamps.removeAll()
  }
```

1f. In `private final class ProbeTickTarget`, after the existing `tick` method, add:

```swift

  @objc func sessionTick(_ link: CADisplayLink) {
    guard let owner = owner else {
      link.invalidate()
      return
    }
    owner.onSessionTick(link)
  }
```

## Step 2 — `src/types.ts`

Append:

```ts
/** One UI-thread frame gap over the long-frame threshold, reported relative to the drain call. */
export type LongFrame = {
  agoMs: number;
  gapMs: number;
};

/** Display time of a stamped frame, measured from the tap release (`touchMs`, native uptime). */
export type FrameStamp = {
  latencyMs: number;
  tag: string;
  touchMs: number;
};
```

## Step 3 — `src/PodversePerfProbeModule.ts`

3a. Change the type import to `import type { FrameProbeSnapshot, FrameStamp, LongFrame } from './types';`

3b. Replace the `PodversePerfProbeNativeModule` type with the version below. The new members are
optional because a build made before this change lacks them; callers must check before calling.

```ts
export type PodversePerfProbeNativeModule = {
  drainFrameStamps?: () => FrameStamp[];
  drainLongFrames?: () => LongFrame[];
  log?: (message: string) => void;
  reset(): void;
  snapshot(): FrameProbeSnapshot;
  stampNextFrame?: (tag: string, touchMs: number) => void;
  start(): void;
  startSession?: () => void;
  stop(): void;
  uptimeMs?: () => number;
};
```

## Step 4 — `index.ts`

Change `export type { FrameProbeSnapshot } from './src/types';` to
`export type { FrameProbeSnapshot, FrameStamp, LongFrame } from './src/types';`

## Do not

- Do not change the existing `start`, `stop`, `reset`, or `snapshot` functions.
- Do not call the new functions from app code (02a and 02b do that).
- Do not add dependencies.

## Done when

- [ ] Swift has `import os.log`, the session properties, six new `Function`s, `startSessionLink`,
      `onSessionTick`, and `ProbeTickTarget.sessionTick`.
- [ ] TS exports `LongFrame` and `FrameStamp`; the module type lists the six optional members.
- [ ] COPY-PASTA 01a ticked; this file moved to `.llm/plans/completed/mobile-chip-switch-smooth/`.

## Operator checkpoint

None yet. Paste prompt 01b next; the rebuild comes after it.
