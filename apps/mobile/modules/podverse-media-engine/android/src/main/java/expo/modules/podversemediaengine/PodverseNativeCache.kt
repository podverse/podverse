package expo.modules.podversemediaengine

import android.content.Context
import android.util.Log
import java.io.File
import org.json.JSONObject

// Durable native-cache storage.
//
// JS mirrors queue / downloads / library-browse snapshots into app-private files whenever phone-side
// state changes. Android Auto connects to PodverseMediaLibraryService (NOT the Activity), so the
// service reads these files with the app process killed and JS not running
// (DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md). Each payload carries a schemaVersion + updatedAtMs
// envelope; this layer stores opaque JSON and never re-decides queue policy (that stays in
// @podverse/playback-core). No Google Play Services dependency.

/** One persisted payload kind; [fileName] is the on-disk name under the cache directory. */
enum class PodverseNativeCacheKind(val fileName: String) {
  QUEUE("queue-snapshot.json"),
  DOWNLOADS("downloads-index.json"),
  LIBRARY_BROWSE("library-browse-index.json"),
}

object PodverseNativeCache {
  private const val TAG = "PodverseNativeCache"
  private const val DIR_NAME = "native-cache"

  private fun directory(context: Context): File =
    File(context.filesDir, DIR_NAME).apply {
      if (!exists()) {
        mkdirs()
      }
    }

  private fun file(context: Context, kind: PodverseNativeCacheKind): File =
    File(directory(context), kind.fileName)

  /**
   * Atomically persist a JSON payload. Best-effort: logs and returns `false` on failure so a bridge
   * write never rolls back the successful phone-side mutation that triggered it. Last-write-wins per
   * payload is acceptable for v1.
   */
  fun write(context: Context, kind: PodverseNativeCacheKind, json: String): Boolean {
    return try {
      val target = file(context, kind)
      val tmp = File(target.parentFile, ".${kind.fileName}.tmp")
      tmp.writeText(json, Charsets.UTF_8)
      // rename(2) replaces atomically on the app-private filesystem; fall back to direct write if a
      // particular device/filesystem refuses the rename over an existing file.
      if (tmp.renameTo(target)) {
        true
      } else {
        target.writeText(json, Charsets.UTF_8)
        tmp.delete()
        true
      }
    } catch (error: Exception) {
      Log.w(TAG, "write failed for ${kind.name}: ${error.message}")
      false
    }
  }

  /**
   * Read a persisted JSON payload with the app force-stopped for Android Auto browse.
   * Returns `null` when missing or unreadable; callers render an empty browse tree and never crash.
   */
  fun read(context: Context, kind: PodverseNativeCacheKind): String? {
    return try {
      val target = file(context, kind)
      if (target.exists()) target.readText(Charsets.UTF_8) else null
    } catch (error: Exception) {
      Log.w(TAG, "read failed for ${kind.name}: ${error.message}")
      null
    }
  }

  /**
   * Read every payload and log a one-line summary (presence, byte size, parsed `schemaVersion`).
   * Called from [PodverseMediaLibraryService.onCreate], which Android Auto / DHU starts WITHOUT the
   * Activity or JS runtime. Never throws.
   */
  fun debugDump(context: Context): String {
    val parts =
      PodverseNativeCacheKind.values().map { kind ->
        val label = kind.name.lowercase()
        val json = read(context, kind)
        if (json == null) {
          "$label=absent"
        } else {
          val bytes = json.toByteArray(Charsets.UTF_8).size
          "$label=present(bytes:$bytes,schemaVersion:${schemaVersion(json) ?: "?"})"
        }
      }
    val summary = "debugDump " + parts.joinToString(" ")
    Log.i(TAG, summary)
    return summary
  }

  private fun schemaVersion(json: String): Int? {
    return try {
      JSONObject(json).optInt("schemaVersion", -1).takeIf { it >= 0 }
    } catch (error: Exception) {
      null
    }
  }
}
