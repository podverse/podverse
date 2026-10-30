import AVFoundation
import Foundation
import MediaPlayer
import UIKit

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
  case sourceChanged
  case remoteTrackCommand
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
  var albumTitle: String?
  var artwork: MPMediaItemArtwork?
  var isLive: Bool = false
}

/// Item identity carried with a load so JS can adopt car-initiated playback.
struct PodverseSourceMeta {
  let idText: String
  let kind: String
  let queueMedium: String
  let title: String
  let subtitle: String?
  let albumTitle: String?
  let artworkUrl: String?
  let isLive: Bool
  let clipStartSeconds: Double?
  let clipEndSeconds: Double?
  let origin: String

  func asDictionary() -> [String: Any] {
    var dict: [String: Any] = [
      "idText": idText,
      "kind": kind,
      "queueMedium": queueMedium,
      "title": title,
      "origin": origin,
      "isLive": isLive,
    ]
    if let subtitle = subtitle { dict["subtitle"] = subtitle }
    if let albumTitle = albumTitle { dict["albumTitle"] = albumTitle }
    if let artworkUrl = artworkUrl { dict["artworkUrl"] = artworkUrl }
    if let clipStartSeconds = clipStartSeconds { dict["clipStartSeconds"] = clipStartSeconds }
    if let clipEndSeconds = clipEndSeconds { dict["clipEndSeconds"] = clipEndSeconds }
    return dict
  }

  static func parse(json: String?) -> PodverseSourceMeta? {
    guard let json = json, let data = json.data(using: .utf8),
      let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
      let idText = object["idText"] as? String, !idText.isEmpty,
      let kind = object["kind"] as? String,
      let queueMedium = object["queueMedium"] as? String,
      let title = object["title"] as? String, !title.isEmpty,
      let origin = object["origin"] as? String
    else { return nil }
    return PodverseSourceMeta(
      idText: idText,
      kind: kind,
      queueMedium: queueMedium,
      title: title,
      subtitle: object["subtitle"] as? String,
      albumTitle: object["albumTitle"] as? String,
      artworkUrl: object["artworkUrl"] as? String,
      isLive: (object["isLive"] as? Bool) ?? false,
      clipStartSeconds: object["clipStartSeconds"] as? Double,
      clipEndSeconds: object["clipEndSeconds"] as? Double,
      origin: origin
    )
  }
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
  let meta: PodverseSourceMeta?
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

