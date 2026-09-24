package expo.modules.podverseperfprobe

import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.Choreographer
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * UI-thread frame probe. `start`/`stop`/`snapshot` compare Choreographer frame times inside one
 * window, always on the main thread. The session monitor (`startSession`) runs for the rest of the
 * session: it records frame gaps over 25 ms and the frame time of frames JS asks to have stamped.
 * Touch timestamps and `uptimeMs` share the `System.nanoTime` base.
 */
class PodversePerfProbeModule : Module() {
  @Volatile private var isRunning = false
  @Volatile private var lastFrameTimeNanos: Long = 0L
  private var frameCount = 0
  private var over17Ms = 0
  private var over33Ms = 0
  private var maxGapMs = 0.0
  private val mainHandler = Handler(Looper.getMainLooper())

  // Frames and stamps are written on the main thread and drained on the JS thread.
  private val sessionLock = Any()
  private var sessionRunning = false
  private var sessionLastFrameNanos = 0L
  private val longFrames = ArrayDeque<DoubleArray>()
  private val pendingStamps = ArrayList<Pair<String, Double>>()
  private val readyStamps = ArrayDeque<Triple<String, Double, Double>>()

  // Choreographer frame time is when the frame started, not when it reached the display, so
  // Android stamps read one or two frames earlier than iOS stamps.
  private val sessionCallback =
    object : Choreographer.FrameCallback {
      override fun doFrame(frameTimeNanos: Long) {
        val frameMs = frameTimeNanos / 1_000_000.0
        synchronized(sessionLock) {
          if (sessionLastFrameNanos > 0L) {
            val gapMs = (frameTimeNanos - sessionLastFrameNanos) / 1_000_000.0
            if (gapMs > LONG_FRAME_MS && gapMs < IGNORE_GAP_MS) {
              if (longFrames.size >= LONG_FRAME_CAP) longFrames.removeFirst()
              longFrames.addLast(doubleArrayOf(sessionLastFrameNanos / 1_000_000.0, gapMs))
            }
          }
          sessionLastFrameNanos = frameTimeNanos
          for ((tag, touchMs) in pendingStamps) {
            if (readyStamps.size >= STAMP_CAP) readyStamps.removeFirst()
            readyStamps.addLast(Triple(tag, touchMs, frameMs - touchMs))
          }
          pendingStamps.clear()
        }
        Choreographer.getInstance().postFrameCallback(this)
      }
    }

  private val frameCallback =
    object : Choreographer.FrameCallback {
      override fun doFrame(frameTimeNanos: Long) {
        if (!isRunning) {
          return
        }
        if (lastFrameTimeNanos > 0L) {
          val gapMs = (frameTimeNanos - lastFrameTimeNanos) / 1_000_000.0
          frameCount += 1
          if (gapMs > maxGapMs) {
            maxGapMs = gapMs
          }
          if (gapMs > 17.0) {
            over17Ms += 1
          }
          if (gapMs > 33.0) {
            over33Ms += 1
          }
        }
        lastFrameTimeNanos = frameTimeNanos
        Choreographer.getInstance().postFrameCallback(this)
      }
    }

  override fun definition() =
    ModuleDefinition {
      Name("PodversePerfProbe")

      Function("start") {
        startProbe()
      }

      Function("stop") {
        stopProbe()
      }

      Function("reset") {
        stopProbe()
        frameCount = 0
        over17Ms = 0
        over33Ms = 0
        maxGapMs = 0.0
        lastFrameTimeNanos = 0L
      }

      Function("snapshot") {
        mapOf(
          "frameCount" to frameCount,
          "maxGapMs" to maxGapMs,
          "over17Ms" to over17Ms,
          "over33Ms" to over33Ms,
        )
      }

      Function("uptimeMs") { System.nanoTime() / 1_000_000.0 }

      Function("startSession") { mainHandler.post { startSessionOnMain() } }

      Function("drainLongFrames") {
        val nowMs = System.nanoTime() / 1_000_000.0
        val frames = synchronized(sessionLock) { longFrames.toList().also { longFrames.clear() } }
        frames.map { mapOf("agoMs" to nowMs - it[0], "gapMs" to it[1]) }
      }

      Function("stampNextFrame") { tag: String, touchMs: Double ->
        mainHandler.post {
          synchronized(sessionLock) {
            if (pendingStamps.size < STAMP_CAP) pendingStamps.add(Pair(tag, touchMs))
          }
          startSessionOnMain()
        }
      }

      Function("drainFrameStamps") {
        val stamps = synchronized(sessionLock) { readyStamps.toList().also { readyStamps.clear() } }
        stamps.map {
          mapOf<String, Any>("latencyMs" to it.third, "tag" to it.first, "touchMs" to it.second)
        }
      }

      Function("log") { message: String -> Log.i(LOG_TAG, message) }
    }

  private fun startProbe() {
    if (isRunning) {
      return
    }
    isRunning = true
    lastFrameTimeNanos = 0L
    mainHandler.post { Choreographer.getInstance().postFrameCallback(frameCallback) }
  }

  private fun stopProbe() {
    if (!isRunning) {
      return
    }
    isRunning = false
    mainHandler.post { Choreographer.getInstance().removeFrameCallback(frameCallback) }
    lastFrameTimeNanos = 0L
  }

  private fun startSessionOnMain() {
    if (sessionRunning) {
      return
    }
    sessionRunning = true
    synchronized(sessionLock) { sessionLastFrameNanos = 0L }
    Choreographer.getInstance().postFrameCallback(sessionCallback)
  }

  private companion object {
    const val LOG_TAG = "PodversePerf"
    const val LONG_FRAME_MS = 25.0
    const val IGNORE_GAP_MS = 5000.0
    const val LONG_FRAME_CAP = 512
    const val STAMP_CAP = 64
  }
}
