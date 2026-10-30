package expo.modules.podversemediaengine

import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONObject

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
    Events(
      "playbackState", "progress", "ended", "error", "stalled", "sourceChanged",
      "remoteTrackCommand", "videoPresented", "deviceOrientation", "pictureInPicture")

    // Forward engine events to JS while this module (and the JS runtime) is alive. When JS is not
    // running, the engine still plays and updates the media notification on its own.
    // Owner-scoped so a Fast Refresh teardown cannot clear a newer module's sink.
    OnCreate {
      PodverseAudioEngine.setEventSink(
        { name, body -> this@PodverseMediaEngineModule.sendEvent(name, body) },
        this@PodverseMediaEngineModule,
      )
      PodverseVideoSurfaceHost.onVideoPresentedChanged = { presented ->
        this@PodverseMediaEngineModule.sendEvent("videoPresented", mapOf("presented" to presented))
      }
      PodverseVideoSurfaceHost.onPictureInPictureChanged = { active, restore ->
        this@PodverseMediaEngineModule.sendEvent(
          "pictureInPicture",
          mapOf("active" to active, "restore" to restore),
        )
      }
      PodverseDeviceOrientation.onChange = { landscape ->
        this@PodverseMediaEngineModule.sendEvent("deviceOrientation", mapOf("landscape" to landscape))
      }
    }

    OnDestroy {
      PodverseAudioEngine.clearEventSink(this@PodverseMediaEngineModule)
    }

    // --- Playback transport ---

    // `audioProfile` is `spoken` / `music` / `video`; an unknown or missing value keeps the
    // engine's current profile.
    AsyncFunction("load") {
        url: String,
        initialSeekSeconds: Double?,
        basicAuth: MediaBasicAuthRecord?,
        audioProfile: String?,
        metaJson: String? ->
      PodverseAudioEngine.load(
        reactContext(),
        url,
        initialSeekSeconds,
        basicAuth?.toScopedBasicAuth(),
        PodverseAudioEngine.AudioProfile.fromWireValue(audioProfile),
        metaJson,
      )
    }

    // Atomic load + play. Used by the primary autoplay path.
    AsyncFunction("loadAndStart") {
        url: String,
        initialSeekSeconds: Double?,
        basicAuth: MediaBasicAuthRecord?,
        audioProfile: String?,
        metaJson: String? ->
      PodverseAudioEngine.loadAndStart(
        reactContext(),
        url,
        initialSeekSeconds,
        basicAuth?.toScopedBasicAuth(),
        PodverseAudioEngine.AudioProfile.fromWireValue(audioProfile),
        metaJson,
      )
    }

    AsyncFunction("play") {
      PodverseAudioEngine.play(reactContext())
    }

    AsyncFunction("goToLive") {
      PodverseAudioEngine.goToLive(reactContext())
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

    AsyncFunction("getCurrentSource") {
      PodverseAudioEngine.getCurrentSource()
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

    Function("setVideoFullscreen") { enabled: Boolean ->
      val activity = appContext.currentActivity
      PodverseVideoSurfaceHost.setFullscreenActive(enabled, activity)
      val context = reactContext()
      if (enabled) {
        PodverseDeviceOrientation.start(context)
      } else {
        PodverseDeviceOrientation.stop()
      }
    }

    Function("isPhysicalDeviceLandscape") {
      PodverseDeviceOrientation.isLandscape(reactContext())
    }

    Function("isVideoPresented") {
      PodverseVideoSurfaceHost.isVideoPresented()
    }

    OnUserLeavesActivity {
      val activity = appContext.currentActivity ?: return@OnUserLeavesActivity
      PodverseVideoSurfaceHost.onUserLeaveHint(activity)
    }

    OnActivityEntersForeground {
      val activity = appContext.currentActivity ?: return@OnActivityEntersForeground
      PodverseVideoSurfaceHost.setFullscreenActive(
        PodverseVideoSurfaceHost.isFullscreenActive(),
        activity,
      )
    }

    // --- Native-cache write hooks.
    // JS mirrors state here; `PodverseNativeCache` persists JSON to app-private files so
    // PodverseMediaLibraryService reads it with the app killed and JS not running. The envelope is
    // defined in `src/data/nativeCache/projection.ts`.
    // Best-effort: a failed write must not surface as a JS error that rolls back the mutation. ---

    AsyncFunction("writeQueueSnapshotAv") { payloadJson: String ->
      PodverseNativeCache.write(reactContext(), PodverseNativeCacheKind.QUEUE_AV, payloadJson)
    }

    AsyncFunction("writeQueueSnapshotMusic") { payloadJson: String ->
      PodverseNativeCache.write(reactContext(), PodverseNativeCacheKind.QUEUE_MUSIC, payloadJson)
    }

    AsyncFunction("writeAdvanceWindow") { payloadJson: String ->
      PodverseNativeCache.write(reactContext(), PodverseNativeCacheKind.ADVANCE_WINDOW, payloadJson)
    }

    AsyncFunction("writeDownloadsIndex") { payloadJson: String ->
      PodverseNativeCache.write(reactContext(), PodverseNativeCacheKind.DOWNLOADS, payloadJson)
    }

    AsyncFunction("writeLibraryBrowseIndex") { payloadJson: String ->
      PodverseNativeCache.write(reactContext(), PodverseNativeCacheKind.LIBRARY_BROWSE, payloadJson)
    }

    AsyncFunction("writeLibraryChildren") { channelIdText: String, payloadJson: String ->
      PodverseNativeCache.writeLibraryChildren(reactContext(), channelIdText, payloadJson)
    }

    AsyncFunction("writeHistoryIndex") { payloadJson: String ->
      PodverseNativeCache.write(reactContext(), PodverseNativeCacheKind.HISTORY, payloadJson)
    }

    AsyncFunction("writeLiveIndex") { payloadJson: String ->
      PodverseNativeCache.write(reactContext(), PodverseNativeCacheKind.LIVE, payloadJson)
    }

    AsyncFunction("writeAccountContext") { payloadJson: String ->
      try {
        val signedIn = JSONObject(payloadJson).optBoolean("signedIn", true)
        if (!signedIn) {
          PodverseNativeCache.clearAccountScopedFiles(reactContext())
        }
      } catch (_: Exception) {
      }
      PodverseNativeCache.write(reactContext(), PodverseNativeCacheKind.ACCOUNT_CONTEXT, payloadJson)
    }

    AsyncFunction("readPlaybackJournal") {
      PodverseNativeCache.read(reactContext(), PodverseNativeCacheKind.PLAYBACK_JOURNAL)
    }

    AsyncFunction("writePlaybackJournal") { payloadJson: String ->
      PodverseNativeCache.write(reactContext(), PodverseNativeCacheKind.PLAYBACK_JOURNAL, payloadJson)
    }

    AsyncFunction("setJsOwnsAdvance") { owns: Boolean ->
      PodverseAudioEngine.setJsOwnsAdvance(owns)
    }
  }

  private fun reactContext() =
    appContext.reactContext ?: throw Exceptions.ReactContextLost()
}
