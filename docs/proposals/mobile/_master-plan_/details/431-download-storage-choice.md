# 431-download-storage-choice

**Master step:** 13.2
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Choose and document storage for enclosure files: **Expo FileSystem** (+ optional background
  download API) vs a native download manager (`react-native-blob-util`, etc.).
- Default recommendation: **`expo-file-system`** (or current Expo FS package for SDK 52) writing
  under the app documents/cache directory — fits Expo prebuild, FOSS-friendly, enough for a
  functional sketch.
- Record the decision in `apps/mobile/src/downloads/` (or data README) + this detail.
- On-disk names must preserve a real progressive extension from helpers
  (`LabeledItemEnclosure.fileExtension` / MIME map) — e.g. `downloads/<item_id_text>.mp3` — not
  a bare id with no ext or `.m3u8`.

## Acceptance criteria

- One storage approach locked with rationale (FOSS, Expo peer, background limits)
- Directory layout sketched with extension derivation from
  [`itemEnclosure.ts`](/packages/helpers/src/lib/item/itemEnclosure.ts)
- Dependency added via `npm --prefix apps/mobile exec -- expo install …` when implementing
  (not bare root `npx expo`)
- No Google Play Services–only download stack for the default path
- Document that HLS playlists are never written as the “media file”

## Web parity references

- Web browser save-as only — not a pattern to port
  (`apps/web/src/utils/fileDownloader.ts`); web filename helpers use the same MIME/ext maps

## Verification

```bash
# After implement: package present under apps/mobile
grep -E 'expo-file-system|file-system' apps/mobile/package.json
```
