**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

# 40 — Names, statuses, and labels for the v4 download carryover (mobile)

## Rows

R18

R18: the one error-log entry that counts what happened to v4 files needs a code, detail keys, and
labels. Plan 42 writes the entry; this plan only adds the vocabulary. Nothing here runs on its own.

## Runs after

21

## Files

apps/mobile/src/data/repositories/v4DownloadCarryoverRepository.ts
apps/mobile/src/data/repositories/syncEventLog.ts
apps/mobile/src/screens/more/errorLogPresentation.ts
apps/mobile/src/sync/syncJobKinds.ts
apps/mobile/src/sync/syncJobKinds.test.ts
packages/i18n-catalog/mobile/originals/en-US.json
packages/i18n-catalog/mobile/originals/es.json
packages/i18n-catalog/mobile/originals/fr.json
packages/i18n-catalog/mobile/originals/el-GR.json
packages/i18n-catalog/mobile/overrides/es.json
packages/i18n-catalog/mobile/overrides/fr.json
packages/i18n-catalog/mobile/overrides/el-GR.json

## Reuse

Copy the shape the signed-out subscription carryover already uses:

- `V4_CARRYOVER_DONE_CODE` in `apps/mobile/src/data/repositories/v4CarryoverRepository.ts` and
  its branch in `errorLogMessage` (`errorLogPresentation.ts`).
- The `subscribed` / `add_by_rss` / `blocked` / `waiting` entries at the end of
  `SYNC_EVENT_DETAIL_KEYS` (`syncEventLog.ts`) and their `error_log.detail.field.*` labels.
- `'v4-carryover'` in `SYNC_JOB_KINDS` and `SYNC_JOB_LABEL_KEYS` (`syncJobKinds.ts`).

## 1. Statuses — `v4DownloadCarryoverRepository.ts`

Plan 21 created this file with `V4_DOWNLOAD_CARRYOVER_STATUSES = ['pending'] as const`. Replace
that list, in this order:

```ts
/**
 * - `pending`: not resolved yet, or a pass stopped before reaching it (offline, time budget).
 * - `waiting`: a retryable failure (an HTTP error, an unreadable folder, a failed copy). Retried
 *   once per app process; `attempts` counts the failures.
 * - `directory`: adopted as a finished download of a directory episode.
 * - `add_by_rss`: adopted onto an Add by RSS feed, as a feed episode or a local episode.
 * - `duplicate`: this phone already had that episode downloaded; the v4 copy was deleted.
 * - `deleted`: could not migrate; the file was deleted.
 * - `missing`: no file was found in any place v4 wrote to.
 * - `unreachable`: the file sits in a shared folder this app can no longer read.
 * - `delete_failed`: could not migrate, and deleting the file kept failing.
 */
export const V4_DOWNLOAD_CARRYOVER_STATUSES = [
  'pending',
  'waiting',
  'directory',
  'add_by_rss',
  'duplicate',
  'deleted',
  'missing',
  'unreachable',
  'delete_failed',
] as const;
```

`counts()` builds `byStatus`. Make its starting value an explicit object literal with all nine
statuses at `0`, typed `Record<V4DownloadCarryoverStatus, number>`, so the compiler rejects a
missing status. No `as`, no `Object.fromEntries`.

Add, beside the status list:

```ts
/** Error-log code for a download carryover pass that left no pending row. Counts live on the detail fields. */
export const V4_DOWNLOAD_CARRYOVER_DONE_CODE = 'v4_download_carryover_done';
```

`toRow` already rejects a status outside the list; no change there. No SQLite change: the
`status` column has no CHECK (plan 21).

## 2. Detail keys — `syncEventLog.ts`

Append to `SYNC_EVENT_DETAIL_KEYS`, after `'waiting'`, in this order (the detail screen lists
fields in key order):

```ts
  'directory_episodes',
  'add_by_rss_episodes',
  'already_downloaded',
  'deleted_files',
  'missing_files',
  'unreadable_files',
  'undeletable_files',
  'waiting_files',
```

None of these is a URL key, so the existing redaction is unchanged.

