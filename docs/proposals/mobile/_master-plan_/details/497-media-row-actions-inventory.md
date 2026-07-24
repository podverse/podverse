# 497-media-row-actions-inventory

**Master step:** 9c.1
**Model (author + implement):** Auto
**Status:** done

## Scope

- Inventory web media-row / header primary actions vs current mobile screens.
- Cover at least: Home feed rows, podcast episode rows/detail, clip rows/detail, music
  track/album rows, add-by-RSS **item** rows, add-by-RSS **feed/channel** subscribe chrome.
- Produce a short checklist table (action key → web component → mobile target) and list
  intentional exceptions (store policy, deferred tracks).

## Acceptance criteria

- Checklist committed under this detail or linked from Track 9c summary / plan `00-SUMMARY`
- Call out any mislabeled mobile controls (queue i18n on non-queue actions)
- Distinguishes feed-level vs item-level actions

## Verification

```bash
# operator: spot-check inventory against web components
rg -n "PlayButtonRow|ItemRowMoreActions|queue_next|unsubscribe" apps/web/src/components
rg -n "queue_next|unsubscribe|runQueueAction|Play" apps/mobile/src/screens
```

## Inventory (9c.1)

### Web action model (canonical)

Web list/detail rows use a small set of **shared** controls; overflow ("More") items adapt to
context (queue/playlist edit modes add remove actions).

- Inline play: `apps/web/src/components/MediaPlayer/Buttons/PlayButtonRow.tsx` (rows),
  `PlayButtonLarge.tsx` (detail headers). Music track rows play on **row-body tap** (no `PlayButtonRow`).
- Overflow menu: `apps/web/src/components/Media/ItemRowMoreActions.tsx` (`MoreButton`) — also hosts
  the multi-enclosure source picker (`media.enclosure_modality.*`).
- Feed/channel subscribe chrome: `apps/web/src/components/Media/Header/SubscribeButton.tsx`
  (`features.subscribe` / `features.unsubscribe`) + `HeaderButtons.tsx` (RSS, website, share,
  funding, boost, notifications).

### Checklist — action key → web component → mobile target

Legend: **✅ present** · **⚠️ present but wrong** · **❌ missing** · **n/a** (surface not built on mobile).

#### Item-level actions (episode / clip / soundbite rows + detail)

| Action (i18n key)                                                           | Web component                                       | Mobile target (current)                                          | Status                                                      |
| --------------------------------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------- |
| Play (`media_player.play`)                                                  | `PlayButtonRow` / `PlayButtonLarge`                 | `HomeFeedRow` inline Play (`home-row-play-*`)                    | ✅                                                          |
| Queue next (`features.queue.queue_next`)                                    | `ItemRowMoreActions` menu                           | `HomeFeedRow` inline Queue button **labelled** `queue_next`      | ⚠️ mislabel (see below)                                     |
| Queue last (`features.queue.queue_last`)                                    | `ItemRowMoreActions` menu                           | `runQueueAction` → `addToQueueLast` (this is what actually runs) | ⚠️ no distinct button                                       |
| Add to playlist (`features.playlist.add_to_playlist`)                       | overflow menu                                       | `HomeFeedRow` more sheet → `useAddToPlaylist` picker (9d.4)      | ✅                                                          |
| Add / remove liked (`features.playlist.add_to_liked` / `remove_from_liked`) | overflow menu (like-enabled lists)                  | —                                                                | ❌                                                          |
| Mark as played (`features.history.mark_as_played`)                          | overflow menu                                       | —                                                                | ❌                                                          |
| Download (`features.download.download_episode` / `download_track`)          | overflow menu                                       | —                                                                | ❌ (Track 13 downloads)                                     |
| Share (`features.share`)                                                    | `ListEpisodeRow` (in-playlist only) / detail header | full player share (Track 11.13); not on rows                     | ❌ on rows                                                  |
| Edit clip (`features.clip.edit_clip`)                                       | `ListClipRow` overflow (owner)                      | —                                                                | ❌ (deferred)                                               |
| Enclosure source picker (`media.enclosure_modality.*`)                      | `ItemRowMoreActions`                                | —                                                                | ❌ (deferred; single enclosure MVP)                         |
| Remove from queue (`features.queue.remove_from_queue`)                      | overflow (queue edit)                               | Library queue remove control (`library-queue-remove-*`)          | ✅ (queue screen)                                           |
| Remove from playlist (`features.playlist.remove_from_playlist`)             | overflow (playlist edit)                            | —                                                                | ❌                                                          |
| Chapter play/jump                                                           | `ClipListItem` / chapters                           | chapters **display-only** on mobile                              | ❌ (full player segments play; detail list is display-only) |

#### Music track/album rows

