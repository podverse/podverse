import AVFoundation
import Foundation
import MediaPlayer

// PG-2b steps 2.4–2.6 (details 083–085).
//
// Car foundation (00-CAR-FOUNDATION.md): this is the single, process-wide audio engine. It owns the
// one `AVPlayer`, the one `AVAudioSession` configuration, and the one `MPRemoteCommandCenter`
// registration for phone, lock screen, and future CarPlay now-playing (12.9–12.10). A future CarPlay
// scene binds now-playing to `PodverseAudioEngine.shared` WITHOUT starting the JS runtime — do not
// require the RN bridge to be alive, and do not add a second player or command center for "car later".
// Do NOT use react-native-track-player.

/// Native → JS event names. Kept in one place so the engine and the Expo module agree.
enum PodverseMediaEngineEvent: String {
  case playbackState
  case progress
  case ended
  case error
  case stalled
}

/// High-level playback state mirrored to JS via `playbackState`. Matches the TS `PlaybackStateValue`.
enum PodversePlaybackState: String {
  case idle
  case loading
  case ready
  case playing
  case paused
  case stalled
  case ended
  case error
}

/// Now-playing metadata supplied with a load. Fields are optional; the spike may use placeholders.
struct PodverseNowPlayingInfo {
  var title: String?
  var artist: String?
}

/// Process-wide shared audio engine. Access via `PodverseAudioEngine.shared`.
///
/// This singleton is intentionally independent of the Expo module lifecycle: a future CarPlay scene
/// (Track 12) can reference `PodverseAudioEngine.shared` to render now-playing and issue transport
/// commands even when the JS runtime has not started. The Expo module registers an `eventSink` to
/// forward events to JS while it is alive; when JS is absent, the engine still plays and updates the
/// lock screen / car now-playing.
public final class PodverseAudioEngine: NSObject {
  /// The one and only engine instance for the process.
  @objc public static let shared = PodverseAudioEngine()

  /// The single shared player. Do not create parallel `AVPlayer` instances anywhere in the app.
  private let player = AVPlayer()

  /// Sink used to forward events to JS. Set by the Expo module while it is alive; `nil` when the JS
  /// runtime is not running (e.g. future CarPlay-only launch). Reads/writes are hopped to main.
  var eventSink: ((PodverseMediaEngineEvent, [String: Any]) -> Void)?

  /// Notified on main whenever the current item's video capability changes (ready with video vs
  /// audio-only or torn down). Set by `PodverseVideoSurfaceHost` (2.16) so it can hide the surface
  /// for audio-only items without the engine importing UIKit. Visibility policy: 2.23 (prompt 03).
  var onVideoCapabilityChanged: ((Bool) -> Void)?

  private var currentItem: AVPlayerItem?
  private var nowPlaying = PodverseNowPlayingInfo()

  private var timeObserverToken: Any?
  private var statusObservation: NSKeyValueObservation?
  private var timeControlObservation: NSKeyValueObservation?

  private var remoteCommandsRegistered = false
  private var lastPublishedState: PodversePlaybackState = .idle

  private override init() {
    super.init()
    configureAudioSession()
    registerInterruptionAndRouteObservers()
    registerRemoteCommands()
    addTimeControlObservation()
    addPeriodicTimeObserver()
  }

  // MARK: - Shared surface access (step 2.14 / detail 093)

  /// Internal accessor for the single shared `AVPlayer` so the `PodverseVideoSurfaceHost` (2.16) can
  /// bind exactly one `AVPlayerLayer` to it. There is still one and only one `AVPlayer` for the
  /// process — video and audio items both play through this instance (no second player, no RN
  /// `<Video>`; see Track 11.18 anti-pattern).
  var sharedPlayer: AVPlayer { player }

  /// True when the current item exposes at least one video track. The surface host uses this to
  /// decide whether it has frames to present; the show/hide policy for audio-only items lands in
  /// 2.23 (prompt 03). Returns `false` before the item is ready or for audio-only enclosures.
  func currentItemHasVideoTracks() -> Bool {
    guard let item = currentItem else { return false }
    return item.tracks.contains { $0.assetTrack?.mediaType == .video }
  }

  // MARK: - Public transport API (called by the Expo module and future CarPlay scene)

