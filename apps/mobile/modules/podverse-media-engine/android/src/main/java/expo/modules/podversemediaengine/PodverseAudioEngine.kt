package expo.modules.podversemediaengine

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Handler
import android.os.Looper
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.PlaybackParameters
import androidx.media3.common.Player
import androidx.media3.common.VideoSize
import androidx.media3.common.util.UnstableApi
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

  /** Clear the sink only when [owner] is still the current owner. */
  fun clearEventSink(owner: Any) {
    onMain {
      if (eventSinkOwner !== owner) {
        return@onMain
      }
      eventSinkOwner = null
      eventSink = null
    }
  }

  /**
   * Notified on the main thread whenever the current item's video capability changes (video frames
   * available vs audio-only). Set by [PodverseVideoSurfaceHost] so it can keep the surface hidden for
   * audio-only items without the engine depending on the host.
   */
  var onVideoCapabilityChanged: ((Boolean) -> Unit)? = null

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
          val attrs =
            AudioAttributes.Builder()
              .setUsage(C.USAGE_MEDIA)
              .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
              .build()
          exo.setAudioAttributes(attrs, /* handleAudioFocus= */ true)
          exo.volume = 1f
          exo.addListener(playerListener)
          player = exo
        }
    }
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
   */
  fun load(
    context: Context,
    url: String,
    initialSeekSeconds: Double?,
    basicAuth: ScopedBasicAuth? = null,
  ) {
    prepareSource(context, url, initialSeekSeconds, basicAuth, playWhenPrepared = false)
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
  ) {
    prepareSource(context, url, initialSeekSeconds, basicAuth, playWhenPrepared = true)
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
      publish(PlaybackState.LOADING)
      val item = MediaItem.fromUri(url)
      val startMs = (seekSeconds * 1000).toLong()
      val isRemote = url.startsWith("https://") || url.startsWith("http://")
      if (basicAuth != null && isRemote) {
        val source = authenticatedMediaSource(context, item, basicAuth)
        if (hasSeek) p.setMediaSource(source, startMs) else p.setMediaSource(source)
      } else if (hasSeek) {
        p.setMediaItem(item, startMs)
      } else {
        p.setMediaItem(item)
      }
      p.prepare()
      if (playWhenPrepared && !hasSeek) {
        startPlayback(context, p)
      }
    }
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

  fun play(context: Context) {
    onMain {
      val p = getOrCreatePlayer(context)
      startPlayback(context, p)
    }
  }

  fun pause() {
    onMain { player?.pause() }
  }

  fun seek(seconds: Double) {
    onMain {
      val p = player ?: return@onMain
      p.seekTo((clampToDuration(seconds, p) * 1000).toLong())
    }
  }

  fun setRate(rate: Double) {
    onMain { player?.playbackParameters = PlaybackParameters(rate.toFloat()) }
  }

  /** Current playhead in seconds (`0` when unknown). Read on the player's main thread. */
  fun getPosition(): Double = onMainSync {
    val pos = player?.currentPosition ?: 0L
    if (pos < 0) 0.0 else pos / 1000.0
  }

  /** Current item duration in seconds (`0` when unknown / not yet loaded / live). */
  fun getDuration(): Double = onMainSync {
    val d = player?.duration ?: C.TIME_UNSET
    if (d == C.TIME_UNSET || d < 0) 0.0 else d / 1000.0
  }

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
      publish(PlaybackState.IDLE)
      onVideoCapabilityChanged?.invoke(false)
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
          emit(
            "progress",
            mapOf(
              "positionSeconds" to getPositionUnsafe(),
              "durationSeconds" to getDurationUnsafe(),
            ))
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
          publish(PlaybackState.ENDED)
          emit("ended", mapOf("positionSeconds" to getPositionUnsafe()))
          stopProgressUpdates()
        }
        Player.STATE_IDLE -> {}
      }
    }

    override fun onIsPlayingChanged(isPlaying: Boolean) {
      if (isPlaying) {
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
      playWhenReadyGeneration = -1
      publish(PlaybackState.ERROR)
      emit("error", playbackErrorPayload(error))
    }

    override fun onVideoSizeChanged(videoSize: VideoSize) {
      // Report capability so the surface host hides itself for audio-only items.
      val hasVideo = videoSize != VideoSize.UNKNOWN && videoSize.width > 0 && videoSize.height > 0
      onMain { onVideoCapabilityChanged?.invoke(hasVideo) }
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
      emit(
        "progress",
        mapOf(
          "positionSeconds" to getPositionUnsafe(),
          "durationSeconds" to getDurationUnsafe(),
        ))
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

  /** Position read assuming we are already on the main thread (used inside player callbacks). */
  private fun getPositionUnsafe(): Double {
    val pos = player?.currentPosition ?: 0L
    return if (pos < 0) 0.0 else pos / 1000.0
  }

  private fun getDurationUnsafe(): Double {
    val d = player?.duration ?: C.TIME_UNSET
    return if (d == C.TIME_UNSET || d < 0) 0.0 else d / 1000.0
  }

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
