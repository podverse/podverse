package expo.modules.podversemediaengine

import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.Looper
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.PlaybackParameters
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import java.util.concurrent.CountDownLatch

// PG-2b steps 2.7-2.9 (details 086-088).
//
// Car foundation (00-CAR-FOUNDATION.md): this is the single, process-wide audio engine. It owns the
// one Media3 ExoPlayer for phone, lock screen, and future Android Auto now-playing. The
// MediaLibraryService (PodverseMediaLibraryService) wraps THIS player in the one MediaSession so
// Android Auto (12.11-12.13) binds to the same instance without a second player/session. A future
// Auto browse tree fills onGetChildren from the native cache (Track 12) - JS never owns the tree.
// Do NOT create parallel players and do NOT use react-native-track-player.
object PodverseAudioEngine {
  /**
   * Sink used to forward events to JS. Set by the Expo module while it is alive; `null` when the JS
   * runtime is not running (e.g. future Auto-only launch). The engine still plays and updates the
   * media notification without JS.
   */
  var eventSink: ((String, Map<String, Any?>) -> Unit)? = null

  private var player: ExoPlayer? = null
  private var appContext: Context? = null
  private val mainHandler = Handler(Looper.getMainLooper())
  private var progressPosting = false
  private var lastState: String = PlaybackState.IDLE

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

  // MARK: - Transport (called by the Expo module; the service reuses the same player)

  fun load(context: Context, url: String, initialSeekSeconds: Double?) {
    onMain {
      val p = getOrCreatePlayer(context)
      publish(PlaybackState.LOADING)
      p.setMediaItem(MediaItem.fromUri(url))
      p.prepare()
      if (initialSeekSeconds != null && initialSeekSeconds > 0) {
        p.seekTo((initialSeekSeconds * 1000).toLong())
      }
    }
  }

  fun play(context: Context) {
    onMain {
      val p = getOrCreatePlayer(context)
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
   * for the spike; Track 12 will keep the service/session shape for app-closed car binding.
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
        Player.STATE_READY -> publish(PlaybackState.READY)
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
      publish(PlaybackState.ERROR)
      emit(
        "error",
        mapOf("code" to error.errorCodeName, "message" to (error.message ?: "Playback error")))
    }
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
