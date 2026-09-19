# 752-mobile-make-clip-authoring

**Master step:** P2.1.4
**Model (author + implement):** Opus 5
**Status:** done

## Scope

Clip authoring on mobile: create, edit, and delete a user clip while the episode it belongs to stays
loaded in the player. This closes the split left by
[749](749-player-action-rows-and-more-sheet.md), whose scissors control answers "not available yet"
and does nothing else. The playback side of authoring — the hold that keeps the queue from advancing,
and the per-field previews — is [753](753-clip-authoring-playback-hold.md).

### Screen

`apps/mobile/src/screens/clip/MakeClipScreen.tsx`, registered on the **root** stack as
`ROOT_STACK_ROUTES.MakeClip` with `ROOT_SLIDE_UP_SCREEN_OPTIONS`, so it covers the full player the
same way the full player covers the tabs. Params: `{ mode: 'create' | 'edit'; clipId?: string }`.

Header is `HeaderBar` with a back action, the title (`Make clip` / `Edit clip`), and a right action
that saves (`Save clip`). Body, top to bottom:

| Element    | Behavior                                                                         |
| ---------- | -------------------------------------------------------------------------------- |
| Title      | Optional `TextField`; tapping it reveals the keyboard, nothing is prefilled      |
| Tip        | One line: naming clips helps searchability and organization                      |
| Visibility | `OptionChipGroup` — Public / Unlisted / Private, defaulting to the stored choice |
| Start time | Tap the card to capture the live playhead; play button previews from that second |
| End time   | Same, optional, with a clear action; play button previews the last seconds       |
| Scrubber   | The existing `FullPlayerScrubber`                                                |
| Transport  | `MakeClipTransportRow` — −10, −1, play/pause, +1, +30                            |
| Footer     | How To and FAQ, per [755](755-mobile-faq-and-clip-how-to.md)                     |

**Times are captured, never typed.** Both cards read the current position and store whole seconds;
there is no text entry and no time picker. Web's `TextInputHHMMSS` exists because a mouse cannot ride
the playhead — a thumb on a phone can, and typing a timestamp on a phone keyboard is worse than
scrubbing to it.

**Visibility is three chips, not a pill dropdown.** `SharableStatusEnum` has three values, and three
fixed choices are chips per
[`mobile-settings-option-density`](/.cursor/rules/mobile-settings-option-density.mdc). The previous
generation offered two (Public / Only with link) because its API had two; nextgen's Unlisted **is**
that second option, and Private is new. The last choice persists device-locally through `prefsStore`,
as the previous generation did with `MAKE_CLIP_IS_PUBLIC`, and seeds the next create.

**Transport prints its intervals.** The jump glyphs carry `10`, `1`, `1`, `30` inside the circle, so a
user setting a boundary can see which button moves how far. `FullPlayerTransportRow` stays icon-only —
a player does not need the number, a clip editor does. Both read a new shared `PlayerJumpButton`
primitive rather than growing a second copy of the circular-arrow button
([`mobile-reusable-components`](/.cursor/skills/mobile-reusable-components/SKILL.md)).
`MEDIA_MINI_JUMP_SECONDS` is the new one-second interval; 10 and 30 stay
`MEDIA_JUMP_BACK_SECONDS` / `MEDIA_JUMP_FORWARD_SECONDS`.

### Entry points

- **Create** — the existing `full-player-create-clip` scissors. Its `ConfirmDialog` and
  `showCreateClipNotice` state are deleted, not left dormant.
- **Edit** — owned clips only, from `LibraryMyClipsScreen` rows and `ClipDetailScreen`. `DTOClip`
  carries `account`, so ownership is a comparison against the signed-in account rather than a guess.
- **Delete** — from edit mode, behind a confirm.

Editing from a list means the clip's episode may not be loaded. The entry loads that item **paused**
at the clip's start time before the screen opens, so the previews and the capture cards have
something to read and nothing starts playing under the user. The previous generation did the same
thing by routing through the player screen first.

