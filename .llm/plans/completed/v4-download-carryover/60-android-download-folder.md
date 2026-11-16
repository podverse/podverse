**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

# 60 — Android chosen download folder

One change: Android can keep saving new downloads in the folder the previous app already saved, and a switch on the downloads settings screen turns that on or off. iOS has no switch. Turning the switch does not move or delete any file.

## Rows

R26

## Runs after

20, 32, 40, 42

Plan 20 adds `classifyV4SharedFolder`. Plan 32 edits `resolvePlaybackUrl.ts`, its test, and `PlaybackProvider.tsx`. Plan 40 edits the mobile catalog originals. Plan 42 edits `downloadManager.ts` and `downloads/README.md`, and it already runs after 20, 32, and 40. Edit those files only after that work is in the tree. Do not edit plans 20–51.

## Files

apps/mobile/src/downloads/chosenDownloadFolder.ts
apps/mobile/src/downloads/chosenDownloadFolder.test.ts
apps/mobile/src/downloads/chosenDownloadFolderWrite.ts
apps/mobile/src/downloads/downloadStorage.ts
apps/mobile/src/downloads/downloadStorage.test.ts
apps/mobile/src/downloads/downloadStorageStats.ts
apps/mobile/src/downloads/downloadManager.ts
apps/mobile/src/downloads/README.md
apps/mobile/src/prefs/downloadPrefs.ts
apps/mobile/src/lib/playback/resolvePlaybackUrl.ts
apps/mobile/src/lib/playback/resolvePlaybackUrl.test.ts
apps/mobile/src/lib/playback/planDownloadCompletePlaybackHandoff.ts
apps/mobile/src/lib/playback/planDownloadCompletePlaybackHandoff.test.ts
apps/mobile/src/playback/playbackSourceMarker.ts
apps/mobile/src/playback/PlaybackProvider.tsx
apps/mobile/src/screens/more/MoreSettingsDownloadsScreen.tsx
apps/mobile/e2e/settings-downloads.yaml
packages/i18n-catalog/mobile/originals/en-US.json
packages/i18n-catalog/mobile/originals/es.json
packages/i18n-catalog/mobile/originals/fr.json
packages/i18n-catalog/mobile/originals/el-GR.json
packages/i18n-catalog/mobile/overrides/es.json
packages/i18n-catalog/mobile/overrides/fr.json
packages/i18n-catalog/mobile/overrides/el-GR.json

`downloadManager.ts` and `PlaybackProvider.tsx` are large. Edit them by the symbols named below. Do not read either file straight through.

The three override files change only because `npm run i18n:compile` adds empty slots. Do not type translations into overrides.

No new native module, no new dependency, no SQLite migration, and no change to `android.package`. `expo-file-system` is already in the app. `src/downloads/**/*.test.ts` is already in `apps/mobile/vitest.config.ts`, so do not edit that config.

## What D5 means here

The previous app stored the listener's folder in AsyncStorage `EXT_STORAGE_DLOAD_LOCATION` (`../podverse-rn/src/screens/SettingsScreenDownloads.tsx`). On Android 10 and later that value is a Storage Access Framework tree URI (`content://` with host `com.android.externalstorage…`). On Android 9 it is a plain path. The v4 switch was on exactly when that key was set. Turning it off deleted every download and forgot the folder. Turning it on opened a folder picker, and on Android 9 it requested storage permission.

This plan keeps the saved folder and puts an on/off control in the UI:

- The control is Android-only. iOS never shows it and never writes a new download outside the private folder.
- Off: new downloads stay in the app's private folder, `documentDirectory/downloads/`.
- On: new downloads go to that saved folder when the saved value is a tree this app can write.
- Files already in the chosen folder stay there when the switch turns off. They still play and still delete.
- Turning the switch on does not move files that are already in the private folder.
- There is no folder picker and no storage-permission request. A plain path or any other URI is not a folder this app writes. The control stays hidden, and new downloads stay private.

The one-time carryover in plans 20–42 still copies a listed v4 file into `documentDirectory/downloads/` and deletes the source, including a file that lived in the chosen folder. Do not change `adoptV4DownloadFile`, `adoptCompletedFile`, or that copy. "Stay there" is the rule for this switch and for files this plan writes into the chosen folder after that.

Web has no local media files. Do not add a web, API, or management control.

## Reuse

