import ExpoModulesCore

// This Expo module is a thin transport surface over the process-wide `PodverseAudioEngine.shared`.
// It does NOT own the AVPlayer, audio session, or remote command center; the engine singleton does,
// so CarPlay binds now-playing to the same player and command center WITHOUT starting the JS runtime.
//
// One player and one command center serve the phone and the car. Do NOT use
// react-native-track-player.
public class PodverseMediaEngineModule: Module {
  private var carPlayConnectObserver: NSObjectProtocol?

  public func definition() -> ModuleDefinition {
    // Must match requireNativeModule('PodverseMediaEngine') on the JS side.
    Name("PodverseMediaEngine")

    // Native → JS events.
    Events(
      "playbackState", "progress", "ended", "error", "stalled", "sourceChanged",
      "remoteTrackCommand", "podverseCarPlayDidConnect", "videoPresented", "deviceOrientation",
      "pictureInPicture")

    // Forward engine events to JS while this module (and the JS runtime) is alive. When JS is not
    // running, the engine still plays and updates the lock screen / car now-playing on its own.
    // Owner-scoped so a Fast Refresh teardown cannot clear a newer module's sink.
    OnCreate {
      PodverseAudioEngine.shared.setEventSink(
        { [weak self] event, payload in
          self?.sendEvent(event.rawValue, payload)
        }, owner: self)
      PodverseVideoSurfaceHost.shared.onVideoPresentedChanged = { [weak self] presented in
        self?.sendEvent("videoPresented", ["presented": presented])
      }
      PodverseVideoSurfaceHost.shared.onPictureInPictureChanged = { [weak self] active, restore in
        self?.sendEvent("pictureInPicture", ["active": active, "restore": restore])
      }
      PodverseDeviceOrientation.shared.onChange = { [weak self] landscape in
        self?.sendEvent("deviceOrientation", ["landscape": landscape])
      }
      self.sendEvent(
        "videoPresented",
        ["presented": PodverseVideoSurfaceHost.shared.isVideoPresented()])
      self.carPlayConnectObserver = NotificationCenter.default.addObserver(
        forName: .podverseCarPlayDidConnect, object: nil, queue: .main
      ) { [weak self] _ in
        self?.sendEvent("podverseCarPlayDidConnect", [:])
      }
    }

    OnDestroy {
      PodverseAudioEngine.shared.clearEventSink(owner: self)
      if let observer = self.carPlayConnectObserver {
        NotificationCenter.default.removeObserver(observer)
        self.carPlayConnectObserver = nil
      }
    }

    // --- Playback transport ---

    // `audioProfile` is `spoken` / `music` / `video`; an unknown or missing value keeps the
    // engine's current profile.
    AsyncFunction("load") {
      (
        url: String, initialSeekSeconds: Double?, basicAuth: MediaBasicAuthRecord?,
        audioProfile: String?, metaJson: String?
      ) in
      try PodverseAudioEngine.shared.load(
        url: url, initialSeekSeconds: initialSeekSeconds,
        basicAuth: basicAuth?.toScopedBasicAuth(),
        audioProfile: audioProfile.flatMap(PodverseAudioProfile.init(rawValue:)),
        metaJson: metaJson)
    }

    // Atomic load + play. Used by the primary autoplay path.
    AsyncFunction("loadAndStart") {
      (
        url: String, initialSeekSeconds: Double?, basicAuth: MediaBasicAuthRecord?,
        audioProfile: String?, metaJson: String?
      ) in
      try PodverseAudioEngine.shared.loadAndStart(
        url: url, initialSeekSeconds: initialSeekSeconds,
        basicAuth: basicAuth?.toScopedBasicAuth(),
        audioProfile: audioProfile.flatMap(PodverseAudioProfile.init(rawValue:)),
        metaJson: metaJson)
    }

    AsyncFunction("play") {
      PodverseAudioEngine.shared.play()
    }

    AsyncFunction("goToLive") {
      PodverseAudioEngine.shared.goToLive()
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

    AsyncFunction("getCurrentSource") { () -> [String: Any]? in
      return PodverseAudioEngine.shared.getCurrentSource()
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

    Function("setVideoFullscreen") { (enabled: Bool) in
      PodverseVideoSurfaceHost.shared.setFullscreenActive(enabled)
      if enabled {
        PodverseDeviceOrientation.shared.start()
      } else {
        PodverseDeviceOrientation.shared.stop()
      }
    }

    Function("isPhysicalDeviceLandscape") { () -> Bool in
      return PodverseDeviceOrientation.shared.isLandscape
    }

    Function("isVideoPresented") { () -> Bool in
      return PodverseVideoSurfaceHost.shared.isVideoPresented()
    }

    // --- Native-cache write hooks.
    // JS mirrors state here; `PodverseNativeCache` persists JSON so a CarPlay scene reads it with
    // the JS runtime not running. The envelope is defined in `src/data/nativeCache/projection.ts`.
    // Best-effort: a failed write must not surface as a JS
    // error that rolls back the phone-side mutation. ---

    AsyncFunction("writeQueueSnapshotAv") { (payloadJson: String) in
      PodverseNativeCache.write(.queueAv, json: payloadJson)
    }

    AsyncFunction("writeQueueSnapshotMusic") { (payloadJson: String) in
      PodverseNativeCache.write(.queueMusic, json: payloadJson)
    }

    AsyncFunction("writeAdvanceWindow") { (payloadJson: String) in
      PodverseNativeCache.write(.advanceWindow, json: payloadJson)
    }

    AsyncFunction("writeDownloadsIndex") { (payloadJson: String) in
      PodverseNativeCache.write(.downloads, json: payloadJson)
    }

    AsyncFunction("writeLibraryBrowseIndex") { (payloadJson: String) in
      PodverseNativeCache.write(.libraryBrowse, json: payloadJson)
    }

    AsyncFunction("writeLibraryChildren") { (channelIdText: String, payloadJson: String) in
      PodverseNativeCache.writeLibraryChildren(channelIdText: channelIdText, json: payloadJson)
    }

    AsyncFunction("writeHistoryIndex") { (payloadJson: String) in
      PodverseNativeCache.write(.history, json: payloadJson)
    }

    AsyncFunction("writeLiveIndex") { (payloadJson: String) in
      PodverseNativeCache.write(.live, json: payloadJson)
    }

    AsyncFunction("writeAccountContext") { (payloadJson: String) in
      if let data = payloadJson.data(using: .utf8),
        let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
        let signedIn = object["signedIn"] as? Bool, signedIn == false
      {
        PodverseNativeCache.clearAccountScopedFiles()
      }
      PodverseNativeCache.write(.accountContext, json: payloadJson)
    }

    AsyncFunction("readPlaybackJournal") { () -> String? in
      return PodverseNativeCache.read(.playbackJournal)
    }

    AsyncFunction("writePlaybackJournal") { (payloadJson: String) in
      PodverseNativeCache.write(.playbackJournal, json: payloadJson)
    }

    AsyncFunction("setJsOwnsAdvance") { (owns: Bool) in
      PodverseAudioEngine.shared.setJsOwnsAdvance(owns)
    }
  }
}
