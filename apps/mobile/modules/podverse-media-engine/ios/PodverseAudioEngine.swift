import AVFoundation
import Foundation
import MediaPlayer

// This is the single, process-wide audio engine. It owns the one `AVPlayer`, the one
// `AVAudioSession` configuration, and the one `MPRemoteCommandCenter` registration for phone, lock
// screen, and CarPlay now-playing. CarPlay binds now-playing to `PodverseAudioEngine.shared`
// WITHOUT starting the JS runtime — do not require the RN bridge to be alive, and do not add a
// second player or command center.
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

/// Now-playing metadata supplied with a load. Fields are optional.
struct PodverseNowPlayingInfo {
  var title: String?
  var artist: String?
}

/// How the system treats this audio when something else needs the speaker. Matches the TS
/// `MediaEngineAudioProfile`.
enum PodverseAudioProfile: String {
  /// Podcasts and other speech. Spoken interruptions (navigation prompts) pause, then resume.
  case spoken
  /// Navigation prompts duck the volume instead of pausing.
  case music
  case video

  var sessionMode: AVAudioSession.Mode {
    switch self {
    case .spoken: return .spokenAudio
    case .music: return .default
    case .video: return .moviePlayback
    }
  }
}

/// What the engine last loaded, so it can rebuild the item after the media services reset.
private struct PodverseLoadedSource {
  let url: String
  let basicAuth: ScopedBasicAuth?
}

/// Process-wide shared audio engine. Access via `PodverseAudioEngine.shared`.
///
/// This singleton is intentionally independent of the Expo module lifecycle: CarPlay can reference
/// `PodverseAudioEngine.shared` to render now-playing and issue transport commands even when the JS
/// runtime has not started. The Expo module registers an event sink (owner-scoped) to
/// forward events to JS while it is alive; when JS is absent, the engine still plays and updates the
/// lock screen / car now-playing.
public final class PodverseAudioEngine: NSObject {
  /// The one and only engine instance for the process.
  @objc public static let shared = PodverseAudioEngine()

  /// The single shared player. Do not create parallel `AVPlayer` instances anywhere in the app.
  /// Replaced only when the media services reset, which invalidates every existing `AVPlayer`.
  private var player = AVPlayer()

  /// Sink that forwards events to JS. Set by the Expo module while it is alive; `nil` when the JS
  /// runtime is not running (e.g. a CarPlay-only launch). Reads/writes are hopped to main.
  ///
  /// Ownership is keyed so a Fast Refresh / reload cannot let a dying module's `OnDestroy` clear
  /// the sink that a newer module instance already installed.
  private var eventSink: ((PodverseMediaEngineEvent, [String: Any]) -> Void)?
  private weak var eventSinkOwner: AnyObject?

  /// Install `sink` for `owner`. A later `clearEventSink(owner:)` from a different owner is a no-op.
  func setEventSink(
    _ sink: @escaping (PodverseMediaEngineEvent, [String: Any]) -> Void, owner: AnyObject
  ) {
    onMain { [weak self] in
      guard let self = self else { return }
      self.eventSinkOwner = owner
      self.eventSink = sink
    }
  }

  /// Clear the sink only when `owner` is still the current owner.
  func clearEventSink(owner: AnyObject) {
    onMain { [weak self] in
      guard let self = self else { return }
      guard self.eventSinkOwner === owner else { return }
      self.eventSinkOwner = nil
      self.eventSink = nil
    }
  }

  /// Notified on main whenever the current item's video capability changes (ready with video vs
  /// audio-only or torn down). Set by `PodverseVideoSurfaceHost` so it can hide the surface for
  /// audio-only items without the engine importing UIKit.
  var onVideoCapabilityChanged: ((Bool) -> Void)?

  /// Notified on main with the new player after a media services reset, so the surface host can
  /// bind its one `AVPlayerLayer` to it.
  var onPlayerReplaced: ((AVPlayer) -> Void)?

  private var currentItem: AVPlayerItem?
  private var loadedSource: PodverseLoadedSource?
  private var audioProfile: PodverseAudioProfile = .spoken
  /// Set when an interruption paused audio that was playing. Only then does the end of the
  /// interruption resume, so a call never starts something the listener had paused.
  private var resumeAfterInterruption = false
  /// True between an interruption's `.began` and `.ended`. Main-thread only.
  private var isInterrupted = false
  private var nowPlaying = PodverseNowPlayingInfo()
  /// `AVAssetResourceLoader` holds its delegate weakly, so the current protected item's delegate is
  /// retained here for as long as that item is loaded. `nil` for items without credentials.
  private var authLoaderDelegate: PodverseMediaAuthLoaderDelegate?
  private let authLoaderQueue = DispatchQueue(label: "com.podverse.media-engine.auth-loader")