- Folder kind: `classifyV4SharedFolder` in `apps/mobile/src/migration/v4/v4DownloadNames.ts` (plan 20). A usable folder is `{ kind: 'saf_tree', uri }` only. Pass `uri` to `createFileAsync` as the tree. Do not write a second parser.
- Settings switch: `SettingsSwitchRow` and `SettingsRowDescription` in `apps/mobile/src/components/form`, the same pair `MoreSettingsDownloadsScreen` already uses for auto download. Do not build a raw `Switch`.
- Prefs: `apps/mobile/src/prefs/downloadPrefs.ts` (`readStoredBoolean` / AsyncStorage). This switch is not a per-show default, so do not show the apply-to-existing dialog (`global-default-apply-to-existing` does not apply).
- File name and private path: `buildDownloadFileName` and `toStoredDownloadFileName` in `downloadStorage.ts`.
- SAF and delete: `expo-file-system/legacy`, the same import `downloadManager.ts` uses. `StorageAccessFramework.createFileAsync`, `copyAsync`, `getInfoAsync`, `deleteAsync`. Plan 20 already relies on `getInfoAsync` and `deleteAsync` for these document URIs.
- Playback and car: the engine and `PodverseMediaLibraryService.resolveDownloadFileUri` already return a stored `content://` URI unchanged. Do not edit the native module. Phone playback is the gap: several checks treat only `file://` as a local file.

## Stored path

`download.file_path` stays one text column. Two shapes:

- Private file: the file name only, as today (`toStoredDownloadFileName`). Readers join it under the current `documentDirectory`, because an iOS container id changes on update.
- Chosen folder: the full document URI returned by `createFileAsync` (`content://…`). Never pass that URI through `toStoredDownloadFileName`.

In `resolveStoredDownloadFilePath`, after trim: empty stays empty; a value that starts with `content://` is returned as that trimmed string and is not joined to `documentDirectory`; every other value keeps today's `downloads/` join. Do not special-case a stored `file://` path.

`isLocalDownloadUrl` in `downloadStorage.ts` is true for `file://` and `content://` only. A bare path stays false.

Replace the comment above the `filePath: toStoredDownloadFileName(result.uri)` write in `runTransfer`. A private file stores the file name. A chosen-folder file stores the document URI. Do not say that every stored value is a file name.

In the Storage section of `apps/mobile/src/downloads/README.md`, add that the transfer still writes the private file first, and that a finished Android download may then be copied into the saved document tree, with that document URI stored on the row. Leave the paragraphs other plans add in that file as they are.

Comments describe the code as it stands. Do not cite a plan number, a review label, or the previous app's screen.

## Pure rules — `chosenDownloadFolder.ts`

No React Native and no Expo import.

```ts
export type ChosenFolderKind = 'saf_tree' | 'path' | 'unsupported' | null;

export const chosenFolderSwitchState = (input: {
  platform: 'android' | 'ios' | 'other';
  folderKind: ChosenFolderKind;
  pref: string | null;
}): { visible: boolean; enabled: boolean } => { /* ... */ };
```

- `visible` is true only when `platform === 'android'` and `folderKind === 'saf_tree'`.
- `enabled` is true only when `visible` is true and `pref` is not the exact string `'false'`.
- `null`, `''`, `'true'`, and any other string mean on. The saved folder from the previous app therefore starts on, and only an explicit off turns it off.
- iOS, a missing folder, `path`, and `unsupported` are `{ visible: false, enabled: false }` even when `pref` is `'true'`.

`isChosenFolderDocumentUri(stored: string): boolean` is true when `stored.trim()` starts with `content://`.

`safCreateMimeType(fileExtension: string | null, enclosureMime: string | null): string`:

- Take `enclosureMime`, drop anything from the first `;`, trim, lowercase. If that value contains exactly one `/` and no whitespace, return it.
- Otherwise map the extension with the leading dot removed, lowercased: `mp3` / `mpeg` / `mpga` → `audio/mpeg`; `m4a` / `m4b` → `audio/mp4`; `aac` → `audio/aac`; `mp4` / `m4v` → `video/mp4`; `mov` → `video/quicktime`; `ogg` / `oga` → `audio/ogg`; `opus` → `audio/opus`; `wav` → `audio/wav`; `flac` → `audio/flac`; `webm` → `video/webm`; `3gp` → `video/3gpp`; `mkv` → `video/x-matroska`.
- Otherwise `application/octet-stream`.
- Do not force `audio/mpeg`. The document provider appends `.mp3` when the type is not the file's own type.

`sumChosenFolderBytes` adds `byteSize` for rows whose `status` is `'complete'`, whose `filePath` passes `isChosenFolderDocumentUri`, and whose `byteSize` is a finite number greater than 0. Every other row adds 0. This is how the settings meter counts those files. Do not list the listener's folder: it can hold files that are not downloads.

