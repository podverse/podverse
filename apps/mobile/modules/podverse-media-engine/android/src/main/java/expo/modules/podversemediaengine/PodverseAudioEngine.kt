package expo.modules.podversemediaengine

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Handler
import android.os.Looper
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.PlaybackException
import androidx.media3.common.PlaybackParameters
import androidx.media3.common.Player
import androidx.media3.common.Timeline
import androidx.media3.common.VideoSize
import androidx.media3.common.util.UnstableApi
import org.json.JSONObject
import androidx.media3.datasource.DefaultDataSource
import androidx.media3.datasource.HttpDataSource
import androidx.media3.datasource.okhttp.OkHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.exoplayer.source.MediaSource
import android.view.TextureView
import java.io.File
import java.util.concurrent.CountDownLatch
import okhttp3.OkHttpClient

// This is the single, process-wide audio engine. It owns the one Media3 ExoPlayer for phone, lock
// screen, and Android Auto now-playing. The MediaLibraryService (PodverseMediaLibraryService) wraps
// THIS player in the one MediaSession so Android Auto binds to the same instance without a second
// player/session. The Auto browse tree reads from the native cache; JS never owns the tree.
// Do NOT create parallel players and do NOT use react-native-track-player.
object PodverseAudioEngine {
  /**
   * Sink that forwards events to JS. Set by the Expo module while it is alive; `null` when the JS
   * runtime is not running (e.g. an Auto-only launch). The engine still plays and updates the
   * media notification without JS.
   *
   * Ownership is keyed so a Fast Refresh / reload cannot let a dying module's `OnDestroy` clear
   * the sink that a newer module instance already installed.
   */
  private var eventSink: ((String, Map<String, Any?>) -> Unit)? = null
  private var eventSinkOwner: Any? = null

  /** Bound on the cause walk in [playbackErrorPayload], in case a chain is cyclic. */
  private const val MAX_ERROR_CAUSE_DEPTH = 8

  /** Install [sink] for [owner]. A later [clearEventSink] from a different owner is a no-op. */
  fun setEventSink(sink: (String, Map<String, Any?>) -> Unit, owner: Any) {
    onMain {
      eventSinkOwner = owner
      eventSink = sink
    }
  }

  /**
   * Clear the sink only when [owner] is still the current owner. With no sink nobody receives
   * `ended` or `remoteTrackCommand`, so advance returns to native.
   */
  fun clearEventSink(owner: Any) {
    onMain {
      if (eventSinkOwner !== owner) {
        return@onMain
      }
      eventSinkOwner = null
      eventSink = null
      jsOwnsAdvance = false
    }
  }

  /**
   * Notified on the main thread whenever the current item's video capability changes (video frames
   * available vs audio-only). Set by [PodverseVideoSurfaceHost] so it can keep the surface hidden for
   * audio-only items without the engine depending on the host.
   */
  var onVideoCapabilityChanged: ((Boolean) -> Unit)? = null

  /** Width and height of the current video frame, or 0 when the item has no video. */
  var onVideoSizeChanged: ((Int, Int) -> Unit)? = null

  /** Fired when ExoPlayer's playing flag changes. */
  var onPlaybackPlayingChanged: ((Boolean) -> Unit)? = null

  private var player: ExoPlayer? = null
  private var appContext: Context? = null
  /** Shared pool for protected-media loads; each load derives a client with its own authenticator. */
  private var authBaseHttpClient: OkHttpClient? = null
  private val mainHandler = Handler(Looper.getMainLooper())
  private var progressPosting = false
  private var lastState: String = PlaybackState.IDLE
  /** Bumped on every load so a ready callback from a replaced item cannot start playback. */
  private var loadGeneration: Int = 0
  /** When this equals [loadGeneration], start playback once the item reports ready (after a seek). */
  private var playWhenReadyGeneration: Int = -1
  /** Last loaded URL + optional meta for JS adoption. */
  private var loadedUrl: String? = null
  private var loadedMeta: Map<String, Any?>? = null
  /** Credentials of the loaded source, so a live reconnect answers the same challenge. */
  private var loadedBasicAuth: ScopedBasicAuth? = null
  /** True once the loaded item has played; a live `play()` applies the resume rule only then. */
  private var hasPlayedCurrentItem: Boolean = false
  /** Reused for main-thread timeline reads. */
  private val timelineWindow = Timeline.Window()
  /** When true, JS owns queue advance on ended; native must not auto-advance. */
  @Volatile private var jsOwnsAdvance: Boolean = false
  private var clipEndSeconds: Double? = null
  private var lastJournalProgressAtMs: Long = 0L

  private object PlaybackState {
    const val IDLE = "idle"
    const val LOADING = "loading"
    const val READY = "ready"
    const val PLAYING = "playing"
    const val PAUSED = "paused"
    const val STALLED = "stalled"
    const val ENDED = "ended"
    const val ERROR = "error"
  }