| Action                                       | Web                                              | Mobile                                                              | Status                        |
| -------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------- | ----------------------------- |
| Play (row tap)                               | `ListTrackRow` / `CommonTrackListRow` (row body) | `HomeFeedRow` inline Play on `tracks` tab, album/artist track lists | ✅ (twin button, not row-tap) |
| Queue next/last                              | track row overflow                               | inline Queue (mislabel as above)                                    | ⚠️                            |
| Go to track page (`media.music.track_go_to`) | overflow                                         | row press navigates to track detail (stub)                          | ⚠️ target is placeholder      |
| Track detail header actions                  | `CoreTrackHeaderPlaySection.tsx`                 | **track detail screen is a placeholder** (`navigation/index.tsx`)   | ❌ (screen stub)              |

#### add-by-RSS ITEM rows

| Action                                                               | Web                                               | Mobile                                                    | Status                     |
| -------------------------------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------- | -------------------------- |
| Play / queue / playlist / mark-played / download on parsed item rows | `AddByRSSEpisodeRow.tsx` / `AddByRSSTrackRow.tsx` | **no per-item rows** (`AddByRssFeedListScreen` is a stub) | n/a (item lists not built) |

#### Feed/channel-level actions (subscribe chrome)

| Action (i18n key)                                                                                                     | Web component                                           | Mobile target                                                       | Status                               |
| --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------ |
| Subscribe / Unsubscribe (`features.subscribe` / `features.unsubscribe`)                                               | `SubscribeButton.tsx`; add-by-RSS `AddByRSS*Header.tsx` | Podcast detail subscribe toggle (`podcast-detail-subscribe-toggle`) | ✅ correct keys                      |
| add-by-RSS feed remove / unfollow (`features.unsubscribe`)                                                            | `AddByRSSPodcastHeader.tsx` toggle                      | `AddByRssRootScreen.tsx` `rss-feed-remove-*`                        | ✅ correct key (**not** a queue key) |
| Open RSS feed / website (`info.rss_feed` / `info.website`)                                                            | `HeaderButtons.tsx` / add-by-RSS headers                | —                                                                   | ❌ (deferred)                        |
| Share / funding / boost / notifications (`features.share`, `info.funding`, `value.boost`, `features.notifications.*`) | `HeaderButtons.tsx`                                     | boost/V4V is Track 11.14 stub / Track 19; notifications later       | ❌ (deferred by track)               |
| Play feed (first item)                                                                                                | _(no web equivalent — mobile convenience)_              | `AddByRssRootScreen.tsx` `rss-feed-play-*`                          | mobile-only extra                    |

### Mislabeled controls (must fix in 9c.2/9c.3)

- **`HomeFeedRow` Queue button** (`apps/mobile/src/screens/home/HomeFeedRow.tsx`) renders label
  `features.queue.queue_next` but `useHomeRowPlayback.runQueueAction` calls `addToQueueLast`
  (`apps/mobile/src/hooks/useHomeRowPlayback.ts`, `useQueueMutations.ts`). Either relabel to
  `features.queue.queue_last` or split into two actions (next + last) matching web. `addToQueueNext`
  exists in the hook but is wired to no UI. The shared `MediaRowActions` (9c.2) resolves this by
  exposing both intents with correct keys.
- **No non-queue action reuses queue copy.** The earlier add-by-RSS feed-remove concern is already
  fixed: it uses `features.unsubscribe` (confirmed in `AddByRssRootScreen.tsx`).

### Intentional exceptions (not gaps to close in Track 9c)

| Area                                                   | Reason                                                                                            |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Overflow presentation                                  | Mobile uses an RN action sheet / bottom sheet for "More", not web's hover menu (locked decision). |
| Download actions                                       | Owned by Track 13 (offline downloads); not part of 9c.                                            |
| Enclosure source picker                                | Deferred; single-enclosure MVP. Add when multi-enclosure playback lands.                          |
| Share on rows                                          | Item-level share is web "in-playlist only"; mobile share is the full player action (11.13).       |
| Boost / V4V, notifications, funding, website/RSS links | Feed chrome deferred to their owning tracks (11.14 stub / Track 19, notifications, integrations). |
| add-by-RSS item rows + feed detail                     | Item-list surfaces not yet built on mobile; when built they reuse `MediaRowActions`.              |
| Track detail screen                                    | Placeholder stub; header actions land when the screen is built (reuse `MediaRowActions`).         |
| Edit clip                                              | Owner-only web affordance; deferred on mobile.                                                    |

### Scope for 9c.2–9c.3

Build a shared `MediaRowActions` RN component that exposes **Play** + a **More** action sheet with
the item-level intents mobile can support today (**queue next**, **queue last**, and — as handlers
land — playlist / mark-played), using correct `features.queue.*` keys, then migrate `HomeFeedRow`
consumers (home, episode/clip/album/artist detail, playlist, library, up-next) to it. Feed-level
subscribe chrome stays on its existing correct keys.