## Prefs — `downloadPrefs.ts`

Two AsyncStorage keys. Neither is cleared on sign-out (`clearSession`) and neither is added to `selectAsyncStorageKeysForApiSwitch`. Downloads are device data. An API-address change already calls `downloadManager.removeAll()`, which deletes each row's file, and then deletes the private `downloads/` directory.

- `downloads.chosen_folder` — `'true'` or `'false'`. Absent means the switch rule above.
- `EXT_STORAGE_DLOAD_LOCATION` — read only. Never `setItem`, never `removeItem`.

```ts
export const readChosenDownloadFolderSwitch = async (): Promise<{
  visible: boolean;
  enabled: boolean;
}> => { /* ... */ };

/** Tree URI when the switch is on and the saved value is `saf_tree`. Otherwise null. */
export const readChosenDownloadFolderTreeUri = async (): Promise<string | null> => { /* ... */ };

export const writeChosenDownloadFolderEnabled = async (enabled: boolean): Promise<void> => { /* ... */ };
```

`readChosenDownloadFolderSwitch` reads both keys, maps `Platform.OS` to `'android' | 'ios' | 'other'`, maps `classifyV4SharedFolder` to `ChosenFolderKind` (`null` when the classifier returns null), and returns `chosenFolderSwitchState`. `writeChosenDownloadFolderEnabled` writes only `downloads.chosen_folder`. `readChosenDownloadFolderTreeUri` returns `classified.uri` when the switch state is `enabled`, and null otherwise.

## Copy — `chosenDownloadFolderWrite.ts`

```ts
export const copyCompletedDownloadToChosenFolder = async (input: {
  treeUri: string;
  sourceUri: string;
  fileName: string;
  mimeType: string;
  sourceByteSize: number;
}): Promise<string | null> => { /* ... */ };
```

Never throws. Returns the new document URI, or null. Does not delete `sourceUri`.

1. `getFreeDiskStorageAsync`. When it returns a finite number smaller than `sourceByteSize`, return null without creating a file. When it throws, continue.
2. `StorageAccessFramework.createFileAsync(treeUri, fileName, mimeType)`.
3. `copyAsync` from `sourceUri` to that document URI.
4. `getInfoAsync` on the document. Accept it when `exists` is true and either `size` is not a number or `size === sourceByteSize`. A numeric `size` that differs is a failure.
5. On any failure, `deleteAsync` the document when one was created (`idempotent: true`), swallow that error, and return null.
6. On success, return the document URI.

No log line in this function. The caller logs once.

## Where a new download lands — `runTransfer` in `downloadManager.ts`

The resumable still targets `buildDownloadFilePath(documentDirectory, fileName)` for the whole transfer, including pause and resume. Do not point `createDownloadResumable` at a `content://` URI.

After `validateDownloadTransfer` succeeds, and before the `applyChange` that sets `status: 'complete'`:

1. `storedPath = toStoredDownloadFileName(result.uri)`.
2. `treeUri = await readChosenDownloadFolderTreeUri()`.
3. When `treeUri` is not null, call `copyCompletedDownloadToChosenFolder` with that tree, `result.uri`, `buildDownloadFileName(itemIdText, record.fileExtension)`, `safCreateMimeType(record.fileExtension, record.enclosureMime)`, and the validated `byteSize`.
4. When the copy returns a document URI, `storedPath` becomes that URI. When it returns null, keep the private file name and `console.warn` the static string `[downloads] chosen folder copy failed` once, with the same `eslint-disable-next-line no-console` the file already uses for a similar warning. Do not log the URI, the file name, or the thrown value.
5. `applyChange` with that `storedPath` and `status: 'complete'`, then `pinShowNotesForDownload`, then delete the private file only when `storedPath` starts with `content://`: `deleteAsync(result.uri, { idempotent: true })`. Swallow a delete failure and do not change the row. A leftover private file is invisible; an extra document in the listener's folder would not be.
6. Then `maybeAutoDelete`, as today.

A download that is still queued, downloading, or paused is not copied and is not moved when the switch flips. The switch is read only at this success point. `adoptCompletedFile` records a file that is already in the private folder and must not call the copy. `enqueue` still de-dupes a `complete` row, so a second transfer does not start for an episode that already has a file.