  /// Replace the current item with `url` and optionally seek to `initialSeekSeconds`. Does not start
  /// playback. Rapid loads cancel the prior item cleanly by replacing it on the single player.
  ///
  /// Accepts remote http(s) URLs, `file://` URLs, and absolute filesystem paths (offline playback,
  /// 2.26) — all play through this one shared player, never a second player or RN `<Video>`. Missing
  /// local files fail fast with a `file_not_found` error (2.27) instead of hanging.
  func load(url: String, initialSeekSeconds: Double?) throws {
    guard let parsed = resolveSourceURL(url) else {
      let payload: [String: Any] = ["code": "invalid_url", "message": "Invalid URL: \(url)"]
      emit(.error, payload)
      throw NSError(
        domain: "PodverseMediaEngine", code: 1,
        userInfo: [NSLocalizedDescriptionKey: "Invalid URL: \(url)"])
    }

    if parsed.isFileURL, !FileManager.default.fileExists(atPath: parsed.path) {
      publish(state: .error)
      emit(.error, ["code": "file_not_found", "message": "File not found: \(parsed.path)"])
      throw NSError(
        domain: "PodverseMediaEngine", code: 2,
        userInfo: [NSLocalizedDescriptionKey: "File not found: \(parsed.path)"])
    }

    publish(state: .loading)

    // Drop per-item notification observers for the previous item before swapping (single-player,
    // replace-item lifecycle). The status KVO is invalidated by reassigning `statusObservation`.
    if let previous = currentItem {
      NotificationCenter.default.removeObserver(
        self, name: .AVPlayerItemDidPlayToEndTime, object: previous)
      NotificationCenter.default.removeObserver(
        self, name: .AVPlayerItemPlaybackStalled, object: previous)
    }

    let item = AVPlayerItem(url: parsed)
    observeItemStatus(item)
    observeItemEnd(item)
    observeItemStalled(item)

    // Placeholder now-playing metadata for the spike; queue-driven metadata lands with Track 10/11.
    nowPlaying = PodverseNowPlayingInfo(title: parsed.lastPathComponent, artist: nil)
    lastPublishedState = .loading
    currentItem = item
    onMain { [weak self] in
      guard let self = self else { return }
      self.player.replaceCurrentItem(with: item)
      if let seek = initialSeekSeconds, seek > 0 {
        let time = CMTime(seconds: seek, preferredTimescale: 1000)
        self.player.seek(to: time)
      }
      self.updateNowPlayingInfo()
    }
  }

  /// Convenience combining `load` + `play` (step 2.25 / detail 104). If `load` throws (invalid URL /
  /// missing file), the error is already emitted and playback does not start. Once the item is
  /// prepared, `play` is issued; the item may be prepared even if playback fails to begin.
  func loadAndStart(url: String, initialSeekSeconds: Double?) throws {
    try load(url: url, initialSeekSeconds: initialSeekSeconds)
    play()
  }

  /// Override the Now Playing title/artist for the current item (lock screen + CarPlay). The CarPlay
  /// browse scene (12.9) calls this right after `loadAndStart` so the car shows the cache entry's real
  /// title instead of the file name (`load` seeds a placeholder from `lastPathComponent`). Metadata
  /// only — it never creates a second `AVPlayer` or `MPRemoteCommandCenter`; the one shared command
  /// center from `registerRemoteCommands` still drives all transport.
  func setNowPlayingMetadata(title: String?, artist: String? = nil) {
    onMain { [weak self] in
      guard let self = self else { return }
      self.nowPlaying = PodverseNowPlayingInfo(title: title, artist: artist)
      self.updateNowPlayingInfo()
    }
  }

  func play() {
    onMain { [weak self] in
      guard let self = self else { return }
      self.activateAudioSession()
      self.player.play()
      self.updateNowPlayingElapsed()
    }
  }

  func pause() {
    onMain { [weak self] in
      guard let self = self else { return }
      self.player.pause()
      self.updateNowPlayingElapsed()
    }
  }

  /// Absolute seek in seconds; clamps to `[0, duration]` when a finite duration is known.
  func seek(seconds: Double) {
    onMain { [weak self] in
      guard let self = self else { return }
      let clamped = self.clampToDuration(seconds)
      let time = CMTime(seconds: clamped, preferredTimescale: 1000)
      self.player.seek(to: time) { [weak self] _ in
        self?.updateNowPlayingElapsed()
      }
    }
  }

  func setRate(_ rate: Double) {
    onMain { [weak self] in
      guard let self = self else { return }
      let value = Float(rate)
      self.player.rate = value
      if value > 0 {
        // Assigning a non-zero rate starts playback; keep now-playing in sync.
        self.updateNowPlayingElapsed()
      }
    }
  }

  /// Current playhead in seconds (`0` when unknown).
  func getPosition() -> Double {
    let seconds = player.currentTime().seconds
    return seconds.isFinite ? seconds : 0
  }

  /// Current item duration in seconds (`0` when unknown / not yet loaded / live).
  func getDuration() -> Double {
    guard let duration = player.currentItem?.duration else { return 0 }
    let seconds = duration.seconds
    return seconds.isFinite ? seconds : 0
  }