### Data

New `apps/mobile/src/data/repositories/clipRepository.ts` wrapping `reqClipCreate`, `reqClipUpdate`,
and `reqClipDelete` behind `requestWithMobileAuthRefresh`. Screens do not call `req*` directly once a
repository seam exists ([mobile-data-layer](/.cursor/skills/mobile-data-layer/SKILL.md)). Clips are
not stored in SQLite: they are authored online, and a clip that only exists on one phone is a clip
nobody can share.

### Gating

Create and update require an active membership; the API enforces it and the client must agree rather
than discovering it at save time. A new `clip_authoring` `GatedFeature` in
[accessTier.ts](/packages/helpers/src/lib/accessTier.ts) is checked before the screen opens
(`openGate(reason)` when denied), and `handleGateError` still covers a server 403 for the case where
membership lapses mid-session.

**Delete is deliberately not gated.** A lapsed member must be able to remove their own content; the
alternative is holding someone's clips hostage to a renewal.

### API change — delete does not require a membership

`ClipController.deleteClip` runs with `skipMembershipStatus: false` today, so an expired member is
refused when deleting a clip they own. It moves to `skipMembershipStatus: true`; ownership is still
enforced by `verifyClipOwnership`, so the only thing that changes is whether an unentitled owner may
remove their own row. Create and update keep their membership requirement.

`apps/api/src/test/clip.test.ts` covers membership only through a fixture account whose membership is
always valid, so the new behavior needs explicit cases: an expired account deletes its own clip
successfully and is refused on create and update. Every surface calls the same endpoint, so web gains
the same allowance in the same change
([`cross-surface-change-impact`](/.cursor/rules/cross-surface-change-impact.mdc)).

Signed out, the scissors opens the gate with `needs_account`; the screen itself is never reached
without an account, so it carries no logged-out overlay of its own (the previous generation's
"Log in to make clips" overlay existed because it had no gate system).

## Acceptance criteria

- Pressing the player scissors with an active membership opens Make Clip over the full player; signed
  out or unentitled, it opens the membership gate with the right reason and destination.
- The start card captures the current playhead on tap, to the whole second, and shows it as HH:MM:SS.
- The end card behaves the same, starts empty showing that it is optional, and can be cleared.
- Saving with no start time is refused with a message; saving with an end time at or before the start
  is refused.
- Title is optional; visibility defaults to the last choice made on that device, Public on a fresh
  install.
- Save creates the clip, shows its shareable link, and returns to the player with playback untouched.
- Edit mode loads the clip's title, times, and visibility; saving updates them; delete removes the
  clip after a confirm and returns to the list it was opened from.
- Editing a clip whose episode is not loaded loads that episode paused at the clip start.
- Edit and delete are offered only on clips the signed-in account owns.
- The transport row shows 10, 1, 1, and 30 on its jump buttons and moves the playhead by those
  amounts, clamped to the media.
- Every control has an accessible name and a 44pt target; the screen is usable with VoiceOver and
  TalkBack ([`screen-reader-accessibility`](/.cursor/rules/screen-reader-accessibility.mdc)).

## Web parity references

- Form fields and validation: `apps/web/src/components/Clip/ClipForm.tsx`
- Create flow and API mapping: `apps/web/src/components/Modal/ModalClip.tsx`,
  `apps/web/src/components/Modal/ModalClipCreated.tsx`
- Edit and delete: `apps/web/src/app/clip/edit/[clip_id]/`
- Visibility options: `apps/web/src/constants/sharableStatus.ts`, `misc.sharable_status.*`

**Divergence, recorded on purpose.** Web types times into HH:MM:SS fields and does not prefill from
the playhead; mobile captures the playhead and offers no text entry. Web's create modal defaults to
Private; mobile defaults to the last used value, Public on a fresh install, matching the previous
generation's screen.

## Verification

```bash
npm run mobile:e2e:test -- make-clip
```
