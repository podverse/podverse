package expo.modules.podversemediaengine

import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// PG-2b steps 2.7-2.9 (details 086-088). This Expo module is a thin transport surface over the
// process-wide `PodverseAudioEngine` object. It does NOT own the ExoPlayer, MediaSession, or
// foreground service - the engine + PodverseMediaLibraryService do, so Android Auto (Track 12,
// 12.11-12.13) binds to the same player/session without a second path.
//
// Car foundation (00-CAR-FOUNDATION.md): one ExoPlayer, one MediaSession, one MediaLibraryService.
// Do NOT use react-native-track-player.
class PodverseMediaEngineModule : Module() {
  override fun definition() = ModuleDefinition {
    // Must match requireNativeModule('PodverseMediaEngine') on the JS side.
    Name("PodverseMediaEngine")

    // Native → JS events (contract aligns with step 2.10 / detail 089).
    Events("playbackState", "progress", "ended", "error", "stalled")

    // Forward engine events to JS while this module (and the JS runtime) is alive. When JS is not
    // running, the engine still plays and updates the media notification on its own.
    OnCreate {
      PodverseAudioEngine.eventSink = { name, body -> this@PodverseMediaEngineModule.sendEvent(name, body) }
    }

    OnDestroy {
      PodverseAudioEngine.eventSink = null
    }

    // --- Playback transport (contract: detail 082) ---

    AsyncFunction("load") { url: String, initialSeekSeconds: Double? ->
      PodverseAudioEngine.load(reactContext(), url, initialSeekSeconds)
    }

    // Atomic load + play (step 2.25 / detail 104). Used by the primary autoplay path.
    AsyncFunction("loadAndStart") { url: String, initialSeekSeconds: Double? ->
      PodverseAudioEngine.loadAndStart(reactContext(), url, initialSeekSeconds)
    }

    AsyncFunction("play") {
      PodverseAudioEngine.play(reactContext())
    }

    Function("pause") {
      PodverseAudioEngine.pause()
    }

    Function("seek") { seconds: Double ->
      PodverseAudioEngine.seek(seconds)
    }

    Function("setRate") { rate: Double ->
      PodverseAudioEngine.setRate(rate)
    }

    AsyncFunction("getPosition") {
      PodverseAudioEngine.getPosition()
    }

    AsyncFunction("getDuration") {
      PodverseAudioEngine.getDuration()
    }

    Function("destroy") {
      PodverseAudioEngine.release()
    }

    // --- Video surface (PG-5 steps 2.18-2.20 / details 097-099 + Plan 01 reparent). The ONE
    // SurfaceView is reparented between RN-mounted `PodverseVideoSurfaceView`s (registered via the
    // `View` below); never loads/releases the player or creates a second surface. ---

    // RN-mounted target view; registers itself with the host by `targetId` (`mini` / `full`).
    View(PodverseVideoSurfaceView::class) {
      Prop("targetId") { view: PodverseVideoSurfaceView, targetId: String ->
        view.setTargetId(targetId)
      }
    }

    // Retained for the JS bridge/serialization contract + unit tests. Placement is now driven by the
    // reparent into `PodverseVideoSurfaceView` (above), so rects no longer position the surface.
    Function("attachVideoSurface") {
        _: String, _: Double, _: Double, _: Double, _: Double, _: Double ->
      // No-op: superseded by native-view reparent (Plan 01). See PodverseVideoSurfaceHost.
    }

    Function("animateVideoSurface") { toTargetId: String, durationMs: Double ->
      PodverseVideoSurfaceHost.setActiveTarget(toTargetId, durationMs.toLong())
    }

    // JS-desired visibility (2.23); the host only shows when the item also has video frames.
    Function("setVideoSurfaceVisible") { visible: Boolean ->
      PodverseVideoSurfaceHost.setVisible(visible)
    }

    // --- Native-cache write hooks (step 2.35 / detail 114). Stubs OK in PG-2b; signatures reserved
    // so phone UI cannot invent a parallel cache. Schema owned by Track 12.1. Native reads must work
    // with the app force-stopped (seamless Android Auto proof deferred to 12.6 / 12.17). ---

    AsyncFunction("writeQueueSnapshot") { payloadJson: String ->
      // TODO(12.3): persist to Room/SharedPreferences. No-op stub in PG-2b.
    }

    AsyncFunction("writeDownloadsIndex") { payloadJson: String ->
      // TODO(12.3): persist to Room/SharedPreferences. No-op stub in PG-2b.
    }

    AsyncFunction("writeLibraryBrowseIndex") { payloadJson: String ->
      // TODO(12.3): persist to Room/SharedPreferences. No-op stub in PG-2b.
    }
  }

  private fun reactContext() =
    appContext.reactContext ?: throw Exceptions.ReactContextLost()
}