  /// Clear the sink only when `owner` is still the current owner. With no sink nobody receives
  /// `ended` or `remoteTrackCommand`, so native takes advance back.
  func clearEventSink(owner: AnyObject) {
    onMain { [weak self] in
      guard let self = self else { return }
      guard self.eventSinkOwner === owner else { return }
      self.eventSinkOwner = nil
      self.eventSink = nil
      self.jsOwnsAdvance = false
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
  /// When true, JS owns queue advance on `ended`; native must not auto-advance.
  private var jsOwnsAdvance = false
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
  /// True once the current item has played since it was loaded or reconnected. `play()` applies the
  /// live resume rule only then, so a fresh paused load (cold-start restore) just starts.
  private var hasPlayedCurrentItem = false
  /// Live window presence the remote commands were last configured for. A live stream's seekable
  /// range and access log fill in after the item is ready, so progress samples re-check it.
  private var lastAppliedLiveWindowPresence: Bool?
  /// Clip end boundary in seconds; when set, playback completes at this position.
  private var clipEndSeconds: Double?
  /// Artwork URL whose async load is in flight (generation-guarded).
  private var artworkLoadGeneration: Int = 0
  /// Last wall-clock ms a progress journal row was written.
  private var lastJournalProgressAtMs: Int = 0

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
    audioProfile: PodverseAudioProfile? = nil, metaJson: String? = nil
  ) throws {
    try load(
      url: url, initialSeekSeconds: initialSeekSeconds, basicAuth: basicAuth,
      audioProfile: audioProfile, metaJson: metaJson, playWhenPrepared: false)
  }

  /// Convenience combining `load` + `play`. If `load` throws (invalid URL / missing file), the error
  /// is already emitted and playback does not start. When `initialSeekSeconds` is positive, `play`
  /// waits until that seek completes.
  func loadAndStart(
    url: String, initialSeekSeconds: Double?, basicAuth: ScopedBasicAuth? = nil,
    audioProfile: PodverseAudioProfile? = nil, metaJson: String? = nil
  ) throws {
    try load(
      url: url, initialSeekSeconds: initialSeekSeconds, basicAuth: basicAuth,
      audioProfile: audioProfile, metaJson: metaJson, playWhenPrepared: true)
  }

  private func load(
    url: String, initialSeekSeconds: Double?, basicAuth: ScopedBasicAuth?,
    audioProfile: PodverseAudioProfile?, metaJson: String?, playWhenPrepared: Bool
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
    hasPlayedCurrentItem = false
    lastAppliedLiveWindowPresence = nil

    // Drop per-item notification observers for the previous item before swapping (single-player,
    // replace-item lifecycle). The status KVO is invalidated by reassigning `statusObservation`.
    if let previous = currentItem {
      removeItemNotificationObservers(previous)
    }

    let item = makePlayerItem(url: parsed, basicAuth: basicAuth)
    observeItemStatus(item)
    observeItemEnd(item)
    observeItemStalled(item)

    let meta = PodverseSourceMeta.parse(json: metaJson)
    // Prefer caller meta; fall back to the URL file name until setNowPlayingMetadata runs.
    nowPlaying = PodverseNowPlayingInfo(
      title: meta?.title ?? parsed.lastPathComponent,
      artist: meta?.subtitle,
      albumTitle: meta?.albumTitle,
      artwork: nil,
      isLive: meta?.isLive ?? false
    )
    lastPublishedState = .loading
    currentItem = item
    loadedSource = PodverseLoadedSource(url: url, basicAuth: basicAuth, meta: meta)
    clipEndSeconds = meta?.clipEndSeconds
    onMain { [weak self] in
      guard let self = self else { return }
      guard generation == self.loadGeneration else { return }
      self.resumeAfterInterruption = false
      // loadAndStart (and any playWhenPrepared load) is an explicit play intent — clear a stuck
      // interruption so autoplay is not deferred forever after another app took the session
      // without delivering `.ended`.
      if playWhenPrepared {
        self.isInterrupted = false
      }
      if let profile = audioProfile {
        self.applyAudioProfile(profile)
      }
      self.player.replaceCurrentItem(with: item)
      self.updateNowPlayingInfo()
      self.applyRemoteCommandAvailability()
      if let artworkUrl = meta?.artworkUrl {
        self.loadArtwork(urlString: artworkUrl, generation: generation)
      }
      var payload: [String: Any] = ["url": url]
      if let meta = meta {
        payload["meta"] = meta.asDictionary()
      } else {
        payload["meta"] = NSNull()
      }
      self.emit(.sourceChanged, payload)
      self.appendJournal(eventKind: "started", positionSeconds: seek > 0 ? seek : 0)
      if playWhenPrepared, seek <= 0 {
        self.startLoadedItem()
      } else if item.status == .readyToPlay {
        self.completePendingInitialSeek(generation: generation)
      }
    }
  }

  /// Build the item for `url`. A credentialed remote item answers in-scope 401 challenges through
  /// `PodverseMediaAuthLoaderDelegate`, retained in `authLoaderDelegate` while the item is loaded.
  private func makePlayerItem(url: URL, basicAuth: ScopedBasicAuth?) -> AVPlayerItem {
    if let auth = basicAuth, !url.isFileURL {
      let asset = AVURLAsset(url: url)
      let delegate = PodverseMediaAuthLoaderDelegate(auth: auth)
      asset.resourceLoader.setDelegate(delegate, queue: authLoaderQueue)
      authLoaderDelegate = delegate
      return AVPlayerItem(asset: asset)
    }
    authLoaderDelegate = nil
    return AVPlayerItem(url: url)
  }

  /// Main-thread only. Reconnect the loaded source on the same player: a fresh item for the same
  /// URL and credentials, keeping the source meta and now-playing info. A progressive live stream
  /// then plays what is live now instead of the buffer it kept while paused. Emits no
  /// `sourceChanged` and writes no journal row; JS sees `loading` then `ready` as with any load.
  private func reloadCurrentItem(playWhenReady: Bool) {
    guard let source = loadedSource, let url = resolveSourceURL(source.url) else { return }
    if let previous = currentItem {
      removeItemNotificationObservers(previous)
    }
    loadGeneration += 1
    pendingInitialSeekSeconds = nil
    playAfterPendingSeek = false
    hasPlayedCurrentItem = false
    lastAppliedLiveWindowPresence = nil
    let item = makePlayerItem(url: url, basicAuth: source.basicAuth)
    observeItemStatus(item)
    observeItemEnd(item)
    observeItemStalled(item)
    currentItem = item
    publish(state: .loading)
    player.replaceCurrentItem(with: item)
    if playWhenReady {
      startLoadedItem()
    }
  }

  private func appendJournal(eventKind: String, positionSeconds: Double) {
    guard let source = loadedSource, let meta = source.meta else { return }
    var entry: [String: Any] = [
      "accountIdText": PodverseNativeCache.accountIdTextFromContext() as Any,
      "idText": meta.idText,
      "kind": meta.kind,
      "queueMedium": meta.queueMedium,
      "positionSeconds": positionSeconds,
      "durationSeconds": getDuration(),
      "eventKind": eventKind,
      "origin": meta.origin,
    ]
    if PodverseNativeCache.accountIdTextFromContext() == nil {
      entry["accountIdText"] = NSNull()
    }
    PodverseNativeCache.appendJournalEntry(entry)
  }

  /// Current loaded source for JS adoption / restore. Nil when nothing is loaded. Read on main,
  /// because the live window comes from the current item.
  func getCurrentSource() -> [String: Any]? {
    if !Thread.isMainThread {
      return DispatchQueue.main.sync { self.getCurrentSource() }
    }
    guard let source = loadedSource else { return nil }
    var payload: [String: Any] = [
      "url": source.url,
      "positionSeconds": getPosition(),
      "durationSeconds": getDuration(),
      // Play intent, so a source still buffering after a car start reads as playing.
      "isPlaying": player.timeControlStatus != .paused || playAfterPendingSeek,
      "isLive": isLiveSourceLoaded,
      "liveWindow": liveWindowPayload(currentLiveWindow()),
    ]
    if let meta = source.meta {
      payload["meta"] = meta.asDictionary()
    } else {
      payload["meta"] = NSNull()
    }
    return payload
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

  /// Override the Now Playing title, artist, and album for the current item (lock screen + CarPlay).
  /// The CarPlay browse scene calls this right after `loadAndStart` so the car shows the cache
  /// entry's real title instead of the file name (`load` seeds a value from `lastPathComponent`).
  /// Metadata only — it never creates a second `AVPlayer` or `MPRemoteCommandCenter`; the one
  /// shared command center from `registerRemoteCommands` still drives all transport.
  func setNowPlayingMetadata(title: String?, artist: String? = nil, albumTitle: String? = nil) {
    onMain { [weak self] in
      guard let self = self else { return }
      self.nowPlaying = PodverseNowPlayingInfo(title: title, artist: artist, albumTitle: albumTitle)
      self.updateNowPlayingInfo()
    }
  }

  func play() {
    onMain { [weak self] in
      guard let self = self else { return }
      // Explicit play (lock screen, CarPlay, JS) clears a stuck interruption flag — another media
      // app can take the session without delivering `.ended`, which would otherwise leave every
      // later start deferred forever.
      self.isInterrupted = false
      self.resumeAfterInterruption = false
      if self.isLiveSourceLoaded, self.hasPlayedCurrentItem,
        self.player.timeControlStatus == .paused
      {
        self.resumeLiveSource()
        return
      }
      self.startPlayer()
    }
  }

  /// Main-thread only. Resume a paused live source that has already played. In place while the
  /// stream still holds the paused moment with `liveWindowStartMarginSeconds` to spare past the
  /// window start; otherwise jump to the live edge, or reconnect a stream that holds no history.
  private func resumeLiveSource() {
    guard let window = currentLiveWindow() else {
      reloadCurrentItem(playWhenReady: true)
      return
    }
    let position = player.currentTime().seconds
    if position.isFinite, position >= window.start + Self.liveWindowStartMarginSeconds {
      startPlayer()
      return
    }
    seekToLiveEdge(window.liveEdge) {
      self.startPlayer()
    }
  }

  /// Jump to the live point of a live source and play: seek to the live edge when the stream holds
  /// a window, otherwise reconnect. No-op for a non-live source. During an interruption the start
  /// waits for it to end, like any other start.
  func goToLive() {
    onMain { [weak self] in
      guard let self = self, self.isLiveSourceLoaded else { return }
      guard let window = self.currentLiveWindow() else {
        self.reloadCurrentItem(playWhenReady: true)
        return
      }
      self.seekToLiveEdge(window.liveEdge) {
        self.updateNowPlayingElapsed()
        self.emitProgress()
        self.startLoadedItem()
      }
    }
  }

  /// Main-thread only. Seek to `liveEdge`, then run `completion` on main unless a load or reconnect
  /// replaced the item in the meantime.
  private func seekToLiveEdge(_ liveEdge: Double, completion: @escaping () -> Void) {
    let generation = loadGeneration
    let time = CMTime(seconds: liveEdge, preferredTimescale: 1000)
    player.seek(to: time, toleranceBefore: .zero, toleranceAfter: .zero) { [weak self] _ in
      self?.onMain {
        guard let self = self, generation == self.loadGeneration else { return }
        completion()
      }
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
  /// waits for the interruption to end rather than competing with the call or alarm. If the session
  /// can be activated again (stuck flag after another app took audio without `.ended`), clear the
  /// flag and start; only defer when activation still fails.
  private func startLoadedItem() {
    if isInterrupted {
      do {
        try AVAudioSession.sharedInstance().setActive(true)
        isInterrupted = false
      } catch {
        resumeAfterInterruption = true
        return
      }
    }
    resumeAfterInterruption = false
    startPlayer()
  }

  /// Main-thread only. Shared by `pause()` and the interruption and route-change handlers.
  private func pausePlayer() {
    player.pause()
    updateNowPlayingElapsed()
    appendJournal(eventKind: "paused", positionSeconds: getPosition())
  }

  /// Absolute seek in seconds; clamps to `[0, duration]` when a finite duration is known. A live
  /// source clamps into its window instead, and does not seek when it holds no window.
  func seek(seconds: Double) {
    onMain { [weak self] in
      guard let self = self else { return }
      let clamped: Double
      if self.isLiveSourceLoaded {
        guard let window = self.currentLiveWindow() else { return }
        clamped = min(max(seconds, window.start), window.liveEdge)
      } else {
        clamped = self.clampToDuration(seconds)
      }
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
    guard !isLiveSourceLoaded else { return 0 }
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
        // Play intent: already playing, waiting to play after seek, or a load asked to autoplay
        // once ready. Reading only `timeControlStatus` misses a pending autoplay.
        let wasPlaying =
          self.player.timeControlStatus != .paused
          || self.playAfterPendingSeek
          || self.resumeAfterInterruption
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
  /// at its playhead so the listener can press play instead of force-quitting the app. A live
  /// source reloads at live, because its saved position does not survive the new item's timeline.
  @objc private func handleMediaServicesReset(_ notification: Notification) {
    onMain { [weak self] in
      guard let self = self else { return }
      let position: Double? = self.isLiveSourceLoaded ? nil : self.getPosition()
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
      let albumTitle = self.nowPlaying.albumTitle
      do {
        try self.load(
          url: source.url, initialSeekSeconds: position, basicAuth: source.basicAuth,
          audioProfile: nil, metaJson: nil, playWhenPrepared: false)
        self.setNowPlayingMetadata(title: title, artist: artist, albumTitle: albumTitle)
      } catch {
        // `load` already emitted the error for JS.
      }
    }
  }

  /// Main-thread only. Replace the invalidated player and move every player-scoped observer to the
  /// new one. Remote command handlers read `self.player`, so they follow without re-registering.
  private func rebuildPlayer() {
    if let previous = currentItem {
      removeItemNotificationObservers(previous)
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
    if let albumTitle = nowPlaying.albumTitle {
      info[MPMediaItemPropertyAlbumTitle] = albumTitle
    }
    if let artwork = nowPlaying.artwork {
      info[MPMediaItemPropertyArtwork] = artwork
    }
    info[MPNowPlayingInfoPropertyIsLiveStream] = nowPlaying.isLive
    let duration = getDuration()
    if duration > 0, !nowPlaying.isLive {
      info[MPMediaItemPropertyPlaybackDuration] = duration
    }
    info[MPNowPlayingInfoPropertyElapsedPlaybackTime] = getPosition()
    info[MPNowPlayingInfoPropertyPlaybackRate] = player.rate
    MPNowPlayingInfoCenter.default().nowPlayingInfo = info
  }

  private func loadArtwork(urlString: String, generation: Int) {
    artworkLoadGeneration = generation
    guard let url = URL(string: urlString) else { return }
    URLSession.shared.dataTask(with: url) { [weak self] data, _, _ in
      guard let self = self, let data = data, let image = UIImage(data: data) else { return }
      let artwork = MPMediaItemArtwork(boundsSize: image.size) { _ in image }
      self.onMain {
        guard generation == self.artworkLoadGeneration, generation == self.loadGeneration else {
          return
        }
        self.nowPlaying.artwork = artwork
        self.updateNowPlayingInfo()
      }
    }.resume()
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
    center.nextTrackCommand.addTarget { [weak self] _ in
      guard let self = self else { return .commandFailed }
      self.handleRemoteTrackCommand("next")
      return .success
    }
    center.previousTrackCommand.addTarget { [weak self] _ in
      guard let self = self else { return .commandFailed }
      self.handleRemoteTrackCommand("previous")
      return .success
    }
    applyRemoteCommandAvailability()
  }

  /// Music offers track skips; podcasts and everything else offer the time skips. The car and lock
  /// screen show one pair or the other, so the pair follows the loaded source. A live source with
  /// no window cannot seek, so it offers neither time skips nor the scrubber. Main-thread only.
  private func applyRemoteCommandAvailability() {
    let center = MPRemoteCommandCenter.shared()
    let isMusic = loadedSource?.meta?.queueMedium == "music"
    let hasLiveWindow = currentLiveWindow() != nil
    let isLiveWithoutWindow = isLiveSourceLoaded && !hasLiveWindow
    lastAppliedLiveWindowPresence = hasLiveWindow
    center.nextTrackCommand.isEnabled = isMusic
    center.previousTrackCommand.isEnabled = isMusic
    center.skipForwardCommand.isEnabled = !isMusic && !isLiveWithoutWindow
    center.skipBackwardCommand.isEnabled = !isMusic && !isLiveWithoutWindow
    center.changePlaybackPositionCommand.isEnabled = !isLiveWithoutWindow
  }

  /// Previous restarts a track that is more than a few seconds in. Otherwise the phone's queue
  /// decides while JS is running, and the advance window then the projected queue snapshot do
  /// when it is not.
  private func handleRemoteTrackCommand(_ command: String) {
    onMain { [weak self] in
      guard let self = self else { return }
      if command == "previous", self.getPosition() > 3 {
        self.seek(seconds: 0)
        return
      }
      if self.jsOwnsAdvance {
        self.emit(.remoteTrackCommand, ["command": command])
        return
      }
      if command == "next" {
        self.advanceToNextCachedItem()
      } else {
        // The projected snapshot holds only what comes next, so previous restarts the track.
        self.seek(seconds: 0)
      }
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
        self.hasPlayedCurrentItem = true
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
      let position = self.getPosition()
      if let clipEnd = self.clipEndSeconds, clipEnd > 0, position >= clipEnd {
        self.clipEndSeconds = nil
        self.pausePlayer()
        self.appendJournal(eventKind: "completed", positionSeconds: position)
        self.publish(state: .ended)
        self.emit(.ended, ["positionSeconds": position])
        if !self.jsOwnsAdvance {
          self.advanceToNextCachedItem()
        }
        return
      }
      let nowMs = Int(Date().timeIntervalSince1970 * 1000)
      if self.player.timeControlStatus == .playing, nowMs - self.lastJournalProgressAtMs >= 15_000 {
        self.lastJournalProgressAtMs = nowMs
        self.appendJournal(eventKind: "progress", positionSeconds: position)
      }
      self.emitProgress()
    }
  }

  /// Emit one `progress` sample. Every sample carries the live fields, and a change in live window
  /// presence re-applies the remote commands.
  private func emitProgress() {
    onMain { [weak self] in
      guard let self = self else { return }
      let window = self.currentLiveWindow()
      if self.lastAppliedLiveWindowPresence != (window != nil) {
        self.applyRemoteCommandAvailability()
      }
      self.emit(
        .progress,
        [
          "positionSeconds": self.getPosition(),
          "durationSeconds": self.getDuration(),
          "isLive": self.isLiveSourceLoaded,
          "liveWindow": self.liveWindowPayload(window),
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
        self.emitProgress()
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

  /// A paused live source resumes in place only at or past the window start plus this margin,
  /// which covers the start moving forward while paused or seeking. Must equal
  /// `LIVE_WINDOW_START_MARGIN_SECONDS` in `@podverse/playback-core`;
  /// `liveWindowStartMargin.ios.test.ts` checks it.
  private static let liveWindowStartMarginSeconds: Double = 6

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

  private func removeItemNotificationObservers(_ item: AVPlayerItem) {
    NotificationCenter.default.removeObserver(
      self, name: .AVPlayerItemDidPlayToEndTime, object: item)
    NotificationCenter.default.removeObserver(
      self, name: .AVPlayerItemPlaybackStalled, object: item)
  }

  func setJsOwnsAdvance(_ owns: Bool) {
    onMain { self.jsOwnsAdvance = owns }
  }

  @objc private func handleItemEnded(_ notification: Notification) {
    let position = getPosition()
    appendJournal(eventKind: "completed", positionSeconds: position)
    publish(state: .ended)
    emit(.ended, ["positionSeconds": position])
    if !jsOwnsAdvance {
      advanceToNextCachedItem()
    }
  }

  /// Advance when JS is not listening: the advance window first, then the projected queue
  /// snapshot. Both lists are play order written by JS; this only steps to the next row.
  private func advanceToNextCachedItem() {
    let medium = loadedSource?.meta?.queueMedium ?? "av"
    let currentId = loadedSource?.meta?.idText
    let currentKind = loadedSource?.meta?.kind ?? "item"
    switch advanceWindowStep(currentId: currentId, currentKind: currentKind, medium: medium) {
    case .play(let next):
      startNativeAdvance(next, medium: medium)
      return
    case .end:
      return
    case .notInWindow:
      break
    }
    let kind: PodverseNativeCacheKind = medium == "music" ? .queueMusic : .queueAv
    let snapshot = PodverseCarPlayCacheModel.parseQueueSnapshot(PodverseNativeCache.read(kind))
    guard !snapshot.entries.isEmpty else { return }
    let startIndex: Int = {
      guard let currentId = currentId,
        let idx = snapshot.entries.firstIndex(where: { $0.idText == currentId })
      else { return 0 }
      return idx + 1
    }()
    guard startIndex < snapshot.entries.count else { return }
    startNativeAdvance(snapshot.entries[startIndex], medium: medium)
  }

  private enum AdvanceWindowStep {
    case play(PodverseCarPlayCacheModel.QueueEntry)
    /// The current row is the window's last; playback stops where it is.
    case end
    /// No usable window, or it belongs to another item; the queue snapshot decides.
    case notInWindow
  }

  /// Locate the current row in `advance-window.json` by `kind` plus `idText`. `.end` must not fall
  /// through to the snapshot walk, which would replay an older item from the snapshot's start.
  private func advanceWindowStep(currentId: String?, currentKind: String, medium: String)
    -> AdvanceWindowStep
  {
    guard
      let window = PodverseCarPlayCacheModel.parseAdvanceWindow(
        PodverseNativeCache.read(.advanceWindow)),
      let currentId = currentId,
      window.mediumBucket == medium
    else { return .notInWindow }
    let entries = window.entries
    if currentKind == window.anchorKind, currentId == window.anchorIdText {
      guard let first = entries.first else { return .end }
      return .play(first)
    }
    guard
      let index = entries.firstIndex(where: { $0.kind == currentKind && $0.idText == currentId })
    else { return .notInWindow }
    let nextIndex = index + 1
    guard nextIndex < entries.count else { return .end }
    return .play(entries[nextIndex])
  }

  /// Load and play one cached row as a car-origin source. Rows are plain media URLs or local
  /// downloads, so no credentials are attached. A clip or soundbite row carries its range in the
  /// meta, and the periodic observer ends it at `clipEndSeconds`.
  private func startNativeAdvance(_ next: PodverseCarPlayCacheModel.QueueEntry, medium: String) {
    guard let url = resolveQueuePlayableURL(next) else { return }
    var meta: [String: Any] = [
      "idText": next.idText,
      "kind": next.kind,
      "queueMedium": medium,
      "title": next.title,
      "origin": "car",
      "isLive": false,
    ]
    if let clipStartSeconds = next.clipStartSeconds { meta["clipStartSeconds"] = clipStartSeconds }
    if let clipEndSeconds = next.clipEndSeconds { meta["clipEndSeconds"] = clipEndSeconds }
    let metaJson =
      (try? JSONSerialization.data(withJSONObject: meta)).flatMap {
        String(data: $0, encoding: .utf8)
      }
    let seek = next.startPositionSeconds ?? next.clipStartSeconds
    do {
      try loadAndStart(
        url: url, initialSeekSeconds: seek, basicAuth: nil, audioProfile: nil, metaJson: metaJson)
    } catch {
      NSLog("[engine] native advance failed: %@", error.localizedDescription)
    }
  }

  private func resolveQueuePlayableURL(_ entry: PodverseCarPlayCacheModel.QueueEntry) -> String? {
    if let downloadName = entry.downloadFileName, !downloadName.isEmpty {
      // Relative download file under Documents/downloads.
      if let documents = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)
        .first
      {
        let fileName =
          downloadName.hasPrefix("downloads/")
          ? String(downloadName.dropFirst("downloads/".count)) : downloadName
        let url = documents.appendingPathComponent("downloads", isDirectory: true)
          .appendingPathComponent(fileName, isDirectory: false)
        if FileManager.default.fileExists(atPath: url.path) {
          return url.absoluteString
        }
      }
    }
    if let mediaUrl = entry.mediaUrl, !mediaUrl.isEmpty { return mediaUrl }
    return nil
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

  /// The load meta marked the source live. Liveness is never guessed from the stream.
  private var isLiveSourceLoaded: Bool {
    loadedSource?.meta?.isLive == true
  }

  /// Main-thread only. The part of the live source the player can still play, in the player's
  /// timeline, with the live edge held back by the stream's recommended offset from live. `nil`
  /// when not live, before the item has a seekable range, and for progressive streams (access log
  /// `FILE`), which can report a buffered span but stay live-only.
  private func currentLiveWindow() -> (start: Double, liveEdge: Double)? {
    guard isLiveSourceLoaded, let item = player.currentItem else { return nil }
    if item.accessLog()?.events.last?.playbackType == "FILE" {
      return nil
    }
    for value in item.seekableTimeRanges.reversed() {
      let range = value.timeRangeValue
      let start = range.start.seconds
      let end = CMTimeRangeGetEnd(range).seconds
      guard start.isFinite, end.isFinite, end > start else { continue }
      let offsetSeconds = item.recommendedTimeOffsetFromLive.seconds
      let offset = offsetSeconds.isFinite && offsetSeconds > 0 ? offsetSeconds : 0
      return (start, max(start, end - offset))
    }
    return nil
  }

  private func liveWindowPayload(_ window: (start: Double, liveEdge: Double)?) -> Any {
    guard let window = window else { return NSNull() }
    return ["startSeconds": window.start, "liveEdgeSeconds": window.liveEdge]
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
