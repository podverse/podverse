package expo.modules.podversemediaengine

import android.net.Uri
import android.util.Log
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.Player
import androidx.media3.session.LibraryResult
import androidx.media3.session.MediaLibraryService
import androidx.media3.session.MediaSession
import androidx.media3.session.SessionCommands
import com.google.common.collect.ImmutableList
import com.google.common.util.concurrent.Futures
import com.google.common.util.concurrent.ListenableFuture

// Media3 MediaLibraryService that wraps the single shared ExoPlayer (PodverseAudioEngine) in the
// one MediaLibrarySession.
//
// Car foundation (00-CAR-FOUNDATION.md): this is deliberately a MediaLibraryService (not a throwaway
// Service) so Android Auto connects to the service, not the Activity, and can browse the native
// cache with the app force-stopped. onConnect validates allowed callers and onGetLibraryRoot serves
// a stable browsable root. onGetChildren reads the durable native cache. JS must never own the browse
// tree.
//
// Foreground: the app starts this with Context.startService (not startForegroundService). Media3
// MediaSessionService promotes to a mediaPlayback foreground service + notification once playback
// is ongoing — calling startForegroundService too early causes ForegroundServiceDidNotStartInTime.
class PodverseMediaLibraryService : MediaLibraryService() {
  private var librarySession: MediaLibrarySession? = null

  override fun onCreate() {
    super.onCreate()
    // Android Auto / DHU starts THIS service (not the Activity), so this read runs with the Activity
    // and JS runtime dead. It logs a one-line summary of the durable native cache. Best-effort;
    // never blocks session setup.
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

  // Empty browse tree: a browsable root with no children. Safe if Auto/DHU connects early.
  private inner class LibraryCallback : MediaLibrarySession.Callback {
    // Allowed callers. Android Auto connects to THIS service (not the Activity), so this runs with
    // the JS runtime dead. Trust only signature-checked callers: Media3's own helpers
    // (media notification controller on the phone, the Android Auto companion, and Android
    // Automotive OS) plus our own package. Media3's isAuto*/isAutomotive helpers verify the caller
    // signature — safer than a package-name allowlist (which is spoofable). Unknown callers connect
    // with NO commands rather than being hard-rejected, so nothing can drive the shared engine or
    // browse the tree, and the session never throws.
    override fun onConnect(
      session: MediaSession,
      controller: MediaSession.ControllerInfo
    ): MediaSession.ConnectionResult {
      val isTrustedCaller =
        session.isMediaNotificationController(controller) ||
          session.isAutoCompanionController(controller) ||
          session.isAutomotiveController(controller) ||
          controller.packageName == packageName
      if (isTrustedCaller) {
        // Default accepted session + player commands (browse + transport) for the phone media
        // notification controller and Android Auto / Automotive.
        return MediaSession.ConnectionResult.AcceptedResultBuilder(session).build()
      }
      Log.i(TAG, "onConnect commands-denied caller=${controller.packageName}")
      return MediaSession.ConnectionResult.AcceptedResultBuilder(session)
        .setAvailableSessionCommands(SessionCommands.EMPTY)
        .setAvailablePlayerCommands(Player.Commands.EMPTY)
        .build()
    }

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
      // The root is served with the app force-stopped (Activity + JS dead). `params` (offline /
      // suggested / recent) is honored minimally: one stable root is returned for every
      // LibraryParams, and children read the durable cache.
      Log.i(TAG, "onGetLibraryRoot served root=$ROOT_ID caller=${browser.packageName}")
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
      // Project the durable native cache into the browse tree. Read runs on the service process with
      // JS possibly dead; a missing/corrupt payload yields an empty list (the parser never throws).
      // SQLite is never read here (JS-dead contract).
      val children =
        when (parentId) {
          ROOT_ID -> rootChildren()
          LIBRARY_ID -> libraryChildren()
          DOWNLOADS_ID -> downloadChildren()
          // Deeper hydration (a podcast's episodes, a playlist's items) needs a richer cached index
          // than the library-browse projection.
          else -> emptyList()
        }
      val paged = pageSlice(children, page, pageSize)
      return Futures.immediateFuture(
        LibraryResult.ofItemList(ImmutableList.copyOf(paged), params))
    }

    // Resolve playable browse items to a real URL before they reach the shared player. Auto hands us
    // MediaItems carrying only a mediaId (no localConfiguration); we look the id up in the
    // durable cache and attach a URI + now-playing metadata. Same resolution as the phone: prefer
    // the offline file:// path, else the remote enclosure URL. Unresolvable items are dropped.
    // Playback runs on the single shared PodverseAudioEngine player wrapped by this session — never
    // a second player. Queue/auto-queue policy stays in @podverse/playback-core (JS); this is a
    // direct transport action for one cached item.
    override fun onAddMediaItems(
      mediaSession: MediaSession,
      controller: MediaSession.ControllerInfo,
      mediaItems: MutableList<MediaItem>
    ): ListenableFuture<MutableList<MediaItem>> {
      val resolved = mediaItems.mapNotNull { resolveForPlayback(it) }.toMutableList()
      return Futures.immediateFuture(resolved)
    }

    // Car resume (or the head unit auto-resuming) while app-closed: return the last cached
    // now-playing item so playback can start without opening the phone. Minimal + tolerant: resolve
    // from the queue snapshot, fall back to the first entry, and fail the future when nothing is
    // resumable (Media3 then simply does not resume).
    override fun onPlaybackResumption(
      mediaSession: MediaSession,
      controller: MediaSession.ControllerInfo
    ): ListenableFuture<MediaSession.MediaItemsWithStartPosition> {
      val snapshot = readQueueSnapshot()
      val nowPlaying =
        snapshot.entries.firstOrNull { it.idText == snapshot.nowPlayingIdText }
          ?: snapshot.entries.firstOrNull()
          ?: return Futures.immediateFailedFuture(
            UnsupportedOperationException("No resumable media in cache"))
      val resolved =
        resolvePlayable(nowPlaying.idText)
          ?: return Futures.immediateFailedFuture(
            UnsupportedOperationException("Resume media has no resolvable URL"))
      val item =
        MediaItem.Builder()
          .setMediaId("queue/${nowPlaying.idText}")
          .setUri(Uri.parse(resolved.uri))
          .setMediaMetadata(playableMetadata(resolved.title, resolved.artworkUrl))
          .build()
      return Futures.immediateFuture(
        MediaSession.MediaItemsWithStartPosition(listOf(item), 0, C.TIME_UNSET))
    }
  }