  /**
   * Return the single shared player, creating it on the main thread if needed. The
   * MediaLibraryService and the Expo module both obtain the player through this method so there is
   * exactly one ExoPlayer for the process.
   */
  fun getOrCreatePlayer(context: Context): ExoPlayer {
    return onMainSync {
      appContext = context.applicationContext
      player
        ?: ExoPlayer.Builder(context.applicationContext).build().also { exo ->
          // Route to the media stream and request audio focus. Without USAGE_MEDIA, progress can
          // advance while the emulator/device produces no audible output (especially vs iOS).
          // Media3 owns focus: a call or alarm pauses and resumes, another media app pauses for
          // good, and a navigation prompt ducks or pauses depending on the content type.
          exo.setAudioAttributes(audioAttributesFor(audioProfile), /* handleAudioFocus= */ true)
          // Headphones unplugged or Bluetooth (including a car) disconnected: pause rather than
          // continue out of the phone speaker.
          exo.setHandleAudioBecomingNoisy(true)
          // Keep the CPU and Wi-Fi awake while streaming with the screen off. Requires WAKE_LOCK.
          exo.setWakeMode(C.WAKE_MODE_NETWORK)
          exo.volume = 1f
          exo.addListener(playerListener)
          player = exo
        }
    }
  }

  /**
   * How the OS treats this audio when something else needs the speaker. Matches the TS
   * `MediaEngineAudioProfile`. Media3 pauses on a duckable focus loss only for
   * `AUDIO_CONTENT_TYPE_SPEECH`, so podcasts pause for a navigation prompt while music ducks.
   */
  enum class AudioProfile(val wireValue: String, val contentType: Int) {
    SPOKEN("spoken", C.AUDIO_CONTENT_TYPE_SPEECH),
    MUSIC("music", C.AUDIO_CONTENT_TYPE_MUSIC),
    VIDEO("video", C.AUDIO_CONTENT_TYPE_MOVIE);

    companion object {
      fun fromWireValue(value: String?): AudioProfile? = entries.firstOrNull { it.wireValue == value }
    }
  }

  private var audioProfile: AudioProfile = AudioProfile.SPOKEN

  private fun audioAttributesFor(profile: AudioProfile): AudioAttributes =
    AudioAttributes.Builder()
      .setUsage(C.USAGE_MEDIA)
      .setContentType(profile.contentType)
      .build()

  /** Main-thread only. Switches the attributes when the next item is a different medium. */
  private fun applyAudioProfile(p: ExoPlayer, profile: AudioProfile) {
    if (profile == audioProfile) return
    audioProfile = profile
    p.setAudioAttributes(audioAttributesFor(profile), /* handleAudioFocus= */ true)
  }

  // MARK: - Shared video surface

  /**
   * Bind the ONE video texture view (owned by [PodverseVideoSurfaceHost]) to the single shared
   * ExoPlayer. Media3 decodes video for the current item; frames render only once a surface is
   * attached. TextureView (not SurfaceView) is required so the host can reparent the same view
   * between mini/full RN targets without `IllegalStateException: child already has a parent`
   * (SurfaceView has a separate compositor window and does not reparent cleanly during modal
   * fragment transitions). There is never a second player — audio and video items use this instance.
   */
  fun attachVideoTextureView(view: android.view.TextureView) {
    onMain { getOrCreatePlayer(view.context).setVideoTextureView(view) }
  }

  /** Detach the video surface (audio keeps playing on the same player). */
  fun clearVideoSurfaceView() {
    onMain { player?.clearVideoSurface() }
  }

  /** True when the current item exposes video (non-unknown video size). Used by the surface host. */
  fun currentItemHasVideo(): Boolean = onMainSync {
    player?.videoSize?.let { it != VideoSize.UNKNOWN && it.width > 0 && it.height > 0 } ?: false
  }

  // MARK: - Transport (called by the Expo module; the service reuses the same player)

  /**
   * Prepare [url] on the single shared player. Accepts remote http(s), `file://`, and `content://`
   * sources (offline playback) — Media3 [MediaItem.fromUri] handles all three; there is never
   * a second player for local files. Missing `file://` targets fail fast with a `file_not_found`
   * error instead of surfacing a late/opaque decode failure.
   *
   * A positive [initialSeekSeconds] is the media item's start position, and playback waits until
   * the player is ready so audio does not begin at the start of the file and then jump.
   *
   * [basicAuth] (protected add-by-RSS media) routes the remote load through OkHttp with a
   * [ScopedBasicAuthenticator]; without it the player's default data source is used unchanged.
   *
   * [audioProfile] sets the audio attributes for this item; `null` keeps the last one applied.
   */
  fun load(
    context: Context,
    url: String,
    initialSeekSeconds: Double?,
    basicAuth: ScopedBasicAuth? = null,
    audioProfile: AudioProfile? = null,
    metaJson: String? = null,
  ) {
    prepareSource(
      context, url, initialSeekSeconds, basicAuth, audioProfile, metaJson, playWhenPrepared = false)
  }

