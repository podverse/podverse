**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# 20 — Locate, adopt, and delete v4 download files (mobile)

## Rows

R10, R11, R17

This plan supplies the file-system half those rows need. Area D (plans 40–49) decides when a file
is adopted or deleted; this plan only provides the helpers and never calls them at launch.

## Runs after

none

## Files

apps/mobile/modules/podverse-legacy-storage/expo-module.config.json
apps/mobile/modules/podverse-legacy-storage/android/build.gradle
apps/mobile/modules/podverse-legacy-storage/android/src/main/java/expo/modules/podverselegacystorage/PodverseLegacyStorageModule.kt
apps/mobile/modules/podverse-legacy-storage/src/PodverseLegacyStorageModule.ts
apps/mobile/modules/podverse-legacy-storage/index.ts
apps/mobile/src/migration/v4/v4DownloadNames.ts
apps/mobile/src/migration/v4/v4DownloadNames.test.ts
apps/mobile/src/migration/v4/v4DownloadFiles.ts
apps/mobile/vitest.config.ts

## Where v4 put its files (researched, settled)

Legacy sources: `../podverse-rn/src/lib/downloader.ts`, `downloadedPodcast.ts`, `hash.ts`,
`src/screens/SettingsScreenDownloads.tsx`, and
`node_modules/@kesha-antonov/react-native-background-downloader` 3.1.2.

- **File name.** Always `${episode.id}${ext}`, where `ext = getExtensionFromUrl(episode.mediaUrl)`
  from `podverse-shared` (`dist/urls.js`). Add by RSS episodes use the same pattern; their
  `episode.id` is `downloadCustomFileNameId(enclosure.url)` (base64 of the URL path with the query
  removed, cut to 250 minus the extension length). Base64 can contain `/`, so an Add by RSS key
  can name a nested path. This plan calls `${id}${ext}` the **file key**.
- **`getExtensionFromUrl` quirks, ported exactly:** split on the first `?` only (a `#` fragment
  stays); take the last `/` segment; when that segment is empty return `.mp3`; otherwise return
  `.` + the text after the last `.` in it. A segment with no `.` returns `.` + the whole segment
  (`https://x.test/media/abc` → `.abc`). Case is kept (`.MP3`).
- **iOS folder.** The downloader's `documents` is `NSDocumentDirectory`, the same folder as Expo's
  `FileSystem.documentDirectory`. v5 downloads live in its `downloads/` subfolder, so v4 files are
  top-level siblings of it.
