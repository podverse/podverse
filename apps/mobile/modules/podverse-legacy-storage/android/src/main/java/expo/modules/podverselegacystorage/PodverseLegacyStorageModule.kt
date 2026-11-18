package expo.modules.podverselegacystorage

import android.app.DownloadManager
import android.net.Uri
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * This app's external files directory, and removal of this app's unfinished system download jobs.
 * DownloadManager only returns jobs this app queued. A job whose local file is outside the
 * external files directory and the cache directory is left in place. A job with no local file yet
 * is removed, and removal also deletes its partial file.
 */
class PodverseLegacyStorageModule : Module() {
  override fun definition() =
    ModuleDefinition {
      Name("PodverseLegacyStorage")

      AsyncFunction("getExternalFilesDirectoryAsync") {
        appContext.reactContext?.getExternalFilesDir(null)?.absolutePath
      }

      AsyncFunction("removeUnfinishedDownloadJobsAsync") {
        try {
          removeUnfinishedDownloadJobs()
        } catch (_: Exception) {
          0
        }
      }
    }

  private fun removeUnfinishedDownloadJobs(): Int {
    val context = appContext.reactContext ?: return 0
    val manager = context.getSystemService(DownloadManager::class.java) ?: return 0
    val externalDir = context.getExternalFilesDir(null)?.absolutePath
    val cacheDir = context.cacheDir?.absolutePath
    val ids = unfinishedDownloadIds(manager, externalDir, cacheDir)
    if (ids.isEmpty()) {
      return 0
    }
    return manager.remove(*ids)
  }

  private fun unfinishedDownloadIds(
    manager: DownloadManager,
    externalDir: String?,
    cacheDir: String?,
  ): LongArray {
    val query =
      DownloadManager.Query()
        .setFilterByStatus(
          DownloadManager.STATUS_PENDING or
            DownloadManager.STATUS_RUNNING or
            DownloadManager.STATUS_PAUSED or
            DownloadManager.STATUS_FAILED,
        )
    val cursor = manager.query(query) ?: return longArrayOf()
    return cursor.use { rows ->
      val idColumn = rows.getColumnIndex(DownloadManager.COLUMN_ID)
      val uriColumn = rows.getColumnIndex(DownloadManager.COLUMN_LOCAL_URI)
      if (idColumn < 0) {
        longArrayOf()
      } else {
        val ids = ArrayList<Long>()
        while (rows.moveToNext()) {
          val localUri =
            if (uriColumn < 0 || rows.isNull(uriColumn)) {
              null
            } else {
              rows.getString(uriColumn)
            }
          if (shouldRemoveDownload(localUri, externalDir, cacheDir)) {
            ids.add(rows.getLong(idColumn))
          }
        }
        ids.toLongArray()
      }
    }
  }

  private fun shouldRemoveDownload(
    localUri: String?,
    externalDir: String?,
    cacheDir: String?,
  ): Boolean {
    if (localUri == null) {
      return true
    }
    val path = fileUriPath(localUri) ?: return false
    return isInsideDirectory(path, externalDir) || isInsideDirectory(path, cacheDir)
  }

  private fun fileUriPath(localUri: String): String? {
    val uri = Uri.parse(localUri)
    if (!uri.scheme.equals("file", ignoreCase = true)) {
      return null
    }
    return uri.path
  }

  private fun isInsideDirectory(path: String, directory: String?): Boolean {
    if (directory == null || directory.isEmpty()) {
      return false
    }
    val root = if (directory.endsWith("/")) directory.dropLast(1) else directory
    return path == root || path.startsWith("$root/")
  }
}