  /**
   * Atomic load + play. When [initialSeekSeconds] is positive, play starts from the ready callback
   * after the start position is applied. Otherwise play is issued on the same main-thread turn as
   * prepare.
   */
  fun loadAndStart(
    context: Context,
    url: String,
    initialSeekSeconds: Double?,
    basicAuth: ScopedBasicAuth? = null,
    audioProfile: AudioProfile? = null,
    metaJson: String? = null,
  ) {
    prepareSource(
      context, url, initialSeekSeconds, basicAuth, audioProfile, metaJson, playWhenPrepared = true)
  }

  fun getCurrentSource(): Map<String, Any?>? = onMainSync {
    val url = loadedUrl ?: return@onMainSync null
    mapOf("url" to url, "meta" to loadedMeta) +
      progressPayloadUnsafe() +
      // Play intent, so a source still buffering after a car start reads as playing.
      mapOf("isPlaying" to (player?.playWhenReady == true))
  }

  fun setJsOwnsAdvance(owns: Boolean) {
    onMain { jsOwnsAdvance = owns }
  }

  /** Main-thread only. True when the loaded source belongs to the Music queue. */
  fun isMusicSourceLoaded(): Boolean = (loadedMeta?.get("queueMedium") as? String) == "music"

  /** Main-thread only. True when the loaded source's meta marks it live. */
  fun isLiveSourceLoaded(): Boolean = loadedMeta?.get("isLive") == true

  /**
   * Track skip from the car, a headset, or the media notification. Previous restarts a track that
   * is more than a few seconds in. Otherwise the phone's queue decides while JS is running, and the
   * advance window, then the projected queue snapshot, does when it is not.
   */
  fun handleRemoteTrackCommand(command: String) {
    onMain {
      val p = player ?: return@onMain
      if (command == "previous" && p.currentPosition > PREVIOUS_RESTARTS_AFTER_MS) {
        p.seekTo(0)
        return@onMain
      }
      if (jsOwnsAdvance) {
        emit("remoteTrackCommand", mapOf("command" to command))
        return@onMain
      }
      if (command == "next") {
        advanceToNextCachedItem()
      } else {
        // The projected snapshot holds only what comes next, so previous restarts the track.
        p.seekTo(0)
      }
    }
  }

  private const val PREVIOUS_RESTARTS_AFTER_MS = 3_000L

  /**
   * A paused live position at least this far after the window start resumes in place; anything
   * earlier jumps to live. Must equal `LIVE_WINDOW_START_MARGIN_SECONDS` (in seconds) in
   * `@podverse/playback-core`; `liveWindowStartMargin.android.test.ts` checks it.
   */
  private const val LIVE_WINDOW_START_MARGIN_MS = 6_000L

  /** Result of looking up the loaded item in `advance-window.json`. */
  private sealed interface AdvanceWindowStep {
    data class Play(val entry: PodverseNativeCacheModel.QueueEntry) : AdvanceWindowStep

    /** The loaded item is the window's last row (or the anchor of an empty window): stop. */
    data object End : AdvanceWindowStep

    /** The window is missing or belongs to another item; the queue snapshot decides. */
    data object NotInWindow : AdvanceWindowStep
  }

  /**
   * Main-thread only. Advance with JS not running: the advance window JS resolved comes first,
   * then the account queue snapshot. Native only steps through those lists in order.
   */
  private fun advanceToNextCachedItem() {
    val ctx = appContext ?: return
    val medium = (loadedMeta?.get("queueMedium") as? String) ?: "av"
    val currentId = loadedMeta?.get("idText") as? String
    val currentKind = (loadedMeta?.get("kind") as? String) ?: "item"
    when (val step = advanceWindowStep(ctx, currentId, currentKind, medium)) {
      is AdvanceWindowStep.Play -> {
        startNativeAdvance(ctx, step.entry, medium)
        return
      }
      AdvanceWindowStep.End -> return
      AdvanceWindowStep.NotInWindow -> Unit
    }
    val kind =
      if (medium == "music") PodverseNativeCacheKind.QUEUE_MUSIC else PodverseNativeCacheKind.QUEUE_AV
    val snapshot = PodverseNativeCacheModel.parseQueueSnapshot(PodverseNativeCache.read(ctx, kind))
    if (snapshot.entries.isEmpty()) return
    val startIndex =
      if (currentId == null) 0
      else {
        val idx = snapshot.entries.indexOfFirst { it.idText == currentId }
        if (idx < 0) 0 else idx + 1
      }
    if (startIndex >= snapshot.entries.size) return
    startNativeAdvance(ctx, snapshot.entries[startIndex], medium)
  }

