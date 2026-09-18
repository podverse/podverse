# COPY-PASTA — P2.1.6 Playlists

One prompt per response, in order. Order and rationale:
[00-EXECUTION-ORDER.md](00-EXECUTION-ORDER.md) · Decisions: [00-SUMMARY.md](00-SUMMARY.md)

**Prerequisite:** queue details 757–759 are implemented (long-press drag + drop resolver). Do not
start this set until that work is on the branch.

Do not run tests during these prompts; each response ends with operator verification commands. Mark
each box when its prompt completes.

- [x] **01 — Playlist data layer**
- [x] **02 — Library playlists list**
- [x] **03 — Playlist detail parity**
- [x] **04 — Edit items: reorder and remove**
- [x] **05 — Form and add-to parity**
- [x] **06 — E2E and closeout**

---

## 01 — Playlist data layer

**Cursor model:** Codex 5.3
**Reasoning:** high

```
Implement .llm/plans/active/06-mobile-p2-playlists/01-playlist-data-layer.md.

Add migration 17 (playlist + playlist_resource tables), playlistRepository with list/CRUD/follow/
resource add-first/last/between/delete for all four resource kinds, native-cache projection on
mutations that affect car browse, and offline write refusal. Route
accountRepository.fetchFollowedPlaylistNodes through the repository. Widen playlistResourceToHomeRow
for add-by-RSS and redacted rows with unit tests per resource type.

Follow the locked decisions in 00-SUMMARY.md. Do not run tests; end with operator verification
commands.
```

---

## 02 — Library playlists list

**Cursor model:** Codex 5.3
**Reasoning:** high

```
Implement .llm/plans/active/06-mobile-p2-playlists/02-library-playlists-list.md.

Rebuild LibraryPlaylistsScreen with My playlists / Followed OptionChipGroup chips, sort (recent /
oldest / A-Z / top) + range when top, persisted per instance, FillList pagination through
playlistRepository, and membership-gated Create on press. Distinct loading / signed-out / empty /
error / offline-with-cache states. Browse public playlists stay unchanged.

Follow the locked decisions in 00-SUMMARY.md. Do not run tests; end with operator verification
commands.
```

---

## 03 — Playlist detail parity

**Cursor model:** Codex 5.3
**Reasoning:** high

```
Implement .llm/plans/active/06-mobile-p2-playlists/03-playlist-detail-parity.md.

Bring PlaylistDetailScreen view mode to web parity: header description / last updated / medium /
item count / creator, Share, owner Edit, non-owner Follow/Unfollow (membership-gated), paginated
resources through playlistRepository, row tap plays and seeds playlist auto-queue. Include
add-by-RSS rows from the widened mapper.

Follow the locked decisions in 00-SUMMARY.md. Do not run tests; end with operator verification
commands.
```

---

## 04 — Edit items: reorder and remove

**Cursor model:** Opus 5
**Reasoning:** high

```
Implement .llm/plans/active/06-mobile-p2-playlists/04-edit-items-reorder-and-remove.md.

Owner edit-items mode: private-all load while on; long-press whole-row drag via the queue's
ReorderableSections prop and drop → first/last/between resolver (reuse or mirror with unit tests);
SwipeActionRow remove for all four resource types; accessibility Move up/down through the same
resolver. Compose gestures so tap still plays, swipe still removes, and drag does not play on
release. Tab bar settings stay handle-only.

Follow the locked decisions in 00-SUMMARY.md. Do not run tests; end with operator verification
commands.
```

---

## 05 — Form and add-to parity

**Cursor model:** Codex 5.3
**Reasoning:** high

```
Implement .llm/plans/active/06-mobile-p2-playlists/05-form-and-add-to-parity.md.

PlaylistFormScreen: medium OptionChipGroup on create (locked on edit), sharable OptionChipGroup,
delete playlist with ConfirmDialog navigating to LibraryPlaylists. useAddToPlaylist: add at first,
filter by target medium, widen targets to soundbite and add-by-RSS, create-playlist shortcut,
playlistRepository only.

Follow the locked decisions in 00-SUMMARY.md. Do not run tests; end with operator verification
commands.
```

---

## 06 — E2E and closeout

**Cursor model:** Codex 5.3
**Reasoning:** medium

```
Implement .llm/plans/active/06-mobile-p2-playlists/06-e2e-and-closeout.md.

Extend library-playlists.yaml for chips / create / edit / delete (no drag assertion — comment why),
add instructions.login_for_playlists to the consumer catalog, flip 771–776 to done in the Phase 2
master plan and Appendix, leave 777/778 deferred, update P2.1.6 area status and LLM-PLANS-ACTIVE.md,
and archive this plan set.

Assume I ran every earlier prompt without testing: end the response with ALL cumulative verification
commands for the whole set, deduped, build -> unit -> mobile Maestro, naming the Metro / iOS /
Android / E2E API prerequisites in prose rather than in the paste block.
```
