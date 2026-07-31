import Foundation

// Native-cache payload parser for the CarPlay browse tree (master step 12.8 / detail 387). Swift
// mirror of Android's `PodverseNativeCacheModel.kt` (12.12 / 12.14) so both cars decode the SAME
// JSON envelopes written by `apps/mobile/src/data/nativeCache/projection.ts` (schema 12.1 / 380).
//
// JS-dead contract: these payloads are the ONLY browse source in the car (SQLite is phone-UI-only
// and unavailable when the JS runtime is suspended). Parsing is deliberately tolerant — unknown
// keys are ignored, a missing/mismatched `schemaVersion` yields an empty list, and any malformed
// entry is skipped rather than throwing, so the CarPlay scene renders an empty tree (never crashes)
// when the cache is absent or corrupt.
enum PodverseCarPlayCacheModel {
  // Must match NATIVE_CACHE_SCHEMA_VERSION in projection.ts and EXPECTED_SCHEMA_VERSION in the
  // Android model. Additive optional fields do NOT bump this; only a breaking payload change does.
  static let expectedSchemaVersion = 1

  /// A browsable library node (podcast / playlist / category). See `NativeCacheBrowseNode`.
  struct BrowseNode {
    let idText: String
    let title: String
    let kind: String
    let artworkUrl: String?
    let childCount: Int?
  }

  /// A completed offline download, playable from its local file path. See `NativeCacheDownloadEntry`.
  struct DownloadEntry {
    let idText: String
    let title: String
    let filePath: String
    let artworkUrl: String?
    let mediaUrl: String?
  }

  /// Decode the `library-browse` payload into browse nodes. Empty list when JSON is nil/blank, the
  /// schemaVersion is absent/mismatched, or the payload is unparseable. Nodes missing `idText` or
  /// `title` are skipped.
  static func parseBrowseNodes(_ json: String?) -> [BrowseNode] {
    guard let root = decodeEnvelope(json, label: "library-browse"),
      let array = root["nodes"] as? [Any]
    else { return [] }
    var nodes: [BrowseNode] = []
    nodes.reserveCapacity(array.count)
    for element in array {
      guard let obj = element as? [String: Any],
        let idText = nonBlankString(obj["idText"]),
        let title = nonBlankString(obj["title"])
      else { continue }
      nodes.append(
        BrowseNode(
          idText: idText,
          title: title,
          kind: nonBlankString(obj["kind"]) ?? "podcast",
          artworkUrl: nonBlankString(obj["artworkUrl"]),
          childCount: intOrNil(obj["childCount"])))
    }
    return nodes
  }

  /// Decode the `downloads` payload into offline entries under the same tolerant rules as
  /// `parseBrowseNodes`. Entries missing `idText`, `title`, or `filePath` are skipped (a download
  /// with no local path is not playable offline).
  static func parseDownloadEntries(_ json: String?) -> [DownloadEntry] {
    guard let root = decodeEnvelope(json, label: "downloads"),
      let array = root["entries"] as? [Any]
    else { return [] }
    var entries: [DownloadEntry] = []
    entries.reserveCapacity(array.count)
    for element in array {
      guard let obj = element as? [String: Any],
        let idText = nonBlankString(obj["idText"]),
        let title = nonBlankString(obj["title"]),
        let filePath = nonBlankString(obj["filePath"])
      else { continue }
      entries.append(
        DownloadEntry(
          idText: idText,
          title: title,
          filePath: filePath,
          artworkUrl: nonBlankString(obj["artworkUrl"]),
          mediaUrl: nonBlankString(obj["mediaUrl"])))
    }
    return entries
  }

  /// Parse the JSON envelope and verify the schemaVersion. Returns the root object only when the
  /// version matches `expectedSchemaVersion`; otherwise logs once and returns nil so the caller
  /// renders an empty tree.
  private static func decodeEnvelope(_ json: String?, label: String) -> [String: Any]? {
    guard let json = json, !json.isEmpty, let data = json.data(using: .utf8) else { return nil }
    guard let object = try? JSONSerialization.jsonObject(with: data),
      let root = object as? [String: Any]
    else {
      NSLog("[native-cache] %@ parse failed", label)
      return nil
    }
    let version = intOrNil(root["schemaVersion"]) ?? -1
    guard version == expectedSchemaVersion else {
      NSLog(
        "[native-cache] %@ schemaVersion=%d (expected %d) — empty tree", label, version,
        expectedSchemaVersion)
      return nil
    }
    return root
  }

  private static func nonBlankString(_ value: Any?) -> String? {
    guard let string = value as? String,
      !string.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    else { return nil }
    return string
  }

  private static func intOrNil(_ value: Any?) -> Int? {
    if let number = value as? NSNumber { return number.intValue }
    if let int = value as? Int { return int }
    return nil
  }
}