  /**
   * Window rows match on kind plus id, so a clip and its full episode are different rows. The
   * anchor matches on the window's anchor kind and id.
   */
  private fun advanceWindowStep(
    ctx: Context,
    currentId: String?,
    currentKind: String,
    medium: String,
  ): AdvanceWindowStep {
    val window =
      PodverseNativeCacheModel.parseAdvanceWindow(
        PodverseNativeCache.read(ctx, PodverseNativeCacheKind.ADVANCE_WINDOW))
        ?: return AdvanceWindowStep.NotInWindow
    if (currentId == null || window.mediumBucket != medium) return AdvanceWindowStep.NotInWindow
    val entries = window.entries
    if (currentKind == window.anchorKind && currentId == window.anchorIdText) {
      return entries.firstOrNull()?.let { AdvanceWindowStep.Play(it) } ?: AdvanceWindowStep.End
    }
    val index = entries.indexOfFirst { it.kind == currentKind && it.idText == currentId }
    if (index < 0) return AdvanceWindowStep.NotInWindow
    return entries.getOrNull(index + 1)?.let { AdvanceWindowStep.Play(it) } ?: AdvanceWindowStep.End
  }

  /**
   * Load [next] from a native advance: the download when its file exists, else the remote URL.
   * Entries carry plain URLs only, so there is no Basic Auth. A clip or soundbite carries its range
   * in the meta, which stops playback at the clip end.
   */
  private fun startNativeAdvance(
    ctx: Context,
    next: PodverseNativeCacheModel.QueueEntry,
    medium: String,
  ) {
    val uri =
      when {
        !next.downloadFileName.isNullOrBlank() -> {
          val fileName =
            if (next.downloadFileName!!.startsWith("downloads/"))
              next.downloadFileName!!.removePrefix("downloads/")
            else next.downloadFileName!!
          val file = File(ctx.filesDir, "downloads/$fileName")
          if (file.exists()) Uri.fromFile(file).toString() else next.mediaUrl
        }
        else -> next.mediaUrl
      } ?: return
    val metaJson =
      JSONObject()
        .put("idText", next.idText)
        .put("kind", next.kind)
        .put("queueMedium", medium)
        .put("title", next.title)
        .put("origin", "car")
        .put("isLive", false)
        .apply {
          next.artworkUrl?.let { put("artworkUrl", it) }
          next.clipStartSeconds?.let { put("clipStartSeconds", it) }
          next.clipEndSeconds?.let { put("clipEndSeconds", it) }
        }
        .toString()
    loadAndStart(
      ctx, uri, next.startPositionSeconds ?: next.clipStartSeconds, null, null, metaJson)
  }

  @androidx.annotation.OptIn(UnstableApi::class)
  private fun authenticatedMediaSource(
    context: Context,
    item: MediaItem,
    auth: ScopedBasicAuth,
  ): MediaSource {
    val base = authBaseHttpClient ?: OkHttpClient().also { authBaseHttpClient = it }
    val client = base.newBuilder().authenticator(ScopedBasicAuthenticator(auth)).build()
    val dataSourceFactory =
      DefaultDataSource.Factory(context.applicationContext, OkHttpDataSource.Factory(client))
    return DefaultMediaSourceFactory(dataSourceFactory).createMediaSource(item)
  }

  @androidx.annotation.OptIn(UnstableApi::class)
  private fun prepareSource(
    context: Context,
    url: String,
    initialSeekSeconds: Double?,
    basicAuth: ScopedBasicAuth?,
    audioProfile: AudioProfile?,
    metaJson: String?,
    playWhenPrepared: Boolean,
  ) {
    onMain {
      if (isMissingLocalFile(url)) {
        playWhenReadyGeneration = -1
        publish(PlaybackState.ERROR)
        emit("error", mapOf("code" to "file_not_found", "message" to "File not found: $url"))
        return@onMain
      }
      val generation = ++loadGeneration
      val seekSeconds = initialSeekSeconds ?: 0.0
      val hasSeek = seekSeconds > 0
      playWhenReadyGeneration = if (playWhenPrepared && hasSeek) generation else -1
      val p = getOrCreatePlayer(context)
      audioProfile?.let { applyAudioProfile(p, it) }
      publish(PlaybackState.LOADING)
      val meta = parseSourceMeta(metaJson)
      loadedUrl = url
      loadedMeta = meta
      loadedBasicAuth = basicAuth
      hasPlayedCurrentItem = false
      clipEndSeconds = (meta?.get("clipEndSeconds") as? Number)?.toDouble()
      val item = buildMediaItem(url, meta)
      val startMs = (seekSeconds * 1000).toLong()
      if (basicAuth != null && isRemoteUrl(url)) {
        val source = authenticatedMediaSource(context, item, basicAuth)
        if (hasSeek) p.setMediaSource(source, startMs) else p.setMediaSource(source)
      } else if (hasSeek) {
        p.setMediaItem(item, startMs)
      } else {
        p.setMediaItem(item)
      }
      p.prepare()
      emit("sourceChanged", mapOf("url" to url, "meta" to meta))
      appendJournal(context, "started", if (hasSeek) seekSeconds else 0.0)
      if (playWhenPrepared && !hasSeek) {
        startPlayback(context, p)
      }
    }
  }