## 3. Message — `errorLogPresentation.ts`

Import `V4_DOWNLOAD_CARRYOVER_DONE_CODE` by path from
`'../../data/repositories/v4DownloadCarryoverRepository'` (that repository is not in the
`data/repositories` barrel). In `errorLogMessage`, directly after the `V4_CARRYOVER_DONE_CODE`
branch:

```ts
  if (entry.errorCode === V4_DOWNLOAD_CARRYOVER_DONE_CODE) {
    return t('error_log.v4_download_carryover_done');
  }
```

## 4. Job kind — `syncJobKinds.ts`

- `SYNC_JOB_KINDS`: append `'v4-download-carryover'` after `'v4-carryover'`.
- `SYNC_JOB_LABEL_KEYS`: `'v4-download-carryover': 'sync.job.v4_download_carryover'` after the
  `'v4-carryover'` entry.

`syncJobKinds.test.ts`, in the first `it` of `describe('getSyncLogLabelKey')`, after the
`v4-carryover` line:

```ts
    expect(getSyncLogLabelKey('v4-download-carryover')).toBe('sync.job.v4_download_carryover');
```

## 5. Catalog — `packages/i18n-catalog/mobile/`

Three places in each file. Keep each new key directly after the anchor named. English labels are
title case (**ui-copy-casing**); the other locales follow the casing of their neighbors.

| Key | Anchor (add after) |
| --- | --- |
| `sync.job.v4_download_carryover` | `sync.job.v4_carryover` |
| `error_log.v4_download_carryover_done` | `error_log.v4_carryover_done` |
| `error_log.detail.field.<key>` (eight keys, in § 2 order) | `error_log.detail.field.waiting` |

Originals:

| Key | en-US | es | fr | el-GR |
| --- | --- | --- | --- | --- |
| `sync.job.v4_download_carryover` | Moving Your Downloads | Moviendo tus descargas | Déplacement de vos téléchargements | Μεταφορά των λήψεών σας |
| `error_log.v4_download_carryover_done` | Downloads Moved from the Previous App | Descargas movidas desde la aplicación anterior | Téléchargements déplacés depuis l'application précédente | Λήψεις που μεταφέρθηκαν από την προηγούμενη εφαρμογή |
| `directory_episodes` | Directory Episodes | Episodios del directorio | Épisodes du répertoire | Επεισόδια καταλόγου |
| `add_by_rss_episodes` | Add by RSS Episodes | Episodios de Añadir por RSS | Épisodes Ajouter par RSS | Επεισόδια Προσθήκης μέσω RSS |
| `already_downloaded` | Already Downloaded | Ya descargados | Déjà téléchargés | Ήδη ληφθέντα |
| `deleted_files` | Files Deleted | Archivos eliminados | Fichiers supprimés | Αρχεία που διαγράφηκαν |
| `missing_files` | Files Not Found | Archivos no encontrados | Fichiers introuvables | Αρχεία που δεν βρέθηκαν |
| `unreadable_files` | Files in an Unreadable Folder | Archivos en una carpeta ilegible | Fichiers dans un dossier illisible | Αρχεία σε μη αναγνώσιμο φάκελο |
| `undeletable_files` | Files Not Deleted | Archivos no eliminados | Fichiers non supprimés | Αρχεία που δεν διαγράφηκαν |
| `waiting_files` | Files Waiting | Archivos en espera | Fichiers en attente | Αρχεία σε αναμονή |

Overrides (`es`, `fr`, `el-GR`): the same ten keys at the same anchors, each with `""`, matching
how the neighboring keys appear there. There is no `en-US` overrides file. Do not touch
`compiled/` (generated, not tracked).

## Tests

- `apps/mobile/src/sync/syncJobKinds.test.ts`: the label assertion in § 4.
- No other test: the statuses, keys, and labels are data; plan 41's unit tests use the statuses
  and keys, and area E's Maestro flow reads the entry on the error log detail screen
  (`testID` `error-log-detail-field-<key>`).

## Release scratchpad

none — plan 42's entry covers the new sync label and error-log entry, which nothing writes until
plan 42 lands.