  /// Tear down the current item and observers. The shared player, audio-session configuration, and
  /// remote-command registration are intentionally KEPT so a future CarPlay scene can rebind without
  /// re-registering a competing command center or a second player.
  func destroy() {
    onMain { [weak self] in
      guard let self = self else { return }
      self.player.pause()
      self.player.replaceCurrentItem(with: nil)
      self.statusObservation = nil
      self.currentItem = nil
      self.clearNowPlayingInfo()
      self.deactivateAudioSession()
      self.publish(state: .idle)
      self.emitVideoCapability()
    }
  }

  // MARK: - Event forwarding

  private func emit(_ event: PodverseMediaEngineEvent, _ payload: [String: Any]) {
    onMain { [weak self] in
      self?.eventSink?(event, payload)
    }
  }

  private func publish(state: PodversePlaybackState) {
    lastPublishedState = state
    emit(.playbackState, ["state": state.rawValue])
  }

  /// Push the current video capability to the surface host (2.16). Hopped to main; safe no-op when
  /// no host is attached.
  private func emitVideoCapability() {
    let hasVideo = currentItemHasVideoTracks()
    onMain { [weak self] in
      self?.onVideoCapabilityChanged?(hasVideo)
    }
  }

  // MARK: - AVAudioSession (step 2.5)

  private func configureAudioSession() {
    do {
      // `.playback` allows background audio (UIBackgroundModes `audio` declared in app.config.ts).
      try AVAudioSession.sharedInstance().setCategory(.playback, mode: .spokenAudio)
    } catch {
      emit(.error, ["code": "audio_session", "message": error.localizedDescription])
    }
  }

  private func activateAudioSession() {
    do {
      try AVAudioSession.sharedInstance().setActive(true)
    } catch {
      emit(.error, ["code": "audio_session_activate", "message": error.localizedDescription])
    }
  }

  private func deactivateAudioSession() {
    // Notify others so ducked/paused apps can resume; ignore failures during teardown.
    try? AVAudioSession.sharedInstance().setActive(false, options: [.notifyOthersOnDeactivation])
  }

  private func registerInterruptionAndRouteObservers() {
    let center = NotificationCenter.default
    center.addObserver(
      self, selector: #selector(handleInterruption(_:)),
      name: AVAudioSession.interruptionNotification, object: nil)
    center.addObserver(
      self, selector: #selector(handleRouteChange(_:)),
      name: AVAudioSession.routeChangeNotification, object: nil)
  }

  /// Interruption policy: pause on `.began`; resume only when the system hints `.shouldResume`.
  @objc private func handleInterruption(_ notification: Notification) {
    guard
      let info = notification.userInfo,
      let typeValue = info[AVAudioSessionInterruptionTypeKey] as? UInt,
      let type = AVAudioSession.InterruptionType(rawValue: typeValue)
    else { return }

    switch type {
    case .began:
      pause()
    case .ended:
      if let optionsValue = info[AVAudioSessionInterruptionOptionKey] as? UInt {
        let options = AVAudioSession.InterruptionOptions(rawValue: optionsValue)
        if options.contains(.shouldResume) {
          play()
        }
      }
    @unknown default:
      break
    }
  }

  /// Route-change policy: pause when the previous output became unavailable (e.g. headphones
  /// unplugged) — matches typical podcast UX.
  @objc private func handleRouteChange(_ notification: Notification) {
    guard
      let info = notification.userInfo,
      let reasonValue = info[AVAudioSessionRouteChangeReasonKey] as? UInt,
      let reason = AVAudioSession.RouteChangeReason(rawValue: reasonValue)
    else { return }

    if reason == .oldDeviceUnavailable {
      pause()
    }
  }

  // MARK: - Now Playing + remote commands (step 2.6)

  private func updateNowPlayingInfo() {
    var info: [String: Any] = [:]
    info[MPMediaItemPropertyTitle] = nowPlaying.title ?? "Podverse"
    if let artist = nowPlaying.artist {
      info[MPMediaItemPropertyArtist] = artist
    }
    let duration = getDuration()
    if duration > 0 {
      info[MPMediaItemPropertyPlaybackDuration] = duration
    }
    info[MPNowPlayingInfoPropertyElapsedPlaybackTime] = getPosition()
    info[MPNowPlayingInfoPropertyPlaybackRate] = player.rate
    MPNowPlayingInfoCenter.default().nowPlayingInfo = info
  }

  private func updateNowPlayingElapsed() {
    var info = MPNowPlayingInfoCenter.default().nowPlayingInfo ?? [:]
    info[MPNowPlayingInfoPropertyElapsedPlaybackTime] = getPosition()
    info[MPNowPlayingInfoPropertyPlaybackRate] = player.rate
    MPNowPlayingInfoCenter.default().nowPlayingInfo = info
  }

  private func clearNowPlayingInfo() {
    MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
  }