  private var timeObserverToken: Any?
  private var statusObservation: NSKeyValueObservation?
  private var timeControlObservation: NSKeyValueObservation?

  private var remoteCommandsRegistered = false
  private var lastPublishedState: PodversePlaybackState = .idle
  /// Rate to apply on the next `play()`. Assigning `AVPlayer.rate` while paused starts playback, so
  /// `setRate` stores here until the user (or `loadAndStart`) actually plays.
  private var pendingRate: Float = 1.0
  /// Bumped on every load so a seek completion from a replaced item cannot start playback.
  private var loadGeneration: Int = 0
  /// Applied once the current item is ready. `nil` when the load starts at the beginning.
  private var pendingInitialSeekSeconds: Double?
  /// Start playback only after `pendingInitialSeekSeconds` finishes.
  private var playAfterPendingSeek = false

  private override init() {
    super.init()
    configureAudioSession()
    registerInterruptionAndRouteObservers()
    registerRemoteCommands()
    addTimeControlObservation()
    addPeriodicTimeObserver()
  }

  // MARK: - Shared surface access

  /// Internal accessor for the single shared `AVPlayer` so the `PodverseVideoSurfaceHost` can
  /// bind exactly one `AVPlayerLayer` to it. There is still one and only one `AVPlayer` for the
  /// process — video and audio items both play through this instance (no second player, no RN
  /// `<Video>`).
  var sharedPlayer: AVPlayer { player }

  /// True when the current item exposes at least one video track. The surface host uses this to
  /// decide whether it has frames to present; the show/hide policy applies to audio-only items.
  /// Returns `false` before the item is ready or for audio-only enclosures.
  func currentItemHasVideoTracks() -> Bool {
    guard let item = currentItem else { return false }
    return item.tracks.contains { $0.assetTrack?.mediaType == .video }
  }

  // MARK: - Public transport API (called by the Expo module and CarPlay scene)

  /// Replace the current item with `url` and optionally seek to `initialSeekSeconds`. Does not start
  /// playback unless `playWhenPrepared` is set. Rapid loads cancel the prior item cleanly by
  /// replacing it on the single player.
  ///
  /// A positive `initialSeekSeconds` is applied only after the item is ready to play, and playback
  /// starts only after that seek finishes, so the new source does not begin at the start of the file.
  ///
  /// Accepts remote http(s) URLs, `file://` URLs, and absolute filesystem paths (offline playback) —
  /// all play through this one shared player, never a second player or RN `<Video>`. Missing local
  /// files fail fast with a `file_not_found` error instead of hanging.
  ///
  /// `basicAuth` (protected add-by-RSS media) is answered only to in-scope 401 challenges through
  /// `PodverseMediaAuthLoaderDelegate`; it is ignored for local files.
  ///
  /// `audioProfile` sets the session mode for this item; `nil` keeps the last one applied.
  func load(
    url: String, initialSeekSeconds: Double?, basicAuth: ScopedBasicAuth? = nil,
    audioProfile: PodverseAudioProfile? = nil
  ) throws {
    try load(
      url: url, initialSeekSeconds: initialSeekSeconds, basicAuth: basicAuth,
      audioProfile: audioProfile, playWhenPrepared: false)
  }

  /// Convenience combining `load` + `play`. If `load` throws (invalid URL / missing file), the error
  /// is already emitted and playback does not start. When `initialSeekSeconds` is positive, `play`
  /// waits until that seek completes.
  func loadAndStart(
    url: String, initialSeekSeconds: Double?, basicAuth: ScopedBasicAuth? = nil,
    audioProfile: PodverseAudioProfile? = nil
  ) throws {
    try load(
      url: url, initialSeekSeconds: initialSeekSeconds, basicAuth: basicAuth,
      audioProfile: audioProfile, playWhenPrepared: true)
  }