`absoluteDownloadPath` already calls `resolveStoredDownloadFilePath`. After the resolver change, `eraseDownload`, `remove`, `removeAll`, and the API-address clear delete a `content://` document with `deleteAsync`. Do not add a folder listing on delete. Delete only the URI stored on the row.

`reconcileInterruptedDownloads` stays as it is. A row is not `complete` until the document URI or the private name is stored.

## Play

`resolveLocalDownloadPlaybackUrl` in `resolvePlaybackUrl.ts`:

- A `content://` path that `getInfoAsync` reports as `exists` is returned as that URI.
- When `getInfoAsync` throws on a `content://` path, return the URI and do not call `markFileMissing`. A thrown stat is not proof the document is gone.
- When `getInfoAsync` reports `exists: false`, keep today's missing path (`markFileMissing`, return null), for a private file and for a document URI.
- Do not change `playbackUrlForEpisode` or the `localFileOnly` branch. A document URI returned from `resolveLocalDownloadPlaybackUrl` already flows through that branch.

`planDownloadCompletePlaybackHandoff`: `isLocalFileUrl` becomes `isLocalDownloadUrl` from `downloadStorage.ts`. A finished chosen-folder download of the item that is streaming swaps to that document URI the same way a private file swaps to `file://`. A bare path still returns null. Update the comment that says `filePath` must be a `file://` URL.

`playbackSourceMarkerFromUrl`: a `content://` URL is `'local'`, via `isLocalDownloadUrl`. A remote http(s) URL stays `'remote'`.

`PlaybackProvider.tsx`: in the `localMatchesSelection` expression, replace `resolved.startsWith('file://')` with `isLocalDownloadUrl(resolved)`. Import it from `../downloads/downloadStorage`. Do not edit `startAddByRssPlayback`.

Add-by-RSS credential checks already treat only `http(s)` as remote, so a document URI gets no `Authorization` header. Do not change that module. `buildItemFromEngineMeta` already offers an enclosure only for `http(s)`. Do not change it.

## Settings screen

`MoreSettingsDownloadsScreen`. Load the switch in the existing mount effect, next to the auto-download reads. Start from `{ visible: false, enabled: false }`. If the read throws, leave it hidden. The rest of the screen does not wait on it.

When `visible` is true, render one `Card` (`padded={false}`) inside `styles.cardStack`, after the storage card and before the auto-download card. The stack's `settingsCardGap` is the space. No section heading: the switch title is the label.

- Card `testID`: `more-settings-downloads-chosen-folder`
- Row `testID`: `more-settings-downloads-chosen-folder-row`
- `switchTestID`: `more-settings-downloads-chosen-folder-switch`
- Title: `t('settings.downloads.chosen_folder')`
- Description: `SettingsRowDescription` with `t('settings.downloads.chosen_folder_description')`
- `value`: the loaded `enabled` flag

`onValueChange`: if a write is already in flight, return. Write the boolean. On success, set `enabled` to that boolean and clear the error. On failure, leave `enabled` unchanged and set the error to `t('settings.downloads.chosen_folder_save_failed')`. The switch is controlled, so a failed write does not stick. Do not move files, do not open a dialog, and do not request a permission.

When the error string is set, a `Text` under the row, `testID` `more-settings-downloads-chosen-folder-error`, `accessibilityLiveRegion="polite"`, `typography.body`, `themeStyles.textSecondary.color`, horizontal padding `tokens.spacing.lg`, bottom padding `tokens.spacing.lg`. Unmount it when there is no error.

The control is available signed out. Do not call `openGate`. Do not change `settings.groups.downloads_description`; that line is on every platform and this card is often absent.

## Catalog

Add these keys on `settings.downloads` in all four originals, immediately after `delete_all_confirm_body`. Then run `npm run i18n:compile` from the repo root.

en-US:

- `chosen_folder`: `Chosen Download Folder`
- `chosen_folder_description`: `When on, new downloads go to the folder saved from the previous app. When off, new downloads go to this app's private folder. Files already in that folder stay there, and you can still play and delete them.`
- `chosen_folder_save_failed`: `Couldn't save that setting. Try again.`

es:

- `chosen_folder`: `Carpeta de descarga elegida`
- `chosen_folder_description`: `Si está activada, las descargas nuevas van a la carpeta guardada de la aplicación anterior. Si está desactivada, las descargas nuevas van a la carpeta privada de esta aplicación. Los archivos que ya están en esa carpeta se quedan ahí, y puedes reproducirlos y eliminarlos.`
- `chosen_folder_save_failed`: `No se pudo guardar ese ajuste. Inténtalo de nuevo.`

fr:

