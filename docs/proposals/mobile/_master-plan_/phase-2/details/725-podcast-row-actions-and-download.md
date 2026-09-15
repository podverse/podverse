# 725-podcast-row-actions-and-download

**Master step:** P2.1.2
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

Align podcast episode (and clip where applicable) row actions with the website, and keep a one-tap
**download icon** on the episode row.

### More menu

Match website intents from
[`CommonEpisodeRow`](apps/web/src/components/Common/Podcast/Episode/CommonEpisodeRow.tsx):

- Queue next / queue last
- Add to playlist
- Mark as played
- **Share** (episode public URL via `buildPublicShareUrl` / `shareResolvedUrl`)

Play stays as the inline control. Row tap navigates to episode detail. Do **not** revive legacy
Stream / Go to Episode as the primary menu (redundant with play + row tap).

Logged-out users still get anonymous-tier actions (queue, download). Membership- or account-gated
intents use `openGate` / login-required copy when tapped.

### Download icon

Reuse [`DownloadControl`](apps/mobile/src/components/download/DownloadControl.tsx) (or a compact
icon variant of it) **on the episode row**, not only on episode detail. Livestream / non-downloadable
items render nothing, same as today.

Icon row chrome follows legacy: Play is a glowing circle (`Button` `play` — accent border +
`opaqueBg` fill); More / Download / trash are bare icons at the same hit target and glyph size.

### Live badge

Live rows at the top of Episodes (from [724](724-podcast-section-lists.md)) show the Live badge;
download control stays hidden for non-downloadable live sources.

## Acceptance criteria

- Episode row more-menu lists queue next/last, add to playlist, mark as played, and share.
- Share presents the public episode URL (deep-linkable when the app is installed).
- Download icon is tappable on the row for downloadable episodes.
- Live rows show Live badge; no download affordance when not downloadable.
- All labels / accessibility names go through i18n; `testID`s stable for Maestro.
- E2E: open more-menu on an episode row; assert download control visible on a seed episode.

## Web parity references

- [`CommonEpisodeRow.tsx`](apps/web/src/components/Common/Podcast/Episode/CommonEpisodeRow.tsx)
- [`MediaRowActions`](apps/mobile/src/components/player/MediaRowActions.tsx)
- [`shareNowPlaying.ts`](apps/mobile/src/lib/share/shareNowPlaying.ts)
- [`DownloadControl.tsx`](apps/mobile/src/components/download/DownloadControl.tsx)

## Verification

```bash
# Mobile Maestro
npm run mobile:e2e:test -- podcast-episode
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
