import Foundation

// Durable native-cache storage (master step 12.2 / detail 381).
//
// JS mirrors queue / downloads / library-browse snapshots into these files whenever phone-side state
// changes (write path 12.4). A future CarPlay scene (12.7+) and the read spike (12.5) load them with
// the JS runtime NOT running, so the car experience works "get in the car, browse and play, phone
// app never opened" (DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md). Schema is owned by Track 12.1 / detail 380
// (each payload carries a `schemaVersion` + `updatedAtMs` envelope); this layer stores opaque JSON
// and never re-decides queue policy (that stays in `@podverse/playback-core`).

/// One persisted payload kind. `rawValue` is only for logging; on-disk name is `fileName`.
enum PodverseNativeCacheKind: String, CaseIterable {
  case queue
  case downloads
  case libraryBrowse

  var fileName: String {
    switch self {
    case .queue: return "queue-snapshot.json"
    case .downloads: return "downloads-index.json"
    case .libraryBrowse: return "library-browse-index.json"
    }
  }
}

enum PodverseNativeCache {
  // App Group container id for sharing the cache with a future CarPlay scene / extension (12.7+).
  // Nil until the CarPlay entitlement + App Group are provisioned (12.16). v1 uses the app's
  // Application Support container; setting this later transparently migrates reads/writes to the
  // shared group — do not introduce a second competing schema when that happens.
  static let appGroupIdentifier: String? = nil

  private static let directoryName = "native-cache"

  private static func baseDirectory() -> URL? {
    let fileManager = FileManager.default
    if let group = appGroupIdentifier,
      let container = fileManager.containerURL(forSecurityApplicationGroupIdentifier: group)
    {
      return container.appendingPathComponent(directoryName, isDirectory: true)
    }
    guard
      let support = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
    else {
      return nil
    }
    return support.appendingPathComponent(directoryName, isDirectory: true)
  }

  private static func fileURL(for kind: PodverseNativeCacheKind) -> URL? {
    guard let directory = baseDirectory() else { return nil }
    return directory.appendingPathComponent(kind.fileName, isDirectory: false)
  }

  /// Atomically persist a JSON payload string. Best-effort: logs and returns `false` on failure so a
  /// bridge write never rolls back the successful phone-side mutation that triggered it.
  @discardableResult
  static func write(_ kind: PodverseNativeCacheKind, json: String) -> Bool {
    guard let directory = baseDirectory(), let url = fileURL(for: kind) else {
      NSLog("[native-cache] no base directory for \(kind.rawValue)")
      return false
    }
    guard let data = json.data(using: .utf8) else {
      NSLog("[native-cache] non-utf8 payload for \(kind.rawValue)")
      return false
    }
    do {
      try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
      // `.atomic` writes to an auxiliary file and renames into place, so a concurrent reader never
      // sees a truncated file (last-write-wins per payload is acceptable for v1).
      try data.write(to: url, options: [.atomic])
      return true
    } catch {
      NSLog("[native-cache] write failed for \(kind.rawValue): \(error.localizedDescription)")
      return false
    }
  }

  /// Read a persisted JSON payload string with the JS runtime not running (spike 12.5, CarPlay 12.8).
  /// Returns `nil` when missing or unreadable; callers render an empty tree and never crash.
  static func read(_ kind: PodverseNativeCacheKind) -> String? {
    guard let url = fileURL(for: kind) else { return nil }
    do {
      let data = try Data(contentsOf: url)
      return String(data: data, encoding: .utf8)
    } catch {
      return nil
    }
  }

  /// Spike helper (step 12.5): read every payload and log a one-line summary (presence, byte size,
  /// parsed `schemaVersion`). Safe to call from a native entry point (e.g. a future CarPlay scene,
  /// 12.7) with the JS runtime not started — proves the cache is readable without JS. Never throws.
  @discardableResult
  static func debugDump() -> String {
    let parts = PodverseNativeCacheKind.allCases.map { kind -> String in
      guard let json = read(kind) else { return "\(kind.rawValue)=absent" }
      let version = schemaVersion(from: json).map(String.init) ?? "?"
      return "\(kind.rawValue)=present(bytes:\(json.utf8.count),schemaVersion:\(version))"
    }
    let summary = "[native-cache] debugDump " + parts.joined(separator: " ")
    NSLog("%@", summary)
    return summary
  }

  private static func schemaVersion(from json: String) -> Int? {
    guard let data = json.data(using: .utf8) else { return nil }
    let object = try? JSONSerialization.jsonObject(with: data)
    guard let dictionary = object as? [String: Any] else { return nil }
    return dictionary["schemaVersion"] as? Int
  }
}
