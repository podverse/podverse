import ExpoModulesCore
import QuartzCore
import os.log

/**
 * UI-thread frame probe. `start`/`stop`/`snapshot` compare CADisplayLink timestamps inside one
 * window. The session monitor (`startSession`) runs for the rest of the app session: it records
 * every frame gap over 25 ms and the display time of frames JS asks to have stamped. Both use the
 * `CACurrentMediaTime` clock, which is also the clock of touch event timestamps.
 */
public class PodversePerfProbeModule: Module {
  private var displayLink: CADisplayLink?
  private var lastTimestamp: CFTimeInterval = 0
  private var frameCount: Int = 0
  private var over17Ms: Int = 0
  private var over33Ms: Int = 0
  private var maxGapMs: Double = 0

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

  public func definition() -> ModuleDefinition {
    Name("PodversePerfProbe")

    Function("start") {
      self.startProbe()
    }

    Function("stop") {
      self.stopProbe()
    }

    Function("reset") {
      self.stopProbe()
      self.frameCount = 0
      self.over17Ms = 0
      self.over33Ms = 0
      self.maxGapMs = 0
      self.lastTimestamp = 0
    }

    Function("snapshot") { () -> [String: Any] in
      return [
        "frameCount": self.frameCount,
        "maxGapMs": self.maxGapMs,
        "over17Ms": self.over17Ms,
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

  private func startProbe() {
    if displayLink != nil {
      return
    }
    let link = CADisplayLink(target: ProbeTickTarget(owner: self), selector: #selector(ProbeTickTarget.tick(_:)))
    link.add(to: .main, forMode: .common)
    displayLink = link
    lastTimestamp = 0
  }

  private func stopProbe() {
    displayLink?.invalidate()
    displayLink = nil
    lastTimestamp = 0
  }

  fileprivate func onTick(_ link: CADisplayLink) {
    let now = link.timestamp
    if lastTimestamp > 0 {
      let gapMs = (now - lastTimestamp) * 1000.0
      frameCount += 1
      if gapMs > maxGapMs {
        maxGapMs = gapMs
      }
      if gapMs > 17.0 {
        over17Ms += 1
      }
      if gapMs > 33.0 {
        over33Ms += 1
      }
    }
    lastTimestamp = now
  }

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
}

private final class ProbeTickTarget: NSObject {
  weak var owner: PodversePerfProbeModule?

  init(owner: PodversePerfProbeModule) {
    self.owner = owner
  }

  @objc func tick(_ link: CADisplayLink) {
    owner?.onTick(link)
  }

  @objc func sessionTick(_ link: CADisplayLink) {
    guard let owner = owner else {
      link.invalidate()
      return
    }
    owner.onSessionTick(link)
  }
}
