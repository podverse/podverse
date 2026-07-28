import CarPlay
import Foundation

// CarPlay scene entry point (master steps 12.7 scene + 12.8 browse / details 386, 387).
//
// The Next app is a CarPlay *audio* app: iOS instantiates this delegate for the CarPlay scene role
// declared in Info.plist (`UIApplicationSceneManifest` → `CPTemplateApplicationSceneSessionRole
// Application`) even when the phone app has never been foregrounded / is force-quit. This class is
// referenced by name from Info.plist, so it must stay `@objc(PodverseCarPlaySceneDelegate)` and
// resolvable in the Objective-C runtime (it compiles into the PodverseMediaEngine pod).
//
// Browse IA mirrors the shipped Android Auto v1 tree (PodverseMediaLibraryService, details 391 /
// 393): a root list with **Library** and/or **Downloads**, each omitted when its native-cache
// payload is empty. Library nodes are browsable (grandchildren empty until richer cache, 12.22 —
// same as Android). Download rows are playable; their select hook is completed by step 3
// (12.9 / 12.15 play + now-playing). No SQLite and no network here — cache JSON only, JS may be dead.
@objc(PodverseCarPlaySceneDelegate)
public final class PodverseCarPlaySceneDelegate: NSObject, CPTemplateApplicationSceneDelegate {
  private var interfaceController: CPInterfaceController?

  public func templateApplicationScene(
    _ templateApplicationScene: CPTemplateApplicationScene,
    didConnect interfaceController: CPInterfaceController
  ) {
    self.interfaceController = interfaceController

    // Cold-connect read: confirms the shared App Group cache is loadable without JS (12.5 / 12.7).
    PodverseNativeCache.debugDump()

    interfaceController.setRootTemplate(makeRootTemplate(), animated: false, completion: nil)
  }

  public func templateApplicationScene(
    _ templateApplicationScene: CPTemplateApplicationScene,
    didDisconnectInterfaceController interfaceController: CPInterfaceController
  ) {
    if self.interfaceController === interfaceController {
      self.interfaceController = nil
    }
  }

  // MARK: - Browse tree (12.8) — mirrors Android rootChildren / libraryChildren / downloadChildren

  /// Root list: a `Library` row and/or a `Downloads` row, each omitted when its cache is empty.
  /// Native labels are used because there is no i18next runtime when JS is dead (same note as
  /// Android detail 391 — localized labels would have to be projected into the cache, future work).
  private func makeRootTemplate() -> CPListTemplate {
    let browseNodes = readBrowseNodes()
    let downloads = readDownloadEntries()

    var items: [CPListItem] = []
    if !browseNodes.isEmpty {
      let library = CPListItem(text: "Library", detailText: nil)
      library.handler = { [weak self] _, completion in
        self?.pushLibrary(browseNodes)
        completion()
      }
      items.append(library)
    }
    if !downloads.isEmpty {
      let downloadsItem = CPListItem(text: "Downloads", detailText: nil)
      downloadsItem.handler = { [weak self] _, completion in
        self?.pushDownloads(downloads)
        completion()
      }
      items.append(downloadsItem)
    }

    let section = CPListSection(items: items)
    return CPListTemplate(title: "Podverse", sections: [section])
  }

  /// One browsable row per cached library node; tapping pushes an (empty) grandchild list until the
  /// richer library index lands (12.22) — identical behavior to Android's `libraryChildren`.
  private func pushLibrary(_ nodes: [PodverseCarPlayCacheModel.BrowseNode]) {
    let items = nodes.map { node -> CPListItem in
      let item = CPListItem(text: node.title, detailText: nil)
      item.handler = { [weak self] _, completion in
        self?.pushEmptyNode(title: node.title)
        completion()
      }
      return item
    }
    let template = CPListTemplate(title: "Library", sections: [CPListSection(items: items)])
    interfaceController?.pushTemplate(template, animated: true, completion: nil)
  }

