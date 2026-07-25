package expo.modules.podversemediaengine

import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.session.LibraryResult
import androidx.media3.session.MediaLibraryService
import androidx.media3.session.MediaSession
import com.google.common.collect.ImmutableList
import com.google.common.util.concurrent.Futures
import com.google.common.util.concurrent.ListenableFuture

// PG-2b step 2.8 (detail 087). Media3 MediaLibraryService that wraps the single shared ExoPlayer
// (PodverseAudioEngine) in the one MediaLibrarySession.
//
// Car foundation (00-CAR-FOUNDATION.md): this is deliberately a MediaLibraryService (not a throwaway
// Service) so Android Auto connects to the service, not the Activity, and can browse the native
// cache with the app force-stopped (Track 12 / 12.11-12.13). The browse tree is an empty stub here;
// Track 12.12 fills onGetChildren by reading the durable native cache via
// PodverseNativeCache.read(context, PodverseNativeCacheKind.LIBRARY_BROWSE) (storage landed in 12.3).
// JS must never own the browse tree. Full app-closed proof is deferred to 12.6 / 12.13 / 12.17.
//
// Foreground: the app starts this with Context.startService (not startForegroundService). Media3
// MediaSessionService promotes to a mediaPlayback foreground service + notification once playback
// is ongoing — calling startForegroundService too early causes ForegroundServiceDidNotStartInTime.
class PodverseMediaLibraryService : MediaLibraryService() {
  private var librarySession: MediaLibrarySession? = null

  override fun onCreate() {
    super.onCreate()
    // Spike 12.6: Android Auto / DHU starts THIS service (not the Activity), so this read runs with
    // the Activity + JS runtime dead. Logs a one-line summary proving the durable native cache is
    // readable with the app force-stopped. Best-effort; never blocks session setup. See
    // NATIVE-CACHE-SPIKE-ANDROID.md. Track 12.12 will use the same reader to populate onGetChildren.
    PodverseNativeCache.debugDump(this)
    // Wrap the SAME shared player as the module — no second player/session for "car later".
    val player = PodverseAudioEngine.getOrCreatePlayer(this)
    librarySession =
      MediaLibrarySession.Builder(this, player, LibraryCallback())
        .setId("podverse_media_library")
        .build()
  }

  override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaLibrarySession? {
    return librarySession
  }

  override fun onDestroy() {
    // Release the session but not the shared player (engine owns the player lifecycle).
    librarySession?.release()
    librarySession = null
    super.onDestroy()
  }

  // Stub browse tree: a browsable root with no children. Safe if Auto/DHU connects early.
  private inner class LibraryCallback : MediaLibrarySession.Callback {
    override fun onGetLibraryRoot(
      session: MediaLibrarySession,
      browser: MediaSession.ControllerInfo,
      params: LibraryParams?
    ): ListenableFuture<LibraryResult<MediaItem>> {
      val rootMetadata =
        MediaMetadata.Builder()
          .setIsBrowsable(true)
          .setIsPlayable(false)
          .setTitle("Podverse")
          .build()
      val root = MediaItem.Builder().setMediaId(ROOT_ID).setMediaMetadata(rootMetadata).build()
      return Futures.immediateFuture(LibraryResult.ofItem(root, params))
    }

    override fun onGetChildren(
      session: MediaLibrarySession,
      browser: MediaSession.ControllerInfo,
      parentId: String,
      page: Int,
      pageSize: Int,
      params: LibraryParams?
    ): ListenableFuture<LibraryResult<ImmutableList<MediaItem>>> {
      // Empty stub tree. Track 12.12 populates from the native cache: read the persisted
      // library-browse JSON via PodverseNativeCache.read(this, PodverseNativeCacheKind.LIBRARY_BROWSE)
      // (written by writeLibraryBrowseIndex, storage 12.3) and map nodes → MediaItems.
      return Futures.immediateFuture(LibraryResult.ofItemList(ImmutableList.of(), params))
    }
  }

  private companion object {
    const val ROOT_ID = "podverse_root"
  }
}