  private fun appendJournal(context: Context, eventKind: String, positionSeconds: Double) {
    val meta = loadedMeta ?: return
    val idText = meta["idText"] as? String ?: return
    PodverseNativeCache.appendJournalEntry(
      context,
      mapOf(
        "accountIdText" to PodverseNativeCache.accountIdTextFromContext(context),
        "idText" to idText,
        "kind" to (meta["kind"] ?: "item"),
        "queueMedium" to (meta["queueMedium"] ?: "av"),
        "positionSeconds" to positionSeconds,
        "durationSeconds" to getDurationUnsafe(),
        "eventKind" to eventKind,
        "origin" to (meta["origin"] ?: "js"),
      ),
    )
  }

  private fun parseSourceMeta(metaJson: String?): Map<String, Any?>? {
    if (metaJson.isNullOrBlank()) return null
    return try {
      val obj = JSONObject(metaJson)
      val idText = obj.optString("idText", "")
      val title = obj.optString("title", "")
      if (idText.isBlank() || title.isBlank()) return null
      mapOf(
        "idText" to idText,
        "kind" to obj.optString("kind", "item"),
        "queueMedium" to obj.optString("queueMedium", "av"),
        "title" to title,
        "subtitle" to obj.optString("subtitle").takeIf { it.isNotBlank() },
        "albumTitle" to obj.optString("albumTitle").takeIf { it.isNotBlank() },
        "artworkUrl" to obj.optString("artworkUrl").takeIf { it.isNotBlank() },
        "isLive" to obj.optBoolean("isLive", false),
        "clipStartSeconds" to
          if (obj.has("clipStartSeconds") && !obj.isNull("clipStartSeconds")) {
            obj.optDouble("clipStartSeconds")
          } else null,
        "clipEndSeconds" to
          if (obj.has("clipEndSeconds") && !obj.isNull("clipEndSeconds")) {
            obj.optDouble("clipEndSeconds")
          } else null,
        "origin" to obj.optString("origin", "js"),
      )
    } catch (_: Exception) {
      null
    }
  }

  private fun buildMediaItem(url: String, meta: Map<String, Any?>?): MediaItem {
    val builder = MediaItem.Builder().setUri(url)
    val idText = meta?.get("idText") as? String
    if (!idText.isNullOrBlank()) {
      builder.setMediaId(idText)
    }
    if (meta != null) {
      val metadataBuilder =
        MediaMetadata.Builder()
          .setTitle(meta["title"] as? String ?: "Podverse")
          .setIsBrowsable(false)
          .setIsPlayable(true)
      (meta["subtitle"] as? String)?.let { metadataBuilder.setArtist(it) }
      (meta["albumTitle"] as? String)?.let { metadataBuilder.setAlbumTitle(it) }
      (meta["artworkUrl"] as? String)?.let { metadataBuilder.setArtworkUri(Uri.parse(it)) }
      if (meta["isLive"] == true) {
        metadataBuilder.setIsBrowsable(false)
        metadataBuilder.setMediaType(MediaMetadata.MEDIA_TYPE_RADIO_STATION)
      }
      builder.setMediaMetadata(metadataBuilder.build())
    }
    return builder.build()
  }

  private fun startPlayback(context: Context, p: ExoPlayer) {
    // Start playback first, then bring up MediaLibraryService as a *regular* service.
    // Do NOT use startForegroundService here: Media3 only calls Service.startForeground() once
    // playback is ongoing / the media notification is posted. Calling startForegroundService
    // before that races the OS timeout and crashes with
    // ForegroundServiceDidNotStartInTimeException (and can leave audio silent after restart).
    p.playWhenReady = true
    p.play()
    val app = context.applicationContext
    app.startService(Intent(app, PodverseMediaLibraryService::class.java))
  }

  /**
   * Start or resume playback. A live source that has already played resumes where it paused only
   * when the window still holds that moment with [LIVE_WINDOW_START_MARGIN_MS] to spare; otherwise
   * it jumps to live, and a stream with no window reconnects. The session player routes
   * notification, headset, and Android Auto play here for live sources.
   */
  fun play(context: Context) {
    onMain {
      val p = getOrCreatePlayer(context)
      if (isLiveSourceLoaded() && hasPlayedCurrentItem && !p.isPlaying) {
        if (currentLiveWindowUnsafe(p) == null) {
          reconnectCurrentSource(context, playWhenReady = true)
          return@onMain
        }
        // currentPosition is measured from the window start, so it is negative once the window
        // has slid past the paused point.
        if (p.currentPosition < LIVE_WINDOW_START_MARGIN_MS) {
          p.seekToDefaultPosition()
        }
      }
      startPlayback(context, p)
    }
  }