  private func load(
    url: String, initialSeekSeconds: Double?, basicAuth: ScopedBasicAuth?,
    audioProfile: PodverseAudioProfile?, playWhenPrepared: Bool
  ) throws {
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

    loadGeneration += 1
    let generation = loadGeneration
    let seek = initialSeekSeconds ?? 0
    pendingInitialSeekSeconds = seek > 0 ? seek : nil
    playAfterPendingSeek = playWhenPrepared && seek > 0

    // Drop per-item notification observers for the previous item before swapping (single-player,
    // replace-item lifecycle). The status KVO is invalidated by reassigning `statusObservation`.
    if let previous = currentItem {
      NotificationCenter.default.removeObserver(
        self, name: .AVPlayerItemDidPlayToEndTime, object: previous)
      NotificationCenter.default.removeObserver(
        self, name: .AVPlayerItemPlaybackStalled, object: previous)
    }

    let item: AVPlayerItem
    if let auth = basicAuth, !parsed.isFileURL {
      let asset = AVURLAsset(url: parsed)
      let delegate = PodverseMediaAuthLoaderDelegate(auth: auth)
      asset.resourceLoader.setDelegate(delegate, queue: authLoaderQueue)
      authLoaderDelegate = delegate
      item = AVPlayerItem(asset: asset)
    } else {
      authLoaderDelegate = nil
      item = AVPlayerItem(url: parsed)
    }
    observeItemStatus(item)
    observeItemEnd(item)
    observeItemStalled(item)

    // Seed now-playing metadata from the source URL until the caller supplies item metadata.
    nowPlaying = PodverseNowPlayingInfo(title: parsed.lastPathComponent, artist: nil)
    lastPublishedState = .loading
    currentItem = item
    loadedSource = PodverseLoadedSource(url: url, basicAuth: basicAuth)
    onMain { [weak self] in
      guard let self = self else { return }
      guard generation == self.loadGeneration else { return }
      self.resumeAfterInterruption = false
      if let profile = audioProfile {
        self.applyAudioProfile(profile)
      }
      self.player.replaceCurrentItem(with: item)
      self.updateNowPlayingInfo()
      if playWhenPrepared, seek <= 0 {
        self.startLoadedItem()
      } else if item.status == .readyToPlay {
        self.completePendingInitialSeek(generation: generation)
      }
    }
  }

  /// Seek to the pending position once the loaded item is the current player item, then start if
  /// this load asked to. A status callback that arrives before `replaceCurrentItem` leaves the
  /// pending seek in place for the replace turn.
  private func completePendingInitialSeek(generation: Int) {
    onMain { [weak self] in
      guard let self = self else { return }
      guard generation == self.loadGeneration else { return }
      guard self.player.currentItem === self.currentItem else { return }
      guard let seek = self.pendingInitialSeekSeconds, seek > 0 else {
        if self.playAfterPendingSeek {
          self.playAfterPendingSeek = false
          self.startLoadedItem()
        }
        return
      }
      self.pendingInitialSeekSeconds = nil
      let shouldPlay = self.playAfterPendingSeek
      self.playAfterPendingSeek = false
      let time = CMTime(seconds: seek, preferredTimescale: 1000)
      self.player.seek(to: time, toleranceBefore: .zero, toleranceAfter: .zero) { [weak self] _ in
        guard let self = self else { return }
        guard generation == self.loadGeneration else { return }
        self.updateNowPlayingElapsed()
        if shouldPlay {
          self.onMain { self.startLoadedItem() }
        }
      }
    }
  }

