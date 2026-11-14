# 02 — v4 "Only with link" playlists and clips become v5 unlisted

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

## Rows

R2

## Runs after

01 (phase order only; no shared files)

## Why

v4 `isPublic = false` means "Only with link". The v4 API serves such a playlist or clip to anyone
who has the id, and the legacy app labels it "Only with link". The copy writes v5 `private`, which
v5 serves only to the owner. Every v4 playlist (2,849) is `isPublic = false`, and so are 2,865
user clips, so every shared playlist link and many shared clip links would return 404 after
migration, and playlist follows would point at playlists the follower cannot open
(00-FINDINGS F2). v5 `unlisted` is the same contract as "Only with link".

## Decision

v4 `isPublic = false` → v5 `unlisted`. v4 `isPublic = true` → v5 `public`. The copy and replay
never write v5 `private` for a playlist or a clip.

## Files

- `apps/workers/src/commands/orm/v4Library/copyAccountLibraryApply.ts`
- `apps/workers/src/commands/orm/v4Library/replayLegacyRows.ts`
- `apps/workers/src/commands/orm/v4Library/copyAccountLibraryLib.ts` (only if a shared helper fits there)
- `apps/workers/src/commands/orm/v4Library/copyAccountLibraryLib.test.ts`
- `apps/workers/src/commands/orm/v4Rehearsal/verifyAccount.ts`
- `apps/workers/src/commands/orm/v4Rehearsal/verifyAccount.test.ts`
- `docs/proposals/v4-to-v5-migration/05-id-mapping-and-catalog-seeding.md`
- `release-notes/scratchpad.md` (only through the final message)

## 1. One mapping helper

In `copyAccountLibraryLib.ts` add:

```ts
/** v4 `isPublic = false` is "Only with link", which is v5 unlisted. */
export function v5SharableStatusForV4(isPublic: boolean | null | undefined): 'public' | 'unlisted' {
  return isPublic === true ? 'public' : 'unlisted';
}
```

## 2. Copy

`copyAccountLibraryApply.ts` looks up `publicStatusId` and `privateStatusId`
(`SELECT id FROM sharable_status WHERE status = 'public' | 'private'`, near the top of the copy).
Replace the private lookup with `unlistedStatusId` (`status = 'unlisted'`) and keep the null
check. Then:

- clip insert (`clip.isPublic === false ? privateStatusId : publicStatusId`) →
  `v5SharableStatusForV4(clip.isPublic) === 'public' ? publicStatusId : unlistedStatusId`
- playlist insert (`playlist.isPublic === false ? privateStatusId : publicStatusId`) → same shape

Rename every parameter that carried `privateStatusId` through the copy to `unlistedStatusId`.
Nothing else in the copy writes `private`; confirm with
`rg -n "private" apps/workers/src/commands/orm/v4Library`.

## 3. Replay

`replayLegacyRows.ts` looks up `publicId` and `privateId` the same way. Make the same change
there for every clip or playlist it inserts (snapshot clips and any playlist rows).

## 4. Verify samples unlisted rows too

In `verifyAccount.ts`, `selectPublicSamplePaths` picks only `isPublic` playlists and clips, so it
sampled nothing for playlists. Sample every written playlist and user clip, public or not (still
at most three of each, sorted by id). An unlisted page answers 200 to a signed-out request, which
is what `judgePublicPath` checks. Rename the function to `selectSharedSamplePaths` and update its
callers and tests.

## 5. Doc

In `05-id-mapping-and-catalog-seeding.md`, beside "`mediaRefs.isPublic` sets the clip's sharable
status", state the mapping for clips and playlists: `true` → public, `false` → unlisted, and why
(v4 served both to anyone with the link).

## Tests

- `copyAccountLibraryLib.test.ts`: `v5SharableStatusForV4(true | false | null | undefined)`.
- `verifyAccount.test.ts`: the sample now includes non-public playlists and clips; an unlisted
  playlist answering 200 passes.

## Release scratchpad

This prompt shares its phase with another, so put this entry in the final message under
"Release notes entry" instead of writing the file:

```markdown
## v4 "Only with link" playlists and clips stay shareable

- Surfaces: workers (v4 migration)
- Change: the v4 library copy writes v4 playlists and clips that were "Only with link" as unlisted instead of private. Every v4 playlist was "Only with link".
- Who notices: v4 users whose shared playlist or clip links would otherwise return 404 after migration; followers of those playlists
- Operator steps: none
```