  /**
   * Jump to the live point of a live source and play. With a window, seeks to the live edge;
   * without one, reconnects so playback starts at what is live now. No-op when not live.
   */
  fun goToLive(context: Context) {
    onMain {
      if (!isLiveSourceLoaded()) return@onMain
      val p = getOrCreatePlayer(context)
      if (currentLiveWindowUnsafe(p) == null) {
        reconnectCurrentSource(context, playWhenReady = true)
        return@onMain
      }
      p.seekToDefaultPosition()
      emit("progress", progressPayloadUnsafe())
      startPlayback(context, p)
    }
  }

  /**
   * Main-thread only. Re-prepare the loaded source on the same player so a live stream restarts at
   * what is live now. Keeps the URL, meta, and credentials; emits no `sourceChanged` and writes no
   * `started` journal row.
   */
  @androidx.annotation.OptIn(UnstableApi::class)
  private fun reconnectCurrentSource(context: Context, playWhenReady: Boolean) {
    val url = loadedUrl ?: return
    val p = getOrCreatePlayer(context)
    loadGeneration += 1
    playWhenReadyGeneration = -1
    hasPlayedCurrentItem = false
    val item = buildMediaItem(url, loadedMeta)
    val auth = loadedBasicAuth
    if (auth != null && isRemoteUrl(url)) {
      p.setMediaSource(authenticatedMediaSource(context, item, auth))
    } else {
      p.setMediaItem(item)
    }
    p.prepare()
    // Published after the swap: replacing a playing stream reports `paused` from the listener.
    publish(PlaybackState.LOADING)
    if (playWhenReady) {
      startPlayback(context, p)
    }
  }

  fun pause() {
    onMain {
      val ctx = appContext
      if (ctx != null) {
        appendJournal(ctx, "paused", getPositionUnsafe())
      }
      player?.pause()
    }
  }

  /**
   * Absolute seek in seconds. A live source clamps into its window and is a no-op without one;
   * live seconds are on the stable timeline [progressPayloadUnsafe] reports.
   */
  fun seek(seconds: Double) {
    onMain {
      val p = player ?: return@onMain
      if (isLiveSourceLoaded()) {
        val window = currentLiveWindowUnsafe(p) ?: return@onMain
        val targetMs = (seconds * 1000).toLong().coerceIn(window.startMs, window.liveEdgeMs)
        p.seekTo(targetMs - window.startMs)
        return@onMain
      }
      p.seekTo((clampToDuration(seconds, p) * 1000).toLong())
    }
  }

  fun setRate(rate: Double) {
    onMain { player?.playbackParameters = PlaybackParameters(rate.toFloat()) }
  }

  /**
   * Current playhead in seconds (`0` when unknown), on the same timeline as the live window for a
   * live source. Read on the player's main thread.
   */
  fun getPosition(): Double = onMainSync {
    val p = player ?: return@onMainSync 0.0
    positionSecondsUnsafe(p, currentLiveWindowUnsafe(p))
  }

  /** Current item duration in seconds (`0` when unknown / not yet loaded / live). */
  fun getDuration(): Double = onMainSync { getDurationUnsafe() }

  /** True while ExoPlayer is rendering frames or audio. Main-thread safe. */
  fun isPlaybackActive(): Boolean = onMainSync { player?.isPlaying == true }

  /**
   * Tear down the current item and stop the foreground service. The player instance is released here
   * while keeping the service/session available for app-closed car binding.
   */
  fun release() {
    onMain {
      stopProgressUpdates()
      appContext?.let {
        it.stopService(Intent(it, PodverseMediaLibraryService::class.java))
      }
      player?.clearMediaItems()
      player?.stop()
      hasPlayedCurrentItem = false
      publish(PlaybackState.IDLE)
      onVideoCapabilityChanged?.invoke(false)
      onVideoSizeChanged?.invoke(0, 0)
      onPlaybackPlayingChanged?.invoke(false)
    }
  }

  // MARK: - Events

