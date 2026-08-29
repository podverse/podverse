package expo.modules.podversemediaengine

import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// This Expo module is a thin transport surface over the process-wide `PodverseAudioEngine` object.
// It does NOT own the ExoPlayer, MediaSession, or foreground service; the engine and
// PodverseMediaLibraryService do, so Android Auto binds to the same player/session without a second
// path.
//
// Car foundation (00-CAR-FOUNDATION.md): one ExoPlayer, one MediaSession, one MediaLibraryService.
// Do NOT use react-native-track-player.
class PodverseMediaEngineModule : Module() {
  override fun definition() = ModuleDefinition {
    // Must match requireNativeModule('PodverseMediaEngine') on the JS side.
    Name("PodverseMediaEngine")

    // Native → JS events.
    Events("playbackState", "progress", "ended", "error", "stalled")

    // Forward engine events to JS while this module (and the JS runtime) is alive. When JS is not
    // running, the engine still plays and updates the media notification on its own.
    OnCreate {
      PodverseAudioEngine.eventSink = { name, body -> this@PodverseMediaEngineModule.sendEvent(name, body) }
    }

    OnDestroy {
      PodverseAudioEngine.eventSink = null
    }

    // --- Playback transport ---

    AsyncFunction("load") { url: String, initialSeekSeconds: Double? ->
      PodverseAudioEngine.load(reactContext(), url, initialSeekSeconds)
    }

    // Atomic load + play. Used by the primary autoplay path.
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

    // --- Video surface. The ONE
    // SurfaceView is reparented between RN-mounted `PodverseVideoSurfaceView`s (registered via the
    // `View` below); never loads/releases the player or creates a second surface. ---

    // RN-mounted target view; registers itself with the host by `targetId` (`mini` / `full`).
    View(PodverseVideoSurfaceView::class) {
      Prop("targetId") { view: PodverseVideoSurfaceView, targetId: String ->
        view.setTargetId(targetId)
      }
    }

    // Retained for the JS bridge/serialization contract + unit tests. Placement is driven by the
      // reparent into `PodverseVideoSurfaceView` (above), so rects do not position the surface.
    Function("attachVideoSurface") {
        _: String, _: Double, _: Double, _: Double, _: Double, _: Double ->
      // No-op: placement is handled by native-view reparent. See PodverseVideoSurfaceHost.
    }

    Function("animateVideoSurface") { toTargetId: String, durationMs: Double ->
      PodverseVideoSurfaceHost.setActiveTarget(toTargetId, durationMs.toLong())
    }

    // JS-desired visibility; the host only shows when the item also has video frames.
    Function("setVideoSurfaceVisible") { visible: Boolean ->
      PodverseVideoSurfaceHost.setVisible(visible)
    }

    // --- Native-cache write hooks.
    // JS mirrors state here; `PodverseNativeCache` persists JSON to app-private files so
    // PodverseMediaLibraryService reads it with the app killed and JS not running. The envelope is
    // defined in `src/data/nativeCache/projection.ts`.
    // Best-effort: a failed write must not surface as a JS error that rolls back the mutation. ---

    AsyncFunction("writeQueueSnapshot") { payloadJson: String ->
      PodverseNativeCache.write(reactContext(), PodverseNativeCacheKind.QUEUE, payloadJson)
    }

    AsyncFunction("writeDownloadsIndex") { payloadJson: String ->
      PodverseNativeCache.write(reactContext(), PodverseNativeCacheKind.DOWNLOADS, payloadJson)
    }

    AsyncFunction("writeLibraryBrowseIndex") { payloadJson: String ->
      PodverseNativeCache.write(reactContext(), PodverseNativeCacheKind.LIBRARY_BROWSE, payloadJson)
    }
  }

  private fun reactContext() =
    appContext.reactContext ?: throw Exceptions.ReactContextLost()
}
