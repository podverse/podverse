**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# Tag chips on the phone playlist detail screen

The playlist detail screen lists the same tags the web playlist page lists. The chips are the phone's read-only tag control. An empty list adds nothing to the card.

## Rows

R27

R27 names the web playlist page. This plan is the phone half of that page: the detail screen is where a person opens one playlist. Plan 90 is the web half.

## Runs after

11, 30, 90

Plan 11 puts `tags` on `DTOPlaylist`. Plan 30 exports `PlaylistTagField` with `editable: false`. Plan 90 seeds `adam curry` and `podcasting` on `e2eEmbPlList01`. This plan does not edit the seed, the control, or the web page.

## Files

- apps/mobile/src/screens/library/PlaylistDetailScreen.tsx
- apps/mobile/e2e/playlist-detail-tags.yaml
- apps/mobile/e2e/HOW-TO-RUN.md
- scripts/mobile/e2e-test.sh

## Tests

No unit test. The screen has no React Native renderer, and the branch is "pass `playlist.tags` into the control that already returns nothing when the list is empty." Plan 30's unit tests cover the draft helper, not this screen.

One Maestro flow, `apps/mobile/e2e/playlist-detail-tags.yaml`. It proves the detail screen mounts the chips for a public playlist and omits them for an untagged one. One platform is enough for the cumulative run; the flow is not platform-specific. Name it so both platforms can run it.

The flow stays signed out. `isAuthGatedDeepLink` is false for a playlist path, and `GET /playlist/:id` is how the web page loads a public playlist. Do not run `login-seeded-user.yaml`.

```yaml
appId: com.podverse.app.next
name: Playlist Detail Tags
---
# Public playlist tags on the detail card. Signed out. Needs the E2E API.

- runFlow: shared/launch-and-connect.yaml

- openLink: podverse-next://playlist/e2eEmbPlList01
- runFlow: shared/confirm-ios-open-dialog.yaml
- extendedWaitUntil:
    visible:
      id: library-playlist-detail-screen
    timeout: ${TIMEOUT_SLOWEST}
- assertVisible: "Playlist (audio)"
- assertVisible:
    id: library-playlist-detail-tags
- assertVisible:
    id: library-playlist-detail-tags-tag-0
- assertVisible: "adam curry"
- assertVisible:
    id: library-playlist-detail-tags-tag-1
- assertVisible: "podcasting"
- assertNotVisible:
    id: library-playlist-detail-tags-tag-0-remove
- takeScreenshot: playlist-detail-tags

- openLink: podverse-next://playlist/e2eEmbPlMix01
- runFlow: shared/confirm-ios-open-dialog.yaml
- extendedWaitUntil:
    visible:
      text: "Playlist (mixed)"
    timeout: ${TIMEOUT_SLOW}
- assertNotVisible:
    id: library-playlist-detail-tags
- takeScreenshot: playlist-detail-no-tags
```

Use `${TIMEOUT_*}` from the shared ladder. Do not invent a millisecond literal.

`HOW-TO-RUN.md`: add `playlist-detail-tags` in both complete area lists (the `--platform ios` block and the `--platform android` block), in alphabetical order between the `playback-*` lines and `podcast-episode`. Add it in the API-backed group immediately after `library-playlists`.

`scripts/mobile/e2e-test.sh` `flow_needs_e2e_api`: add `playlist-detail-tags` on the same line as `library-playlists`. Do not add it to `flow_needs_test_assets`. The screen does not play media.

## Release scratchpad

```markdown
## Playlist detail shows its tags

- Surfaces: mobile
- Change: Opening a playlist shows its tags as chips under the description, in the owner's order, with no remove control. A playlist with no tags keeps the detail card it has today. The chips match the web playlist page. The embed player stays a player.
- Who notices: anyone who opens a tagged playlist on the phone
- Operator steps: none
```

## Issue

https://github.com/podverse/podverse/issues/410

Issue 410. Do not open a second issue.

## Decisions

- The phone detail screen shows the chips. The alternative was web only, which would hide tags that the detail payload already carries and that the list row (plan 80) will show as one truncated line. The detail card is the place the full set fits.
- The embed player still does not show chips. That choice is plan 90. This plan does not edit embed files.
- Chips are labels. They do not navigate and they do not filter.
- No field title. `editable: false` draws chips only.

## Where the chips go

`PlaylistDetailScreen` already loads `DTOPlaylist` from `playlistRepository.getByIdText` and stores it in `playlist`. The remote path returns `reqPlaylistGet` unchanged, and `upsertPlaylists` writes that object into `payload_json`. Read `playlist.tags`. Do not edit `playlistRepository.ts`. A stored row from before `tags` existed has no key; treat that like an empty array.

In the `listHeader` `useMemo` (the block that starts with the `Text` of `styles.heading` and the `SectionCard`), inside `SectionCard`, after the description `Text` and before the item-count `Text`:

```tsx
{playlistTags.length > 0 ? (
  <View style={styles.tags}>
    <PlaylistTagField
      editable={false}
      tags={playlistTags}
      testID="library-playlist-detail-tags"
    />
  </View>
) : null}
```

`playlistTags` is `playlist?.tags ?? []`. Compute it next to `creator` and `playlistTitle`. Add `playlist?.tags` to the `useMemo` dependency list. Do not drop the dependencies that are already there.

Import `PlaylistTagField` from `../../components/form`. Do not import `@podverse/ui`.

`styles.tags` is `marginTop: tokens.spacing.sm`, the same seam as `cardText`. Add it in the existing `StyleSheet.create` in this screen. Do not give the screen a second stylesheet, and do not call `StyleSheet.create` inside the header. The wrapper mounts only when there is a tag, so a missing list leaves no margin.

`editable: false` hides the text field, the remove control, the menu, and the limit line. Plan 30's ids are `library-playlist-detail-tags-tag-${index}` and `library-playlist-detail-tags-tag-${index}-remove`. Index 0 is the first string in `playlist.tags`.

The card already shows the description for `e2eEmbPlList01` (`Deterministic public playlist for embed list tests.`). Leave that text, the item count, the date, the medium, the creator, and the action buttons where they are.

## Leave unchanged

- `PlaylistTagField.tsx`, `playlistTagDraft.ts`, and `TextField.tsx`
- `PlaylistFormScreen.tsx` and `PlaylistListRow.tsx`
- The seed, `packages/ui`, and the web playlist page
- Catalog files. Chip text is the stored tag.