  /// Override the Now Playing title/artist for the current item (lock screen + CarPlay). The CarPlay
  /// browse scene calls this right after `loadAndStart` so the car shows the cache entry's real title
  /// instead of the file name (`load` seeds a value from `lastPathComponent`). Metadata
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
      self.resumeAfterInterruption = false
      self.startPlayer()
    }
  }

  func pause() {
    onMain { [weak self] in
      guard let self = self else { return }
      self.resumeAfterInterruption = false
      self.pausePlayer()
    }
  }

  /// Main-thread only. Shared by `play()` and the interruption resume.
  private func startPlayer() {
    activateAudioSession()
    player.play()
    if pendingRate > 0, pendingRate != 1 {
      player.rate = pendingRate
    }
    updateNowPlayingElapsed()
  }

  /// Main-thread only. Starts an item a load asked to autoplay. During an interruption the start
  /// waits for the interruption to end rather than competing with the call or alarm.
  private func startLoadedItem() {
    if isInterrupted {
      resumeAfterInterruption = true
      return
    }
    resumeAfterInterruption = false
    startPlayer()
  }

  /// Main-thread only. Shared by `pause()` and the interruption and route-change handlers.
  private func pausePlayer() {
    player.pause()
    updateNowPlayingElapsed()
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
      self.pendingRate = value > 0 ? value : 1.0
      // Assigning a non-zero `rate` while paused starts playback. Cold-start restore loads then
      // applies the last rate; only write `player.rate` when already playing.
      if self.player.timeControlStatus == .playing, value > 0 {
        self.player.rate = value
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
  /// remote-command registration remain available so a CarPlay scene can rebind without
  /// re-registering a competing command center or a second player.
  func destroy() {
    onMain { [weak self] in
      guard let self = self else { return }
      self.player.pause()
      self.player.replaceCurrentItem(with: nil)
      self.statusObservation = nil
      self.currentItem = nil
      self.loadedSource = nil
      self.resumeAfterInterruption = false
      self.authLoaderDelegate = nil
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

  /// Push the current video capability to the surface host. Hopped to main; safe no-op when
  /// no host is attached.
  private func emitVideoCapability() {
    let hasVideo = currentItemHasVideoTracks()
    onMain { [weak self] in
      self?.onVideoCapabilityChanged?(hasVideo)
    }
  }

  // MARK: - AVAudioSession

  private func configureAudioSession() {
    do {
      // `.playback` allows background audio (UIBackgroundModes `audio` declared in app.config.ts).
      try AVAudioSession.sharedInstance().setCategory(.playback, mode: audioProfile.sessionMode)
    } catch {
      emit(.error, ["code": "audio_session", "message": error.localizedDescription])
    }
  }

  /// Main-thread only. Switches the session mode when the next item is a different medium.
  private func applyAudioProfile(_ profile: PodverseAudioProfile) {
    guard profile != audioProfile else { return }
    audioProfile = profile
    configureAudioSession()
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
    center.addObserver(
      self, selector: #selector(handleMediaServicesReset(_:)),
      name: AVAudioSession.mediaServicesWereResetNotification, object: nil)
  }

  /// Interruption policy (calls, Siri, alarms, another app, spoken navigation prompts): pause on
  /// `.began`. On `.ended`, resume only when audio was playing when the interruption began AND the
  /// system hints `.shouldResume`. A listener who paused before the call stays paused.
  @objc private func handleInterruption(_ notification: Notification) {
    guard
      let info = notification.userInfo,
      let typeValue = info[AVAudioSessionInterruptionTypeKey] as? UInt,
      let type = AVAudioSession.InterruptionType(rawValue: typeValue)
    else { return }

    switch type {
    case .began:
      // Delivered late for a session that was idle while the app was suspended. Nothing was
      // playing, so there is nothing to pause or resume.
      if let reasonValue = info[AVAudioSessionInterruptionReasonKey] as? UInt,
        AVAudioSession.InterruptionReason(rawValue: reasonValue) == .appWasSuspended
      {
        return
      }
      onMain { [weak self] in
        guard let self = self else { return }
        let wasPlaying = self.player.timeControlStatus != .paused || self.playAfterPendingSeek
        self.playAfterPendingSeek = false
        self.isInterrupted = true
        self.resumeAfterInterruption = wasPlaying
        self.pausePlayer()
      }
    case .ended:
      var shouldResume = false
      if let optionsValue = info[AVAudioSessionInterruptionOptionKey] as? UInt {
        shouldResume = AVAudioSession.InterruptionOptions(rawValue: optionsValue)
          .contains(.shouldResume)
      }
      onMain { [weak self] in
        guard let self = self else { return }
        let resume = self.resumeAfterInterruption && shouldResume
        self.isInterrupted = false
        self.resumeAfterInterruption = false
        if resume {
          self.startPlayer()
        }
      }
    @unknown default:
      break
    }
  }

  /// The media server restarted, which invalidates the session configuration and every `AVPlayer`
  /// and `AVPlayerItem`. Rebuild the player, reapply the session, and reload the last source paused
  /// at its playhead so the listener can press play instead of force-quitting the app.
  @objc private func handleMediaServicesReset(_ notification: Notification) {
    onMain { [weak self] in
      guard let self = self else { return }
      let position = self.getPosition()
      let source = self.loadedSource
      self.isInterrupted = false
      self.resumeAfterInterruption = false
      self.rebuildPlayer()
      self.configureAudioSession()
      guard let source = source else {
        self.currentItem = nil
        self.clearNowPlayingInfo()
        self.publish(state: .idle)
        return
      }
      let title = self.nowPlaying.title
      let artist = self.nowPlaying.artist
      do {
        try self.load(
          url: source.url, initialSeekSeconds: position, basicAuth: source.basicAuth,
          audioProfile: nil, playWhenPrepared: false)
        self.setNowPlayingMetadata(title: title, artist: artist)
      } catch {
        // `load` already emitted the error for JS.
      }
    }
  }

  /// Main-thread only. Replace the invalidated player and move every player-scoped observer to the
  /// new one. Remote command handlers read `self.player`, so they follow without re-registering.
  private func rebuildPlayer() {
    if let previous = currentItem {
      NotificationCenter.default.removeObserver(
        self, name: .AVPlayerItemDidPlayToEndTime, object: previous)
      NotificationCenter.default.removeObserver(
        self, name: .AVPlayerItemPlaybackStalled, object: previous)
    }
    if let token = timeObserverToken {
      player.removeTimeObserver(token)
      timeObserverToken = nil
    }
    timeControlObservation = nil
    statusObservation = nil
    authLoaderDelegate = nil
    player = AVPlayer()
    addTimeControlObservation()
    addPeriodicTimeObserver()
    onPlayerReplaced?(player)
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

  // MARK: - Now Playing + remote commands

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

  /// Register the ONE shared `MPRemoteCommandCenter`. CarPlay now-playing and remotes
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
        self.completePendingInitialSeek(generation: self.loadGeneration)
        // One progress sample as soon as the item is prepared so JS gets duration before the
        // periodic observer's next tick (and while paused with no autoplay).
        self.emit(
          .progress,
          [
            "positionSeconds": self.getPosition(),
            "durationSeconds": self.getDuration(),
          ])
      case .failed:
        self.pendingInitialSeekSeconds = nil
        self.playAfterPendingSeek = false
        self.publish(state: .error)
        self.emit(.error, self.itemFailurePayload(item))
      default:
        break
      }
    }
  }

  /// Bound on the underlying-error walk, in case a chain is cyclic.
  private static let maxErrorCauseDepth = 8

  /// `item_failed` plus, when available, the host's HTTP status (`httpStatus`), the URL that
  /// failed (`url`), and the NSError chain and last error-log entry (`detail`). Media is fetched
  /// from the creator's own server, so the status is what tells support whose side failed.
  private func itemFailurePayload(_ item: AVPlayerItem) -> [String: Any] {
    let message = item.error?.localizedDescription ?? "Playback item failed"
    var payload: [String: Any] = ["code": "item_failed", "message": message]
    var detailParts: [String] = []

    var nsError = item.error.map { $0 as NSError }
    var depth = 0
    while let current = nsError, depth < Self.maxErrorCauseDepth {
      detailParts.append("\(current.domain) \(current.code)")
      if payload["httpStatus"] == nil, let reason = current.localizedFailureReason,
        let status = Self.httpStatus(in: reason)
      {
        payload["httpStatus"] = status
      }
      if let failingUrl = current.userInfo[NSURLErrorFailingURLStringErrorKey] as? String {
        payload["url"] = failingUrl
      }
      nsError = current.userInfo[NSUnderlyingErrorKey] as? NSError
      depth += 1
    }

    if let event = item.errorLog()?.events.last {
      var eventParts = ["\(event.errorDomain) \(event.errorStatusCode)"]
      if let comment = event.errorComment, !comment.isEmpty {
        eventParts.append(comment)
        if payload["httpStatus"] == nil, let status = Self.httpStatus(in: comment) {
          payload["httpStatus"] = status
        }
      }
      if payload["httpStatus"] == nil, (100...599).contains(event.errorStatusCode) {
        payload["httpStatus"] = event.errorStatusCode
      }
      if let uri = event.uri, !uri.isEmpty {
        payload["url"] = uri
      }
      detailParts.append(eventParts.joined(separator: ": "))
    }

    if !detailParts.isEmpty {
      payload["detail"] = detailParts.joined(separator: " · ")
    }
    return payload
  }

  /// Reads `HTTP 404` style text from an error-log comment or failure reason.
  private static func httpStatus(in text: String) -> Int? {
    guard let range = text.range(of: #"HTTP (\d{3})"#, options: .regularExpression) else {
      return nil
    }
    return Int(text[range].dropFirst("HTTP ".count))
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
  /// absolute filesystem paths (offline downloads). Returns `nil` for unparseable input so the
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
