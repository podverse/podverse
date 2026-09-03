import ExpoModulesCore

// This Expo module is a thin transport surface over the process-wide `PodverseAudioEngine.shared`.
// It does NOT own the AVPlayer, audio session, or remote command center; the engine singleton does,
// so CarPlay binds now-playing to the same player and command center WITHOUT starting the JS runtime.
//
// Car foundation (00-CAR-FOUNDATION.md): one player, one command center, no second path for "car
// later". Do NOT use react-native-track-player.
public class PodverseMediaEngineModule: Module {
  public func definition() -> ModuleDefinition {
    // Must match requireNativeModule('PodverseMediaEngine') on the JS side.
    Name("PodverseMediaEngine")

    // Native → JS events.
    Events("playbackState", "progress", "ended", "error", "stalled")

    // Forward engine events to JS while this module (and the JS runtime) is alive. When JS is not
    // running, the engine still plays and updates the lock screen / car now-playing on its own.
    OnCreate {
      PodverseAudioEngine.shared.eventSink = { [weak self] event, payload in
        self?.sendEvent(event.rawValue, payload)
      }
    }

    OnDestroy {
      PodverseAudioEngine.shared.eventSink = nil
    }

    // --- Playback transport ---

    AsyncFunction("load") { (url: String, initialSeekSeconds: Double?) in
      try PodverseAudioEngine.shared.load(url: url, initialSeekSeconds: initialSeekSeconds)
    }

    // Atomic load + play. Used by the primary autoplay path.
    AsyncFunction("loadAndStart") { (url: String, initialSeekSeconds: Double?) in
      try PodverseAudioEngine.shared.loadAndStart(url: url, initialSeekSeconds: initialSeekSeconds)
    }

    AsyncFunction("play") {
      PodverseAudioEngine.shared.play()
    }

    Function("pause") {
      PodverseAudioEngine.shared.pause()
    }

    Function("seek") { (seconds: Double) in
      PodverseAudioEngine.shared.seek(seconds: seconds)
    }

    Function("setRate") { (rate: Double) in
      PodverseAudioEngine.shared.setRate(rate)
    }

    AsyncFunction("getPosition") { () -> Double in
      return PodverseAudioEngine.shared.getPosition()
    }

    AsyncFunction("getDuration") { () -> Double in
      return PodverseAudioEngine.shared.getDuration()
    }

    Function("destroy") {
      PodverseAudioEngine.shared.destroy()
    }

    // --- Video surface. The ONE
    // `AVPlayerLayer` is reparented between RN-mounted `PodverseVideoSurfaceView`s (registered via
    // the `View` below); never loads/destroys the player or creates a second surface. ---

    // RN-mounted target view; registers itself with the host by `targetId` (`mini` / `full`).
    View(PodverseVideoSurfaceView.self) {
      Prop("targetId") { (view: PodverseVideoSurfaceView, targetId: String) in
        view.setTargetId(targetId)
      }
    }

    // Retained for the JS bridge/serialization contract + unit tests. Placement is driven by the
    // reparent into `PodverseVideoSurfaceView` (above), so rects do not position the surface.
    Function("attachVideoSurface") {
      (_: String, _: Double, _: Double, _: Double, _: Double, _: Double) in
      // No-op: placement is handled by native-view reparent. See PodverseVideoSurfaceHost.
    }

    Function("animateVideoSurface") { (toTargetId: String, durationMs: Double) in
      guard let target = PodverseVideoTargetId(rawValue: toTargetId) else { return }
      PodverseVideoSurfaceHost.shared.setActiveTarget(target, animatedDuration: durationMs / 1000.0)
    }

    // JS-desired visibility; the host only shows when the item also has video frames.
    Function("setVideoSurfaceVisible") { (visible: Bool) in
      PodverseVideoSurfaceHost.shared.setVisible(visible)
    }

    // --- Native-cache write hooks.
    // JS mirrors state here; `PodverseNativeCache` persists JSON so a CarPlay scene reads it with
    // the JS runtime not running. The envelope is defined in `src/data/nativeCache/projection.ts`.
    // Best-effort: a failed write must not surface as a JS
    // error that rolls back the phone-side mutation. ---

    AsyncFunction("writeQueueSnapshot") { (payloadJson: String) in
      PodverseNativeCache.write(.queue, json: payloadJson)
    }

    AsyncFunction("writeDownloadsIndex") { (payloadJson: String) in
      PodverseNativeCache.write(.downloads, json: payloadJson)
    }

    AsyncFunction("writeLibraryBrowseIndex") { (payloadJson: String) in
      PodverseNativeCache.write(.libraryBrowse, json: payloadJson)
    }
  }
}