- **Android folder.** The downloader's `documents` is `getExternalFilesDir(null)`
  (`/storage/emulated/<user>/Android/data/<package>/files`). It falls back to `getFilesDir()`
  (Expo's `documentDirectory`) only when external storage is unavailable. Expo exposes neither the
  external files dir nor a way to compute it, so this plan adds a native accessor.
- **Android listener-chosen folder.** AsyncStorage `EXT_STORAGE_DLOAD_LOCATION`:
  - Android 10+: a SAF tree URI from `ScopedStorage.openDocumentTree(true)`, so the grant is
    persisted to the package and survives an in-place update. v4 downloaded to
    `RNFS.TemporaryDirectoryPath` (`getCacheDir()` = Expo's `cacheDirectory`), then
    `ScopedStorage.createFile(tree, '${id}${ext}', 'audio/mpeg')`, copied, and unlinked the temp.
  - Android 9: a plain path, `RNFS.ExternalStorageDirectoryPath`. v5 declares no storage
    permission, so that path is not readable. In practice v4's SAF call on a plain path failed and
    the file stayed in the cache folder.
- **SAF names.** The external-storage provider rewrites the display name: characters
  `"*/:<>?\|` and control characters become `_`; when the extension's MIME type is not
  `audio/mpeg` it appends `.mp3` (`abc.m4a` → `abc.m4a.mp3`); a name clash inserts ` (1)` before
  the final extension (`abc (1).mp3`, `abc.m4a (1).mp3`).
- **In-progress downloads.** iOS used a background `NSURLSession`; after an update v5 does not
  own that session and the system discards its temp files, so no partial file reaches the
  documents folder. Android used the system `DownloadManager`, which keeps running after the app
  is replaced and can finish later, writing `${id}${ext}` into the external files dir.
- **Reachability with Expo.** `expo-file-system/legacy` 58 grants file access outside the app's
  internal folders by `File.canRead()` / `canWrite()`, which the app's own external files dir
  passes on every Android version. SAF URIs whose host starts with
  `com.android.externalstorage` support `StorageAccessFramework.readDirectoryAsync`, `copyAsync`
  from SAF to a file path, `getInfoAsync`, and `deleteAsync`. `moveAsync` between the external
  files dir and the internal files dir fails (`File.renameTo` across volumes), so a move falls
  back to copy then delete.

## Native module: `podverse-legacy-storage` (Android only)

Copy the layout of `apps/mobile/modules/podverse-perf-probe` (gradle file, lazy JS accessor),
with no `ios/` folder.

- `expo-module.config.json`: `"platforms": ["android"]`, Android module
  `expo.modules.podverselegacystorage.PodverseLegacyStorageModule`.
- `android/build.gradle`: the perf probe's file with group and namespace
  `expo.modules.podverselegacystorage`.
- `PodverseLegacyStorageModule.kt`, `Name("PodverseLegacyStorage")`, two async functions:
  - `getExternalFilesDirectoryAsync(): String?` returns
    `context.getExternalFilesDir(null)?.absolutePath`.
  - `removeUnfinishedDownloadJobsAsync(): Int` queries this app's `DownloadManager` entries with
    status pending, running, paused, or failed, keeps only entries whose `COLUMN_LOCAL_URI` is null
    or a `file:` URI inside the external files dir or the cache dir, calls
    `DownloadManager.remove(...)` on them (which also deletes their partial files), and returns the
    count removed. `DownloadManager.Query` only returns the calling app's entries. v5 itself does
    not use `DownloadManager`; the path filter keeps this from touching anything a later feature
    queues elsewhere.
- `src/PodverseLegacyStorageModule.ts`: the perf probe's lazy `require('expo-modules-core')`
  pattern, returning null when the module is not linked (iOS, a stale dev client, Node tests).
- `index.ts` exports:
  - `getAndroidExternalFilesDirectory(): Promise<string | null>` — null on iOS, when unlinked, or
    on a thrown native error.
  - `removeUnfinishedAndroidDownloadJobs(): Promise<number>` — 0 on iOS, when unlinked, or on a
    thrown error.

A native rebuild is required (`npm run mobile:prebuild` and a dev-client rebuild). That is
expected; do not route around it.

## Pure module: `src/migration/v4/v4DownloadNames.ts`

No React Native or Expo imports, so vitest covers it. Exports:

- `V4FileRootKind = 'app_external_files' | 'app_documents' | 'app_cache'`.
- `v4ExtensionFromUrl(url: string): string` — the exact port above.
- `v4FileKey(episodeId: string, legacyExtension: string): string` — `${episodeId}${legacyExtension}`.
- `isSafeV4FileKey(fileKey: string): boolean` — false when empty, when it starts with `/`, when it
  contains `\` or a NUL, or when any `/` segment is empty, `.`, or `..`. Every helper that joins a
  key onto a folder checks this first, because the helpers delete files.
- `V4_MEDIA_EXTENSIONS`: `mp3`, `m4a`, `m4b`, `mp4`, `m4v`, `aac`, `ogg`, `oga`, `opus`, `wav`,
  `flac`, `webm`, `mov`, `mpga`, `mpeg`, `3gp`, `mkv` (lowercase, no dot).
- `isV4OrphanMediaName(name: string): boolean` — a top-level file name (no `/`) that passes
  `isSafeV4FileKey` and whose text after the last `.`, lowercased, is in `V4_MEDIA_EXTENSIONS`.
- `legacyExtensionOfName(name: string): string` — `.` + text after the last `.`, or `''`.
- `v5FileExtensionForV4(legacyExtension: string): string | null` — the extension without the dot,
  lowercased, when it is in `V4_MEDIA_EXTENSIONS`; otherwise null. This is the
  `fileExtension` value area D passes to `buildDownloadFileName` (`src/downloads/downloadStorage.ts`).
- `V4SharedFolder = { kind: 'saf_tree'; uri: string } | { kind: 'path'; uri: string } |
  { kind: 'unsupported' }` and `classifyV4SharedFolder(value: string | null): V4SharedFolder | null`:
  trimmed empty or null → null; `content://` with host starting `com.android.externalstorage` →
  `saf_tree`; any other `content://` → `unsupported`; a value starting with `/` → `path` with
  `uri = 'file://' + value` (no trailing slash); anything else → `unsupported`.
- `safDocumentDisplayName(documentUri: string): string | null` — the text after the last
  `/document/`, URI-decoded (catch a decode error → null), then the text after the last `/`, or
  after the first `:` when there is no `/` (a document at the volume root).
- `fatSafeName(name: string): string` — replace `"*/:<>?\|` and code points below 0x20 or 0x7F
  with `_`.
- `matchesV4SharedFolderName(displayName: string, fileKey: string): boolean` — let
  `base = fatSafeName(fileKey)`; remove one ` (<digits>)` that sits directly before the final
  `.<ext>` of `displayName`; true when the result equals `base` or `${base}.mp3`.
- `nestedDirectoriesOf(fileKey: string): string[]` — the relative folder prefixes of a nested key,
  deepest first (`a/b/c.mp3` → `['a/b', 'a']`); empty for a top-level key.

## Expo module: `src/migration/v4/v4DownloadFiles.ts`

Uses `expo-file-system/legacy` (same import as `src/downloads/downloadManager.ts`), `Platform`,
and the native module. Never throws to its caller; every failure becomes a result value.

### Roots

```ts
export type V4DownloadRoots = {
  /** `FileSystem.documentDirectory`, with trailing slash. v5's `downloads/` lives here. */
  documentDirectory: string;
  /** Searched in this order for a staged file key. */
  fileRoots: { kind: V4FileRootKind; uri: string }[];
  sharedFolder: V4SharedFolder | null;
};

export const resolveV4DownloadRoots = (sharedFolderValue: string | null): Promise<V4DownloadRoots | null>;
```

- Returns null when `documentDirectory` is null.
- iOS `fileRoots`: `[{ app_documents, documentDirectory }]`. iOS ignores the shared folder value.
- Android `fileRoots`: `app_external_files` (from `getAndroidExternalFilesDirectory()`, as
  `file://<path>/`, omitted when null), then `app_documents`, then `app_cache` (`cacheDirectory`).
- `sharedFolderValue` is the raw `EXT_STORAGE_DLOAD_LOCATION` text. Area D reads it from plan 21's
  repository (`getSharedFolder()`) and passes it in, so this module has no SQLite import.
- A roots object caches the SAF folder listing in memory the first time it is read, so one pass
  lists the folder once. Create one roots object per pass.

### Locate

```ts
export type V4LocatedFile = {
  uri: string;
  place: V4FileRootKind | 'shared_folder';
  byteSize: number | null;
};

export type V4LocateResult =
  | { kind: 'already_adopted'; fileName: string; byteSize: number | null }
  | { kind: 'found'; file: V4LocatedFile; duplicates: V4LocatedFile[] }
  | { kind: 'not_found' }
  | { kind: 'unreachable'; reason: 'shared_folder_unreadable' | 'shared_folder_unsupported' };

export const locateV4DownloadFile = (
  entry: { fileKey: string; orphanRoot: V4FileRootKind | null; adoptedFileName: string | null },
  roots: V4DownloadRoots
): Promise<V4LocateResult>;
```

1. When `adoptedFileName` is set and `documentDirectory + 'downloads/' + adoptedFileName` exists,
   return `already_adopted`. This makes an adoption interrupted after the copy safe to resume.
2. When `isSafeV4FileKey(fileKey)` is false, return `not_found` without touching the disk.
3. An orphan entry (`orphanRoot` set) checks only that root.
4. Otherwise check every file root in order (`getInfoAsync`, exists and not a directory), then the
   shared folder:
   - `saf_tree`: list the folder once (`StorageAccessFramework.readDirectoryAsync`) and keep every
     document whose `safDocumentDisplayName` matches `matchesV4SharedFolderName`. A listing error
     marks the shared folder unreadable for this roots object.
   - `path`: `getInfoAsync(uri + '/' + fileKey)`; a thrown permission error marks it unreadable.
   - `unsupported`: marks it unsupported.
5. Collect every match across all places. The first match in search order is `file`; the rest are
   `duplicates` (a copy left in app storage after a SAF copy whose unlink failed, or a ` (1)`
   clash). Return `found` when there is at least one match, even if the shared folder was
   unreadable. With no match, return `unreachable` when the shared folder was unreadable or
   unsupported, else `not_found`.

### Adopt

```ts
export type V4AdoptResult =
  | { kind: 'adopted'; fileName: string; byteSize: number; sourceRemoved: boolean }
  | { kind: 'target_exists'; fileName: string }
  | { kind: 'failed'; reason: 'invalid_target' | 'source_missing' | 'insufficient_space' | 'copy_failed' };

export const adoptV4DownloadFile = (
  located: Extract<V4LocateResult, { kind: 'found' }>,
  targetFileName: string,
  roots: V4DownloadRoots
): Promise<V4AdoptResult>;
```

- `targetFileName` comes from `buildDownloadFileName(itemIdText, fileExtension)` in
  `src/downloads/downloadStorage.ts`, chosen by area D. It must equal
  `toStoredDownloadFileName(targetFileName)` and be non-empty, or the result is `invalid_target`.
- Make `documentDirectory + 'downloads/'` with `makeDirectoryAsync({ intermediates: true })`.
- When the target already exists, return `target_exists` and change nothing. Area D decides
  whether that is the same item already downloaded in v5.
- iOS and Android app roots: try `moveAsync`. When it throws, check free space
  (`getFreeDiskStorageAsync()` against the source size; less space → `insufficient_space`), then
  `copyAsync`, confirm the target exists with the source's size, and `deleteAsync` the source.
- Shared folder (SAF): check free space the same way, `copyAsync` from the document URI to the
  target path, confirm the target exists and is non-empty, then `deleteAsync` the document.
- A copy that fails or leaves a wrong-sized target deletes the partial target and returns
  `copy_failed`. A source that vanished before the move returns `source_missing`.
- After success, delete every duplicate best effort and prune empty nested folders (below).
  `sourceRemoved` is false when the source delete failed after a good copy; the adopted file is
  still valid.
- Return the stored name (`fileName`, never an absolute path) and the target's byte size.

### Delete

```ts
export type V4DeleteResult = { kind: 'deleted'; bytes: number } | { kind: 'failed'; deletedCount: number };

export const deleteV4DownloadFile = (
  located: Extract<V4LocateResult, { kind: 'found' }>,
  roots: V4DownloadRoots
): Promise<V4DeleteResult>;
```

- Delete `file` and every duplicate (`deleteAsync` with `idempotent: true`; a SAF document URI goes
  through the same call). `bytes` sums the known sizes. Any failure returns `failed` with how many
  were deleted.
- After a file-root delete, prune empty nested folders: for each `nestedDirectoriesOf(fileKey)`,
  deepest first, under that same root, delete the folder only when `readDirectoryAsync` returns no
  entries. Never delete a root, and never a top-level folder named `downloads`.

### Orphans

```ts
export type V4OrphanFile = { fileKey: string; root: V4FileRootKind };

export const listV4OrphanFiles = (
  roots: V4DownloadRoots,
  knownFileKeys: ReadonlySet<string>
): Promise<V4OrphanFile[]>;
```

- Reads only `app_external_files` and `app_documents`, top level only, regular files only, names
  passing `isV4OrphanMediaName`, and not in `knownFileKeys`.
- Never reads `app_cache` (v5 writes share temp files there with ordinary media names) or the
  shared folder (the listener may have chosen a folder that holds their own media).
- A root that fails to list contributes nothing.

### Unfinished Android jobs

Re-export `removeUnfinishedAndroidDownloadJobs` from this module so area D imports file helpers
from one place. Area D calls it before locating staged `downloading` entries, so a v4 transfer
cannot finish into the folder after its entry is settled.

## What stays true

- No helper here runs at launch or on its own. Plan 21 calls only `resolveV4DownloadRoots` and
  `listV4OrphanFiles` during the one-time read, and those only read.
- A path built from a file key is always checked with `isSafeV4FileKey` before any disk call.
- The helpers never request a storage permission or open a picker. A folder v5 cannot read is
  reported as `unreachable`.
- Stored names stay file names under `downloads/`, never absolute paths (the iOS container UUID
  changes on update; see `toStoredDownloadFileName`).
- Logs, if any, carry counts only — no file keys, URLs, or folder URIs.

## Tests

- New `apps/mobile/src/migration/v4/v4DownloadNames.test.ts` (vitest, node), added to the
  `include` list in `apps/mobile/vitest.config.ts` beside `parseV4LocalState.test.ts`, with one
  line in that file's header comment naming the module. Cases:
  - `v4ExtensionFromUrl`: plain `.mp3`; query removed; `#` kept (`ep.mp3#t=1` → `.mp3#t=1`);
    upper case kept; trailing slash → `.mp3`; no dot in the last segment → `.` + segment.
  - `isSafeV4FileKey`: accepts a nested base64 key; rejects `../x.mp3`, `a/../b.mp3`, `/x.mp3`,
    `a//b.mp3`, an empty key, and a backslash.
  - `classifyV4SharedFolder`: SAF tree, other provider, plain path, empty, junk.
  - `safDocumentDisplayName`: a nested document id, a volume-root document id, a bad escape.
  - `matchesV4SharedFolderName`: exact; `.mp3` appended; ` (1)` before the extension; both
    together (`abc.m4a (1).mp3`); a base64 `/` stored as `_`; a different id that shares a prefix
    does not match.
  - `isV4OrphanMediaName` and `v5FileExtensionForV4`: known and unknown extensions, case.
  - `nestedDirectoriesOf`: top-level and two-deep keys.
- `v4DownloadFiles.ts` and the Kotlin module have no unit tests (Expo and native). Area E's
  Maestro path exercises them on both platforms.

## Release scratchpad

```markdown
## Native module for reading v4 download folders

- Surfaces: mobile
- Change: adds the Android-only local Expo module `podverse-legacy-storage`. It reports the app's
  external files folder and can remove the app's unfinished system download jobs. v4 kept
  downloads in that folder. Nothing calls it yet on its own; the v4 download carryover uses it.
- Who notices: no listener-visible change from this entry alone
- Operator steps: rebuild the dev client and store builds (`npm run mobile:prebuild`)
```
