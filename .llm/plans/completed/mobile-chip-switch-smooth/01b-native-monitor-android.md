# 01b — Native frame monitor: Android

## Goal

Match 01a on Android: session monitor, frame stamps, and a native `log` line (`Log.i`, tag
`PodversePerf`). Also fix a measurement bug: the existing `start`/`stop` called Choreographer from
the JS thread, so Android "ui" frame numbers were timing the JS thread. They now post to the main
thread. Android frame numbers captured before this change are not comparable with later ones.

Clock notes (for the doc comment): touch `nativeEvent.timestamp` on Android is uptime in ms, the same
base as `System.nanoTime()`. Choreographer's `frameTimeNanos` marks the start of a frame, not its
display, so Android stamps read one or two frames earlier than iOS stamps.

## Preconditions

- 01a is done (the TS types already list the optional members).

## File

- `apps/mobile/modules/podverse-perf-probe/android/src/main/java/expo/modules/podverseperfprobe/PodversePerfProbeModule.kt`

## Steps

1. Imports: add `import android.os.Handler`, `import android.os.Looper`, and `import android.util.Log`
   so the import block reads, in order: `android.os.Handler`, `android.os.Looper`,
   `android.util.Log`, `android.view.Choreographer`, then the two `expo.modules…` imports.

2. Change `private var isRunning = false` to `@Volatile private var isRunning = false` and
   `private var lastFrameTimeNanos: Long = 0L` to `@Volatile private var lastFrameTimeNanos: Long = 0L`.

3. Directly after the line `  private var maxGapMs = 0.0` insert:

```kotlin
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
```

4. Inside `ModuleDefinition { … }`, directly after the closing `}` of the `Function("snapshot")`
   block, add:

```kotlin

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
```

5. In `startProbe()` replace the line
   `    Choreographer.getInstance().postFrameCallback(frameCallback)` with
   `    mainHandler.post { Choreographer.getInstance().postFrameCallback(frameCallback) }`.
   In `stopProbe()` replace
   `    Choreographer.getInstance().removeFrameCallback(frameCallback)` with
   `    mainHandler.post { Choreographer.getInstance().removeFrameCallback(frameCallback) }`.

6. Directly after the closing `}` of `stopProbe()` (still inside the class) add:

```kotlin

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
```

7. Replace the class doc comment with:

```kotlin
/**
 * UI-thread frame probe. `start`/`stop`/`snapshot` compare Choreographer frame times inside one
 * window, always on the main thread. The session monitor (`startSession`) runs for the rest of the
 * session: it records frame gaps over 25 ms and the frame time of frames JS asks to have stamped.
 * Touch timestamps and `uptimeMs` share the `System.nanoTime` base.
 */
```

## Do not

- Do not change the counters in `frameCallback` or the `snapshot` map.
- Do not call the new functions from app code.

## Done when

- [ ] `start`/`stop` post to `mainHandler`; the session callback, six new `Function`s,
      `startSessionOnMain`, and the companion constants exist.
- [ ] COPY-PASTA 01b ticked; this file moved to `.llm/plans/completed/mobile-chip-switch-smooth/`.

## Operator checkpoint

Native code changed in 01a and 01b, so rebuild. No capture yet.

**Mobile iOS**:

```bash
npm run mobile:ios -- --device "iPhone 17 Pro"
```

Only if you also measure Android — **Mobile Android**:

```bash
npm run mobile:android -- --device Pixel_6_Pro_API_33
```

Then paste prompt 02a.