  private val playerListener = object : Player.Listener {
    override fun onPlaybackStateChanged(playbackState: Int) {
      when (playbackState) {
        Player.STATE_BUFFERING -> {
          // Distinguish initial load from a mid-playback rebuffer (stall).
          if (getPositionUnsafe() > 0) {
            publish(PlaybackState.STALLED)
            emit("stalled", mapOf("positionSeconds" to getPositionUnsafe()))
          } else {
            publish(PlaybackState.LOADING)
          }
        }
        Player.STATE_READY -> {
          publish(PlaybackState.READY)
          // One progress sample when the item is prepared so JS gets duration before play starts.
          emit("progress", progressPayloadUnsafe())
          if (playWhenReadyGeneration == loadGeneration && playWhenReadyGeneration >= 0) {
            playWhenReadyGeneration = -1
            val readyPlayer = player
            val readyContext = appContext
            if (readyPlayer != null && readyContext != null) {
              startPlayback(readyContext, readyPlayer)
            }
          }
        }
        Player.STATE_ENDED -> {
          val ctx = appContext
          if (ctx != null) {
            appendJournal(ctx, "completed", getPositionUnsafe())
          }
          publish(PlaybackState.ENDED)
          emit("ended", mapOf("positionSeconds" to getPositionUnsafe()))
          stopProgressUpdates()
          if (!jsOwnsAdvance) {
            advanceToNextCachedItem()
          }
          ctx?.let { PodverseCarSyncScheduler.onPlaybackPausedOrEnded(it) }
        }
        Player.STATE_IDLE -> {}
      }
    }

    override fun onIsPlayingChanged(isPlaying: Boolean) {
      onPlaybackPlayingChanged?.invoke(isPlaying)
      if (isPlaying) {
        hasPlayedCurrentItem = true
        publish(PlaybackState.PLAYING)
        startProgressUpdates()
      } else {
        if (lastState != PlaybackState.ENDED) {
          publish(PlaybackState.PAUSED)
        }
        stopProgressUpdates()
      }
    }

    override fun onPlayerError(error: PlaybackException) {
      // The window dropped the playhead (a long pause or stall): recover at live, not as an error.
      if (error.errorCode == PlaybackException.ERROR_CODE_BEHIND_LIVE_WINDOW &&
        isLiveSourceLoaded()) {
        player?.let {
          it.seekToDefaultPosition()
          it.prepare()
        }
        publish(PlaybackState.LOADING)
        return
      }
      playWhenReadyGeneration = -1
      publish(PlaybackState.ERROR)
      emit("error", playbackErrorPayload(error))
    }

    override fun onVideoSizeChanged(videoSize: VideoSize) {
      // Report capability so the surface host hides itself for audio-only items.
      val hasVideo = videoSize != VideoSize.UNKNOWN && videoSize.width > 0 && videoSize.height > 0
      onMain {
        onVideoCapabilityChanged?.invoke(hasVideo)
        onVideoSizeChanged?.invoke(
          if (hasVideo) videoSize.width else 0,
          if (hasVideo) videoSize.height else 0,
        )
      }
    }
  }

  /**
   * Error payload plus, when the cause chain carries them, the host's HTTP status (`httpStatus`),
   * the URL that failed (`url`, after redirects), and the underlying cause (`detail`). Media is
   * fetched from the creator's own server, so the status is what tells support whose side failed.
   */
  private fun playbackErrorPayload(error: PlaybackException): Map<String, Any?> {
    val payload = mutableMapOf<String, Any?>(
      "code" to error.errorCodeName,
      "message" to (error.message ?: "Playback error"),
    )
    var cause: Throwable? = error.cause
    var depth = 0
    while (cause != null && depth < MAX_ERROR_CAUSE_DEPTH) {
      if (cause is HttpDataSource.InvalidResponseCodeException) {
        payload["httpStatus"] = cause.responseCode
        payload["url"] = cause.dataSpec.uri.toString()
        payload["detail"] = describeCause(cause)
        return payload
      }
      if (cause is HttpDataSource.HttpDataSourceException) {
        payload["url"] = cause.dataSpec.uri.toString()
      }
      if (payload["detail"] == null) {
        payload["detail"] = describeCause(cause)
      }
      cause = cause.cause
      depth += 1
    }
    return payload
  }

  private fun describeCause(cause: Throwable): String {
    val message = cause.message?.trim().orEmpty()
    val name = cause.javaClass.simpleName
    return if (message.isEmpty()) name else "$name: $message"
  }

  private fun emit(event: String, payload: Map<String, Any?>) {
    onMain { eventSink?.invoke(event, payload) }
  }

  private fun publish(state: String) {
    lastState = state
    emit("playbackState", mapOf("state" to state))
  }

  // MARK: - Progress updates (main-thread handler while playing)

  private val progressRunnable = object : Runnable {
    override fun run() {
      val position = getPositionUnsafe()
      val clipEnd = clipEndSeconds
      val ctx = appContext
      if (clipEnd != null && clipEnd > 0 && position >= clipEnd) {
        clipEndSeconds = null
        player?.pause()
        if (ctx != null) {
          appendJournal(ctx, "completed", position)
        }
        publish(PlaybackState.ENDED)
        emit("ended", mapOf("positionSeconds" to position))
        stopProgressUpdates()
        if (!jsOwnsAdvance) {
          advanceToNextCachedItem()
        }
        return
      }
      val nowMs = System.currentTimeMillis()
      if (player?.isPlaying == true && nowMs - lastJournalProgressAtMs >= 15_000L && ctx != null) {
        lastJournalProgressAtMs = nowMs
        appendJournal(ctx, "progress", position)
      }
      emit("progress", progressPayloadUnsafe())
      if (progressPosting) {
        mainHandler.postDelayed(this, 500)
      }
    }
  }

