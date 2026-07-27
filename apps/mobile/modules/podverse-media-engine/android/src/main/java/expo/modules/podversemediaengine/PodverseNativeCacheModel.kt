package expo.modules.podversemediaengine

import android.util.Log
import org.json.JSONObject

// Native-cache payload parser for the Android Auto browse tree (master steps 12.12 / 12.14, details
// 391 / 393). Decodes the opaque JSON strings returned by PodverseNativeCache.read into typed nodes
// the MediaLibraryService maps to Media3 MediaItems.
//
// JS-dead contract: these payloads are the ONLY browse source in the car (SQLite is phone-UI-only).
// The TypeScript source of truth is apps/mobile/src/data/nativeCache/projection.ts (schema 12.1 /
// detail 380). Parsing is deliberately tolerant: unknown keys are ignored, a missing or mismatched
// schemaVersion yields an empty list, and any malformed entry is skipped rather than throwing — the
// service must render an empty tree, never crash, when the cache is absent/corrupt.
object PodverseNativeCacheModel {
  private const val TAG = "PodverseNativeCache"

  // Must match NATIVE_CACHE_SCHEMA_VERSION in projection.ts. Additive optional fields do NOT bump
  // this; only a breaking payload change does (then this constant + the readers move together).
  private const val EXPECTED_SCHEMA_VERSION = 1

  /** A browsable library node (podcast / playlist / category). See NativeCacheBrowseNode. */
  data class BrowseNode(
    val idText: String,
    val title: String,
    val kind: String,
    val artworkUrl: String?,
    val childCount: Int?,
  )

  /** A completed offline download, playable from its local file path. See NativeCacheDownloadEntry. */
  data class DownloadEntry(
    val idText: String,
    val title: String,
    val filePath: String,
    val artworkUrl: String?,
    val mediaUrl: String?,
  )

  /** A queue entry for car now-playing / resume. See NativeCacheQueueEntry. */
  data class QueueEntry(
    val idText: String,
    val title: String,
    val artworkUrl: String?,
    val mediaUrl: String?,
  )

  /** The queue snapshot: the now-playing id (if any) plus ordered entries. See QueueSnapshotProjection. */
  data class QueueSnapshot(
    val nowPlayingIdText: String?,
    val entries: List<QueueEntry>,
  )

  /**
   * Decode the `library-browse` payload into browse nodes. Returns an empty list when the JSON is
   * null/blank, the schemaVersion is absent or mismatched, or the payload is unparseable. Individual
   * nodes missing required fields (`idText`, `title`) are skipped.
   */
  fun parseBrowseNodes(json: String?): List<BrowseNode> {
    val root = decodeEnvelope(json, "library-browse") ?: return emptyList()
    val array = root.optJSONArray("nodes") ?: return emptyList()
    val nodes = ArrayList<BrowseNode>(array.length())
    for (i in 0 until array.length()) {
      val obj = array.optJSONObject(i) ?: continue
      val idText = obj.optString("idText").takeIf { it.isNotBlank() } ?: continue
      val title = obj.optString("title").takeIf { it.isNotBlank() } ?: continue
      val kind = obj.optString("kind").takeIf { it.isNotBlank() } ?: "podcast"
      nodes.add(
        BrowseNode(
          idText = idText,
          title = title,
          kind = kind,
          artworkUrl = optStringOrNull(obj, "artworkUrl"),
          childCount = if (obj.has("childCount") && !obj.isNull("childCount")) obj.optInt("childCount") else null,
        ))
    }
    return nodes
  }

  /**
   * Decode the `downloads` payload into offline entries. Returns an empty list under the same
   * tolerant rules as [parseBrowseNodes]; entries missing `idText`, `title`, or `filePath` are
   * skipped (a download with no local path is not playable offline).
   */
  fun parseDownloadEntries(json: String?): List<DownloadEntry> {
    val root = decodeEnvelope(json, "downloads") ?: return emptyList()
    val array = root.optJSONArray("entries") ?: return emptyList()
    val entries = ArrayList<DownloadEntry>(array.length())
    for (i in 0 until array.length()) {
      val obj = array.optJSONObject(i) ?: continue
      val idText = obj.optString("idText").takeIf { it.isNotBlank() } ?: continue
      val title = obj.optString("title").takeIf { it.isNotBlank() } ?: continue
      val filePath = obj.optString("filePath").takeIf { it.isNotBlank() } ?: continue
      entries.add(
        DownloadEntry(
          idText = idText,
          title = title,
          filePath = filePath,
          artworkUrl = optStringOrNull(obj, "artworkUrl"),
          mediaUrl = optStringOrNull(obj, "mediaUrl"),
        ))
    }
    return entries
  }

  /**
   * Decode the `queue` payload into a snapshot for car resume / now-playing. Returns an empty
   * snapshot (no now-playing, no entries) under the same tolerant rules as [parseBrowseNodes].
   * Entries missing `idText` or `title` are skipped; `mediaUrl` may be null until resolved.
   */
  fun parseQueueSnapshot(json: String?): QueueSnapshot {
    val root = decodeEnvelope(json, "queue") ?: return QueueSnapshot(null, emptyList())
    val nowPlayingIdText = optStringOrNull(root, "nowPlayingIdText")
    val array = root.optJSONArray("entries") ?: return QueueSnapshot(nowPlayingIdText, emptyList())
    val entries = ArrayList<QueueEntry>(array.length())
    for (i in 0 until array.length()) {
      val obj = array.optJSONObject(i) ?: continue
      val idText = obj.optString("idText").takeIf { it.isNotBlank() } ?: continue
      val title = obj.optString("title").takeIf { it.isNotBlank() } ?: continue
      entries.add(
        QueueEntry(
          idText = idText,
          title = title,
          artworkUrl = optStringOrNull(obj, "artworkUrl"),
          mediaUrl = optStringOrNull(obj, "mediaUrl"),
        ))
    }
    return QueueSnapshot(nowPlayingIdText, entries)
  }

  /**
   * Parse the JSON envelope and verify the schemaVersion. Returns the root object only when the
   * version matches [EXPECTED_SCHEMA_VERSION]; otherwise logs once and returns null so the caller
   * renders an empty tree.
   */
  private fun decodeEnvelope(json: String?, label: String): JSONObject? {
    if (json.isNullOrBlank()) return null
    return try {
      val root = JSONObject(json)
      val version = root.optInt("schemaVersion", -1)
      if (version != EXPECTED_SCHEMA_VERSION) {
        Log.i(TAG, "$label schemaVersion=$version (expected $EXPECTED_SCHEMA_VERSION) — empty tree")
        null
      } else {
        root
      }
    } catch (error: Exception) {
      Log.w(TAG, "$label parse failed: ${error.message}")
      null
    }
  }

  private fun optStringOrNull(obj: JSONObject, key: String): String? =
    if (obj.has(key) && !obj.isNull(key)) obj.optString(key).takeIf { it.isNotBlank() } else null
}