  /// Register the ONE shared `MPRemoteCommandCenter`. CarPlay now-playing and remotes (12.9–12.10)
  /// must reuse this registration and this player — never add a second command center path.
  private func registerRemoteCommands() {
    guard !remoteCommandsRegistered else { return }
    remoteCommandsRegistered = true

    let center = MPRemoteCommandCenter.shared()

    center.playCommand.addTarget { [weak self] _ in
      self?.play()
      return .success
    }
    center.pauseCommand.addTarget { [weak self] _ in
      self?.pause()
      return .success
    }
    center.togglePlayPauseCommand.addTarget { [weak self] _ in
      guard let self = self else { return .commandFailed }
      if self.player.timeControlStatus == .paused {
        self.play()
      } else {
        self.pause()
      }
      return .success
    }
    center.changePlaybackPositionCommand.addTarget { [weak self] event in
      guard
        let self = self,
        let positionEvent = event as? MPChangePlaybackPositionCommandEvent
      else { return .commandFailed }
      self.seek(seconds: positionEvent.positionTime)
      return .success
    }
    center.skipForwardCommand.preferredIntervals = [30]
    center.skipForwardCommand.addTarget { [weak self] _ in
      guard let self = self else { return .commandFailed }
      self.seek(seconds: self.getPosition() + 30)
      return .success
    }
    center.skipBackwardCommand.preferredIntervals = [15]
    center.skipBackwardCommand.addTarget { [weak self] _ in
      guard let self = self else { return .commandFailed }
      self.seek(seconds: max(0, self.getPosition() - 15))
      return .success
    }
  }

  // MARK: - Observations / events

  private func addTimeControlObservation() {
    timeControlObservation = player.observe(\.timeControlStatus, options: [.new]) {
      [weak self] player, _ in
      guard let self = self else { return }
      switch player.timeControlStatus {
      case .paused:
        // `.paused` also fires at natural end; the `ended` notification publishes `.ended` separately.
        if self.lastPublishedState != .ended {
          self.publish(state: .paused)
        }
      case .waitingToPlayAtSpecifiedRate:
        self.publish(state: .stalled)
        self.emit(.stalled, ["positionSeconds": self.getPosition()])
      case .playing:
        self.publish(state: .playing)
      @unknown default:
        break
      }
    }
  }

  private func addPeriodicTimeObserver() {
    let interval = CMTime(seconds: 0.5, preferredTimescale: 1000)
    timeObserverToken = player.addPeriodicTimeObserver(forInterval: interval, queue: .main) {
      [weak self] _ in
      guard let self = self else { return }
      self.emit(
        .progress,
        [
          "positionSeconds": self.getPosition(),
          "durationSeconds": self.getDuration(),
        ])
    }
  }

  private func observeItemStatus(_ item: AVPlayerItem) {
    statusObservation = item.observe(\.status, options: [.new]) { [weak self] item, _ in
      guard let self = self else { return }
      switch item.status {
      case .readyToPlay:
        self.publish(state: .ready)
        self.updateNowPlayingInfo()
        self.emitVideoCapability()
      case .failed:
        let message = item.error?.localizedDescription ?? "Playback item failed"
        self.publish(state: .error)
        self.emit(.error, ["code": "item_failed", "message": message])
      default:
        break
      }
    }
  }

  private func observeItemEnd(_ item: AVPlayerItem) {
    NotificationCenter.default.addObserver(
      self, selector: #selector(handleItemEnded(_:)),
      name: .AVPlayerItemDidPlayToEndTime, object: item)
  }

  private func observeItemStalled(_ item: AVPlayerItem) {
    NotificationCenter.default.addObserver(
      self, selector: #selector(handleItemStalled(_:)),
      name: .AVPlayerItemPlaybackStalled, object: item)
  }

  @objc private func handleItemEnded(_ notification: Notification) {
    publish(state: .ended)
    emit(.ended, ["positionSeconds": getPosition()])
  }

  @objc private func handleItemStalled(_ notification: Notification) {
    publish(state: .stalled)
    emit(.stalled, ["positionSeconds": getPosition()])
  }

  // MARK: - Helpers

  /// Resolve a load `url` string into a `URL`, supporting remote http(s), `file://` URLs, and bare
  /// absolute filesystem paths (offline downloads, 2.26). Returns `nil` for unparseable input so the
  /// caller can emit `invalid_url`.
  private func resolveSourceURL(_ url: String) -> URL? {
    if url.hasPrefix("/") {
      return URL(fileURLWithPath: url)
    }
    return URL(string: url)
  }

  private func clampToDuration(_ seconds: Double) -> Double {
    let lower = max(0, seconds)
    let duration = getDuration()
    guard duration > 0 else { return lower }
    return min(lower, duration)
  }

  private func onMain(_ work: @escaping () -> Void) {
    if Thread.isMainThread {
      work()
    } else {
      DispatchQueue.main.async(execute: work)
    }
  }
}