  /// One playable row per offline download. The select hook is intentionally minimal — step 3
  /// (12.9 / 12.15) resolves the local `file://` path (or remote enclosure) and loads the single
  /// shared `PodverseAudioEngine`, then presents now-playing. Do not add play logic here.
  private func pushDownloads(_ entries: [PodverseCarPlayCacheModel.DownloadEntry]) {
    let items = entries.map { entry -> CPListItem in
      let item = CPListItem(text: entry.title, detailText: nil)
      item.handler = { [weak self] _, completion in
        self?.playDownload(entry)
        completion()
      }
      return item
    }
    let template = CPListTemplate(title: "Downloads", sections: [CPListSection(items: items)])
    interfaceController?.pushTemplate(template, animated: true, completion: nil)
  }

  // MARK: - Play (12.9 / 12.10 / 12.15) — one shared engine, one command center

  /// Play a cached download on the single shared `PodverseAudioEngine` and present CarPlay
  /// now-playing. `CPNowPlayingTemplate.shared` binds to `MPNowPlayingInfoCenter` +
  /// `MPRemoteCommandCenter`, both already owned by the engine (12.10) — no second player or command
  /// center is created here. Queue/auto-queue policy stays in `@podverse/playback-core` (JS); this is
  /// a single direct transport action for one cached item, matching Android `onAddMediaItems` (12.15).
  private func playDownload(_ entry: PodverseCarPlayCacheModel.DownloadEntry) {
    guard let url = resolvePlayableURL(filePath: entry.filePath, mediaUrl: entry.mediaUrl) else {
      // Soft-fail: a download with no local path (and no remote fallback) is not playable offline.
      NSLog("[carplay] download idText=%@ has no resolvable URL (soft-fail)", entry.idText)
      return
    }
    do {
      try PodverseAudioEngine.shared.loadAndStart(url: url, initialSeekSeconds: nil)
      PodverseAudioEngine.shared.setNowPlayingMetadata(title: entry.title)
      interfaceController?.pushTemplate(CPNowPlayingTemplate.shared, animated: true, completion: nil)
    } catch {
      NSLog("[carplay] play failed idText=%@: %@", entry.idText, error.localizedDescription)
    }
  }

  /// Resolve a cache entry to a playable URL with the SAME preference as Android 12.15
  /// (`fileUriOrRemote`): prefer the offline local file (as a `file://`/`content://` URI) so offline
  /// items never touch network, else fall back to a remote enclosure URL. Returns nil when neither
  /// exists.
  private func resolvePlayableURL(filePath: String, mediaUrl: String?) -> String? {
    if !filePath.isEmpty {
      if filePath.hasPrefix("file://") || filePath.hasPrefix("content://") { return filePath }
      return "file://" + filePath
    }
    if let mediaUrl = mediaUrl, !mediaUrl.isEmpty { return mediaUrl }
    return nil
  }

  /// Deeper hydration (a podcast's episodes) needs a richer cached index than today's library-browse
  /// projection — future work (12.22). Push an empty list so the drill-down never dead-ends (matches
  /// Android returning `emptyList()` for deeper parents).
  private func pushEmptyNode(title: String) {
    let template = CPListTemplate(title: title, sections: [CPListSection(items: [])])
    interfaceController?.pushTemplate(template, animated: true, completion: nil)
  }

  // MARK: - Cache reads (shared App Group container; JS may be dead)

  private func readBrowseNodes() -> [PodverseCarPlayCacheModel.BrowseNode] {
    PodverseCarPlayCacheModel.parseBrowseNodes(PodverseNativeCache.read(.libraryBrowse))
  }

  private func readDownloadEntries() -> [PodverseCarPlayCacheModel.DownloadEntry] {
    PodverseCarPlayCacheModel.parseDownloadEntries(PodverseNativeCache.read(.downloads))
  }
}