  // MARK: - Browse tree projection

  /** Root children: a `Library` node and/or a `Downloads` node, each omitted when its cache is empty. */
  private fun rootChildren(): List<MediaItem> {
    val items = ArrayList<MediaItem>(2)
    // Root node titles are native car labels; there is no i18next runtime in the service when JS is
    // dead.
    if (readBrowseNodes().isNotEmpty()) {
      items.add(browsableItem(LIBRARY_ID, "Library", null))
    }
    if (readDownloadEntries().isNotEmpty()) {
      items.add(browsableItem(DOWNLOADS_ID, "Downloads", null))
    }
    return items
  }

  /** One browsable MediaItem per cached library node; mediaId encodes kind + idText. */
  private fun libraryChildren(): List<MediaItem> =
    readBrowseNodes().map { node ->
      browsableItem("$LIBRARY_ID/${node.kind}/${node.idText}", node.title, node.artworkUrl)
    }

  /** One playable MediaItem per offline download; mediaId `download/<idText>` resolves to a file. */
  private fun downloadChildren(): List<MediaItem> =
    readDownloadEntries().map { entry ->
      playableItem("$DOWNLOAD_ITEM_PREFIX${entry.idText}", entry.title, entry.artworkUrl)
    }

  private fun readBrowseNodes(): List<PodverseNativeCacheModel.BrowseNode> =
    PodverseNativeCacheModel.parseBrowseNodes(
      PodverseNativeCache.read(this, PodverseNativeCacheKind.LIBRARY_BROWSE))

  private fun readDownloadEntries(): List<PodverseNativeCacheModel.DownloadEntry> =
    PodverseNativeCacheModel.parseDownloadEntries(
      PodverseNativeCache.read(this, PodverseNativeCacheKind.DOWNLOADS))

