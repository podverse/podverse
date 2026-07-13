import ExpoModulesCore

// PG-2b steps 2.4–2.6 (details 083–085). This Expo module is a thin transport surface over the
// process-wide `PodverseAudioEngine.shared`. It does NOT own the AVPlayer, audio session, or remote
// command center — the engine singleton does, so a future CarPlay scene (Track 12, 12.9–12.10) can
// bind now-playing to the same player and command center WITHOUT starting the JS runtime.
//
// Car foundation (00-CAR-FOUNDATION.md): one player, one command center, no second path for "car
// later". Do NOT use react-native-track-player.
public class PodverseMediaEngineModule: Module {
  public func definition() -> ModuleDefinition {
    // Must match requireNativeModule('PodverseMediaEngine') on the JS side.
    Name("PodverseMediaEngine")

    // Native → JS events (contract aligns with step 2.10 / detail 089).
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

    // --- Playback transport (contract: detail 082) ---

    AsyncFunction("load") { (url: String, initialSeekSeconds: Double?) in
      try PodverseAudioEngine.shared.load(url: url, initialSeekSeconds: initialSeekSeconds)
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

    // --- Native-cache write hooks (step 2.35 / detail 114). Stubs OK in PG-2b; signatures reserved
    // so phone UI cannot invent a parallel cache. Schema owned by Track 12.1. Native reads must work
    // with JS not running (seamless CarPlay proof deferred to 12.5 / 12.18). ---

    AsyncFunction("writeQueueSnapshot") { (payloadJson: String) in
      // TODO(12.2): persist to App Group container. No-op stub in PG-2b.
    }

    AsyncFunction("writeDownloadsIndex") { (payloadJson: String) in
      // TODO(12.2): persist to App Group container. No-op stub in PG-2b.
    }

    AsyncFunction("writeLibraryBrowseIndex") { (payloadJson: String) in
      // TODO(12.2): persist to App Group container. No-op stub in PG-2b.
    }
  }
}