  private fun startProgressUpdates() {
    if (progressPosting) return
    progressPosting = true
    mainHandler.post(progressRunnable)
  }

  private fun stopProgressUpdates() {
    progressPosting = false
    mainHandler.removeCallbacks(progressRunnable)
  }

  // MARK: - Helpers

  /**
   * A live window on the period timeline, in milliseconds. ExoPlayer positions are measured from
   * the window start, which moves forward as the stream runs; the period timeline does not, so a
   * paused position keeps its value while both window ends advance. [startMs] is also the offset
   * from a window-relative position to the period timeline.
   */
  private data class LiveWindowMs(val startMs: Long, val liveEdgeMs: Long)

  /**
   * Main-thread only. The seekable window of a live source, or `null` when the source is not live,
   * has no timeline yet, or cannot seek (progressive Icecast or Shoutcast streams). The live edge
   * is Media3's default position, which already applies the target live offset.
   */
  private fun currentLiveWindowUnsafe(p: ExoPlayer): LiveWindowMs? {
    if (!isLiveSourceLoaded()) return null
    val timeline = p.currentTimeline
    if (timeline.isEmpty || !p.isCurrentMediaItemSeekable) return null
    val window = timeline.getWindow(p.currentMediaItemIndex, timelineWindow)
    val durationMs = window.durationMs
    if (durationMs == C.TIME_UNSET || durationMs < 0) return null
    val defaultMs = window.defaultPositionMs
    val edgeInWindowMs =
      (if (defaultMs == C.TIME_UNSET) durationMs else defaultMs).coerceIn(0L, durationMs)
    val startMs = window.positionInFirstPeriodMs
    return LiveWindowMs(startMs, startMs + edgeInWindowMs)
  }

  /** Main-thread only. Playhead in seconds, on the period timeline when [window] is set. */
  private fun positionSecondsUnsafe(p: ExoPlayer, window: LiveWindowMs?): Double {
    val pos = p.currentPosition + (window?.startMs ?: 0L)
    return if (pos < 0) 0.0 else pos / 1000.0
  }

  /**
   * Main-thread only. The `progress` payload, also merged into [getCurrentSource]. Position and
   * window come from one read so they share a timeline.
   */
  private fun progressPayloadUnsafe(): Map<String, Any?> {
    val p = player
    val window = p?.let { currentLiveWindowUnsafe(it) }
    return mapOf(
      "positionSeconds" to (p?.let { positionSecondsUnsafe(it, window) } ?: 0.0),
      "durationSeconds" to getDurationUnsafe(),
      "isLive" to isLiveSourceLoaded(),
      "liveWindow" to
        window?.let {
          mapOf("startSeconds" to it.startMs / 1000.0, "liveEdgeSeconds" to it.liveEdgeMs / 1000.0)
        },
    )
  }

  /** Position read assuming we are already on the main thread (used inside player callbacks). */
  private fun getPositionUnsafe(): Double {
    val p = player ?: return 0.0
    return positionSecondsUnsafe(p, currentLiveWindowUnsafe(p))
  }

  /** A live source reports `0`; its span is the live window. */
  private fun getDurationUnsafe(): Double {
    if (isLiveSourceLoaded()) return 0.0
    val d = player?.duration ?: C.TIME_UNSET
    return if (d == C.TIME_UNSET || d < 0) 0.0 else d / 1000.0
  }

  private fun isRemoteUrl(url: String): Boolean =
    url.startsWith("https://") || url.startsWith("http://")

  /**
   * True when [url] points to a `file://` target that does not exist. Only `file://` is checked;
   * `content://` URIs are resolved by the platform and remote URLs are not local files.
   */
  private fun isMissingLocalFile(url: String): Boolean {
    if (!url.startsWith("file://")) return false
    val path = Uri.parse(url).path ?: return true
    return !File(path).exists()
  }

  private fun clampToDuration(seconds: Double, p: ExoPlayer): Double {
    val lower = maxOf(0.0, seconds)
    if (isLiveSourceLoaded()) return lower
    val d = p.duration
    if (d == C.TIME_UNSET || d < 0) return lower
    return minOf(lower, d / 1000.0)
  }

  private fun onMain(work: () -> Unit) {
    if (Looper.myLooper() == Looper.getMainLooper()) {
      work()
    } else {
      mainHandler.post(work)
    }
  }

  private fun <T> onMainSync(block: () -> T): T {
    if (Looper.myLooper() == Looper.getMainLooper()) {
      return block()
    }
    val latch = CountDownLatch(1)
    var result: T? = null
    var error: Throwable? = null
    mainHandler.post {
      try {
        result = block()
      } catch (t: Throwable) {
        error = t
      } finally {
        latch.countDown()
      }
    }
    latch.await()
    error?.let { throw it }
    @Suppress("UNCHECKED_CAST")
    return result as T
  }
}