- `chosen_folder`: `Dossier de téléchargement choisi`
- `chosen_folder_description`: `Si l'option est activée, les nouveaux téléchargements vont dans le dossier enregistré par l'application précédente. Si elle est désactivée, les nouveaux téléchargements vont dans le dossier privé de cette application. Les fichiers déjà dans ce dossier y restent, et vous pouvez toujours les lire et les supprimer.`
- `chosen_folder_save_failed`: `Impossible d'enregistrer ce réglage. Réessayez.`

el-GR:

- `chosen_folder`: `Επιλεγμένος φάκελος λήψης`
- `chosen_folder_description`: `Όταν είναι ενεργό, οι νέες λήψεις πηγαίνουν στον φάκελο που είχε αποθηκευτεί από την προηγούμενη εφαρμογή. Όταν είναι ανενεργό, οι νέες λήψεις πηγαίνουν στον ιδιωτικό φάκελο αυτής της εφαρμογής. Τα αρχεία που είναι ήδη σε αυτόν τον φάκελο μένουν εκεί, και μπορείτε να τα αναπαράγετε και να τα διαγράψετε.`
- `chosen_folder_save_failed`: `Δεν ήταν δυνατή η αποθήκευση αυτής της ρύθμισης. Δοκιμάστε ξανά.`

The English title is title case. The English sentences are sentence case. The other locales use their own capitalization, not English title case.

## Storage meter

`measureDownloadStorageBreakdown` adds `sumChosenFolderBytes` of `downloadsRepository.list()` to `downloadsBytes` only. Those bytes are not inside `documentDirectory`, so do not add them to `appDataBytes` or subtract them from it. `deviceUsedBytes` stays the system total minus free. A list or stat failure adds 0 for that part and still returns the directory walk.

## Tests

`apps/mobile/src/downloads/chosenDownloadFolder.test.ts` (already covered by `src/downloads/**/*.test.ts`):

- iOS plus `saf_tree` plus a null pref is hidden and off.
- Android plus null, `path`, or `unsupported` is hidden and off, including when the pref is `'true'`.
- Android plus `saf_tree` plus null, `''`, or `'true'` is visible and on.
- Android plus `saf_tree` plus `'false'` is visible and off. `'FALSE'` is on.
- `isChosenFolderDocumentUri`: a `content://` URI is true; a file name, a `file://` URL, and `''` are false.
- `safCreateMimeType`: `audio/mpeg; charset=binary` becomes `audio/mpeg`; an empty mime and `m4a` becomes `audio/mp4`; an unknown extension becomes `application/octet-stream`.
- `sumChosenFolderBytes`: sums a complete `content://` row; ignores a private file name, a non-complete row, and a null size.

`downloadStorage.test.ts`: a `content://` URI is returned unchanged and is not joined under `documentDirectory`; surrounding spaces are trimmed; the existing file-name joins stay.

`planDownloadCompletePlaybackHandoff.test.ts`: a complete row whose `filePath` is a `content://` URI returns that URI as `localUrl` when the streaming item and enclosure match. The existing bare-path case still returns null.

`resolvePlaybackUrl.test.ts`, on `resolveLocalDownloadPlaybackUrl`:

- `content://` and `getInfoAsync` `{ exists: true }` returns that URI and does not call `markFileMissing`.
- `getInfoAsync` rejecting returns that URI and does not call `markFileMissing`.
- `getInfoAsync` `{ exists: false }` calls `markFileMissing` and returns null.

`chosenDownloadFolderWrite.ts`, `downloadPrefs.ts`, and the screen have no unit tests. They need Expo, AsyncStorage, and React Native. The policy they call is the pure module.

`apps/mobile/e2e/settings-downloads.yaml`: after `more-settings-downloads-screen` is visible, `assertNotVisible` on `more-settings-downloads-chosen-folder`. The E2E seed has no saved folder, so the card is absent on both platforms. Do not add a flow that opens the system folder picker or grants a tree. A real chosen folder is an in-place update of the app that holds the grant, not this seed.

No API integration test and no Playwright spec.

## Release scratchpad

```markdown
## Android chosen download folder

- Surfaces: mobile
- Change: On Android, More → Settings → Downloads shows Chosen Download Folder when the previous app saved a folder this app can still write. On sends new downloads there. Off sends new downloads to the app's private folder. Turning the switch does not move or delete files already in the chosen folder; those still play and delete. iOS has no control. There is no folder picker and no new storage permission.
- Who notices: Android listeners who chose a download folder in the previous app
- Operator steps: none
```