  private fun readQueueSnapshot(): PodverseNativeCacheModel.QueueSnapshot =
    PodverseNativeCacheModel.parseQueueSnapshot(
      PodverseNativeCache.read(this, PodverseNativeCacheKind.QUEUE))

  private fun browsableItem(mediaId: String, title: String, artworkUrl: String?): MediaItem {
    val metadata =
      MediaMetadata.Builder()
        .setIsBrowsable(true)
        .setIsPlayable(false)
        .setTitle(title)
        .apply { artworkUrl?.let { setArtworkUri(Uri.parse(it)) } }
        .build()
    return MediaItem.Builder().setMediaId(mediaId).setMediaMetadata(metadata).build()
  }

  private fun playableItem(mediaId: String, title: String, artworkUrl: String?): MediaItem =
    MediaItem.Builder()
      .setMediaId(mediaId)
      .setMediaMetadata(playableMetadata(title, artworkUrl))
      .build()

  // MARK: - Play URL resolution

  private data class ResolvedMedia(val uri: String, val title: String, val artworkUrl: String?)

  /**
   * Rebuild an incoming browse MediaItem with a playable URI + now-playing metadata resolved from
   * the cache, or null when the id has no resolvable URL. mediaIds are `download/<idText>`,
   * `library/<kind>/<idText>`, or `queue/<idText>`; the trailing segment is the idText.
   */
  private fun resolveForPlayback(item: MediaItem): MediaItem? {
    val idText = item.mediaId.substringAfterLast('/')
    val resolved = resolvePlayable(idText) ?: return null
    return item
      .buildUpon()
      .setUri(Uri.parse(resolved.uri))
      .setMediaMetadata(playableMetadata(resolved.title, resolved.artworkUrl))
      .build()
  }

  /**
   * Resolve an idText to a playable URL using the SAME preference as the phone engine: an offline
   * download's local file first, otherwise a remote enclosure URL from downloads or the queue. No
   * network is required for offline items. Returns null when nothing resolves.
   */
  private fun resolvePlayable(idText: String): ResolvedMedia? {
    val download = readDownloadEntries().firstOrNull { it.idText == idText }
    if (download != null) {
      val uri = fileUriOrRemote(download.filePath, download.mediaUrl)
      if (uri != null) return ResolvedMedia(uri, download.title, download.artworkUrl)
    }
    val queueEntry = readQueueSnapshot().entries.firstOrNull { it.idText == idText }
    val queueUrl = queueEntry?.mediaUrl?.takeIf { it.isNotBlank() }
    if (queueEntry != null && queueUrl != null) {
      return ResolvedMedia(queueUrl, queueEntry.title, queueEntry.artworkUrl)
    }
    return null
  }

  /** Prefer the local file (as a `file://`/`content://` URI) so offline items never touch network. */
  private fun fileUriOrRemote(filePath: String, mediaUrl: String?): String? {
    if (filePath.isNotBlank()) {
      return if (filePath.startsWith("file://") || filePath.startsWith("content://")) filePath
      else "file://$filePath"
    }
    return mediaUrl?.takeIf { it.isNotBlank() }
  }

  private fun playableMetadata(title: String, artworkUrl: String?): MediaMetadata =
    MediaMetadata.Builder()
      .setIsBrowsable(false)
      .setIsPlayable(true)
      .setTitle(title)
      .apply { artworkUrl?.let { setArtworkUri(Uri.parse(it)) } }
      .build()

  /** Slice by Media3 `page`/`pageSize` so large libraries don't overflow one response. */
  private fun <T> pageSlice(items: List<T>, page: Int, pageSize: Int): List<T> {
    if (pageSize <= 0 || page < 0) return items
    val from = page * pageSize
    if (from >= items.size) return emptyList()
    return items.subList(from, minOf(from + pageSize, items.size))
  }

  private companion object {
    const val ROOT_ID = "podverse_root"
    const val LIBRARY_ID = "library"
    const val DOWNLOADS_ID = "downloads"
    const val DOWNLOAD_ITEM_PREFIX = "download/"
    const val TAG = "PodverseMediaLibrary"
  }
}
