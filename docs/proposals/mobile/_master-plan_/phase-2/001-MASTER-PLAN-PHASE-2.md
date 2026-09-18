# Podverse Mobile — Master Plan (Phase 2, operator-guided)

> **Active phase.** Phase 1 ([001-MASTER-PLAN.md](/docs/proposals/mobile/_master-plan_/phase-1/001-MASTER-PLAN.md))
> delivered the framework: navigation, playback engine, data layer, car surfaces, CI, and E2E. Phase 2
> closes the gap between that framework and a shippable product, working from the **legacy app**
> (`../podverse-rn`) screen by screen.
>
> Phase index: [PHASES.md](/docs/proposals/mobile/_master-plan_/PHASES.md)

## How Phase 2 differs from Phase 1

|                    | Phase 1                                 | Phase 2                                                              |
| ------------------ | --------------------------------------- | -------------------------------------------------------------------- |
| Scope decisions    | Agent proposed whole parallel groups    | **Operator** picks one screen area at a time                         |
| Input              | Master plan step list + web parity code | **Legacy app screenshots** the operator pastes into chat             |
| Agent's first move | Write detail docs                       | **Ask questions** about what to keep, drop, or change                |
| Definition of done | Functional sketch + `testID` + E2E      | Functional implementation informed by screenshots and decisions      |
| Visual polish      | Deferred to Track 23                    | **Absorbed here** — polish happens per area, not in a separate track |

**Visual review:** Phase 2 implementation is informed by screenshots and operator decisions. A
focused device review is recommended after implementation, but it is not required to mark an area or
plan complete. Agents still do **not** invent visual direction — it comes from the screenshots and
the operator's answers.

## Working loop

```text
1. Operator pastes a batch of legacy screenshots for one screen area.
2. Agent asks questions — as many as are genuinely decision-blocking (see skill).
3. Operator answers; agent records the answers as a locked decision list.
4. Agent writes details/<id>-*.md + .llm/plans/active/mobile-p2-<area>/ COPY-PASTA set.
5. Operator pastes COPY-PASTA prompts; agent implements and marks steps done.
6. Agent recommends focused device review; area closes when implementation is complete; repeat.
```

Screenshots are **not committed** to the repo. They live in chat only — the agent converts them into
written observations, questions, and plan text. Never write image files into `docs/`, `.llm/`, or
`.artifacts/` on the operator's behalf.

Full workflow and question checklist:
[`.cursor/skills/mobile-legacy-screenshot-planning/SKILL.md`](/.cursor/skills/mobile-legacy-screenshot-planning/SKILL.md).

## LLM model guide

| Model     | Tier     | Use when                                                                       |
| --------- | -------- | ------------------------------------------------------------------------------ |
| Auto      | Cheapest | Mechanical docs, operator-only steps, deferral stubs, checklist scaffolds      |
| Codex 5.3 | Medium   | Standard RN screens, list/detail parity, E2E flows, settings surfaces          |
| Opus 5    | Premium  | Player chrome, playback/queue behavior changes, cross-cutting IA, native paths |

Reasoning levels (`low` / `medium` / `high` / `extra high`) are chosen independently of model — see
[`copy-pasta-recommend-model`](/.cursor/rules/copy-pasta-recommend-model.mdc).

## Track P2.1 — Legacy parity by screen area

Areas are ordered by suggested sequence, but the **operator chooses** what to work on next. Each area
is detailed only when its screenshots arrive. `Status`: `not started` → `questions asked` →
`planned` → `done`.

| Area                            | Legacy screens (`../podverse-rn/src/screens/`)                                                                                                           | Status                                                 |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| P2.1.1 Home & browse            | `PodcastsScreen`, `PodcastsMediaTypeScreen`, `EpisodesScreen`, `ClipsScreen`, `AlbumsScreen`, `AlbumScreen`, `FeatureVideosScreen`                       | done (subscribed chips)                                |
| P2.1.2 Podcast & episode detail | `PodcastScreen`, `PodcastInfoScreen`, `EpisodeScreen`, `EpisodeMediaRefScreen`, `EpisodeTranscriptScreen`                                                | done (podcast + music detail); episode later           |
| P2.1.3 Search & filter          | `SearchScreen`, `FilterScreen`, `ScanQRCodeScreen`                                                                                                       | done                                                   |
| P2.1.4 Player & now playing     | `PlayerScreen`, `SleepTimerScreen`, `StartPodcastFromTimeScreen`, `MakeClipScreen`                                                                       | done (player + enclosures + medium player + Make Clip) |
| P2.1.5 Library                  | `MyLibraryScreen`, `QueueScreen`, `HistoryScreen`, `HistoryIndexListenerScreen`, `DownloadsScreen`                                                       | done (Downloads, queue); history pending               |
| P2.1.6 Playlists                | `PlaylistsScreen`, `PlaylistScreen`, `EditPlaylistScreen`, `PlaylistsAddToScreen`                                                                        | done                                                   |
| P2.1.7 Add by RSS               | `AddPodcastByRSSScreen`, `AddPodcastByRSSAuthScreen`                                                                                                     | not started                                            |
| P2.1.8 Auth & onboarding        | `AuthScreen`, `OnboardingScreen`, `EmailVerificationScreen`, `ResetPasswordScreen`                                                                       | in progress (popularity-tracking consent)              |
| P2.1.9 Profiles                 | `ProfileScreen`, `ProfilesScreen`, `EditProfileScreen`                                                                                                   | not started                                            |
| P2.1.10 Settings & More         | `MoreScreen`, `SettingsScreen*` (11 sub-screens), `TrackingConsentScreen`                                                                                | in progress (consent)                                  |
| P2.1.11 Membership              | `MembershipScreen`, `PurchasingScreen`                                                                                                                   | not started                                            |
| P2.1.12 Static & support        | `AboutScreen`, `ContactScreen`, `ContactXMPPChatScreen`, `FAQScreen`, `PrivacyPolicyScreen`, `TermsOfServiceScreen`, `ContributeScreen`, `WebPageScreen` | in progress (FAQ only)                                 |

**Not in Phase 2:** the legacy `V4V*` screens (`V4VBoostagramScreen`, `V4VConsentScreen`,
`V4VInfoStreamingSatsScreen`, `V4VPreviewScreen`, `V4VProvidersScreen`, `V4VProvidersAlbyScreen`,
`V4VProvidersAlbyLoginScreen`) and `FundingNowPlayingItemScreen` / `FundingPodcastEpisodeScreen`.
Those belong to [Phase 3](/docs/proposals/mobile/_master-plan_/phase-3/001-MASTER-PLAN-PHASE-3.md).

**Legacy is inspiration, not a port target.** Per
[`legacy-app-reference`](/.cursor/rules/legacy-app-reference.mdc), do not assume legacy APIs,
navigation, storage, or UX are correct for nextgen. Where nextgen already has a better pattern, say so
and ask before matching legacy.

### Planned steps — P2.1.1 Home (podcasts) and P2.1.3 Search & filter

First area detailed from operator screenshots. **Track P2.4 foundations sequence before these** —
the Home work assumes anonymous subscriptions, local content storage, and per-channel seen state
exist. **Track P2.5 web counterparts** follow, since some of this work changes account-synced state
that web also reads and writes.

| Step   | Detail                                                                                                                                                   | Model     | Status |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------ |
| P2.1.1 | [705-home-subscribed-list-and-filter](/docs/proposals/mobile/_master-plan_/phase-2/details/705-home-subscribed-list-and-filter.md)                       | Codex 5.3 | done   |
| P2.1.1 | [707-home-row-metadata](/docs/proposals/mobile/_master-plan_/phase-2/details/707-home-row-metadata.md)                                                   | Codex 5.3 | done   |
| P2.1.1 | [708-home-view-toggle-and-overflow-menu](/docs/proposals/mobile/_master-plan_/phase-2/details/708-home-view-toggle-and-overflow-menu.md)                 | Codex 5.3 | done   |
| P2.1.1 | [721-home-combined-subscriptions-and-rss-detail](/docs/proposals/mobile/_master-plan_/phase-2/details/721-home-combined-subscriptions-and-rss-detail.md) | Auto      | done   |
| P2.1.1 | [738-browse-podcast-host-names](/docs/proposals/mobile/_master-plan_/phase-2/details/738-browse-podcast-host-names.md)                                   | Codex 5.3 | done   |
| P2.1.1 | [739-home-subscribed-channel-kind-and-loaders](/docs/proposals/mobile/_master-plan_/phase-2/details/739-home-subscribed-channel-kind-and-loaders.md)     | Codex 5.3 | done   |
| P2.1.1 | [740-home-empty-discovery-ctas](/docs/proposals/mobile/_master-plan_/phase-2/details/740-home-empty-discovery-ctas.md)                                   | Codex 5.3 | done   |
| P2.1.1 | [741-home-filter-channel-lists-only](/docs/proposals/mobile/_master-plan_/phase-2/details/741-home-filter-channel-lists-only.md)                         | Codex 5.3 | done   |
| P2.1.3 | [706-home-filter-sort-screen](/docs/proposals/mobile/_master-plan_/phase-2/details/706-home-filter-sort-screen.md)                                       | Codex 5.3 | done   |
| P2.1.3 | [709-search-tab-web-alignment](/docs/proposals/mobile/_master-plan_/phase-2/details/709-search-tab-web-alignment.md)                                     | Codex 5.3 | done   |

The original steps above are implemented and their plans are archived. The focused P2.1.1 follow-ups
in details 721, 738, and 739–741 are implemented and complete.
Focused device review remains recommended follow-up verification, not a prerequisite for completion.

Locked decisions for this area live in `.llm/plans/completed/mobile-p2-home-podcasts/00-SUMMARY.md`,
`.llm/plans/completed/mobile-p2-browse-podcast-host-names/00-SUMMARY.md`,
`.llm/plans/completed/mobile-p2-home-subscribed-chips/00-SUMMARY.md`, and details
[739](/docs/proposals/mobile/_master-plan_/phase-2/details/739-home-subscribed-channel-kind-and-loaders.md)–[741](/docs/proposals/mobile/_master-plan_/phase-2/details/741-home-filter-channel-lists-only.md).

**Navigation note.** The nextgen bottom tab layout intentionally differs from the previous
generation and is **not** a parity gap. Nextgen keeps Home, Search, Notifications, My Library, and
More; the previous generation's separate Podcasts / Episodes / Clips tabs are represented by Home's
media-type chips. Home is subscribed-only; discovery is Browse (directory) and Search (feeds).

### Planned steps — P2.1.2 Podcast screen

Second area detailed from operator screenshots of the previous-generation Podcast screen. **Podcast
screen is implemented**; episode detail waits for its own screenshot batch. Cross-surface
notification defaults (auto-enable on subscribe + type-default Settings UI) landed with this area.

| Step   | Detail                                                                                                                                               | Model     | Status |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------ |
| P2.1.2 | [723-podcast-channel-header-and-section-chips](/docs/proposals/mobile/_master-plan_/phase-2/details/723-podcast-channel-header-and-section-chips.md) | Codex 5.3 | done   |
| P2.1.2 | [724-podcast-section-lists](/docs/proposals/mobile/_master-plan_/phase-2/details/724-podcast-section-lists.md)                                       | Codex 5.3 | done   |
| P2.1.2 | [725-podcast-row-actions-and-download](/docs/proposals/mobile/_master-plan_/phase-2/details/725-podcast-row-actions-and-download.md)                 | Codex 5.3 | done   |
| P2.1.2 | [726-podcast-settings-and-header-bell](/docs/proposals/mobile/_master-plan_/phase-2/details/726-podcast-settings-and-header-bell.md)                 | Codex 5.3 | done   |
| P2.1.2 | [727-notification-subscribe-defaults](/docs/proposals/mobile/_master-plan_/phase-2/details/727-notification-subscribe-defaults.md)                   | Opus 5    | done   |
| P2.1.2 | [730-podcast-header-and-item-row-density](/docs/proposals/mobile/_master-plan_/phase-2/details/730-podcast-header-and-item-row-density.md)           | Codex 5.3 | done   |

Locked decisions live in those detail docs. Subscribe stays notification-off unless the account
opts into auto-enable; Share and Bell are always on the header; Gear is signed-in and subscribed
only; auto-download stays deferred
([728](/docs/proposals/mobile/_master-plan_/phase-2/details/728-defer-channel-auto-download.md)).
Music channel visuals are planned below (762–764); the video half of
[729](/docs/proposals/mobile/_master-plan_/phase-2/details/729-defer-video-music-channel-visuals.md)
stays deferred because video channels keep podcast/episode UX (match web). Header density and
adaptive item rows (channel context vs in-channel) landed in 730.

Detail IDs start at **723** because `722` is already
[722-popularity-tracking-consent](/docs/proposals/mobile/_master-plan_/phase-2/details/722-popularity-tracking-consent.md).

### Implemented steps — P2.1.2 Music detail (album / artist / track)

Web-parity music surfaces are implemented from `apps/web` album / artist / track pages (not legacy
screenshots). Medium foundations (P2.4.13) remain the prerequisite. Completed plan set:
`.llm/plans/completed/04-mobile-p2-music-detail/`. This un-defers and lands the **music half** of 729.

| Step   | Detail                                                                                                                             | Model     | Status |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------- | --------- | ------ |
| P2.1.2 | [762-album-detail-parity](/docs/proposals/mobile/_master-plan_/phase-2/details/762-album-detail-parity.md)                         | Codex 5.3 | done   |
| P2.1.2 | [763-artist-detail-parity](/docs/proposals/mobile/_master-plan_/phase-2/details/763-artist-detail-parity.md)                       | Codex 5.3 | done   |
| P2.1.2 | [764-track-detail-and-library-routes](/docs/proposals/mobile/_master-plan_/phase-2/details/764-track-detail-and-library-routes.md) | Codex 5.3 | done   |

Locked decisions: `.llm/plans/completed/04-mobile-p2-music-detail/00-SUMMARY.md`. Boosts stay Phase 3;
video stays on podcast/episode routes; no Home `videos` chip.

### Planned steps — P2.1.5 Library (Downloads) + Settings storage

Nextgen product feedback on the Downloads screen (not a legacy port). Plan set:
`.llm/plans/completed/mobile-p2-library-downloads/`.

| Step    | Detail                                                                                                                                     | Model     | Status   |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------- | -------- |
| P2.1.5  | [731-redundant-screen-titles-sweep](/docs/proposals/mobile/_master-plan_/phase-2/details/731-redundant-screen-titles-sweep.md)             | Auto      | done     |
| P2.1.10 | [732-downloads-settings-storage](/docs/proposals/mobile/_master-plan_/phase-2/details/732-downloads-settings-storage.md)                   | Codex 5.3 | done     |
| P2.1.10 | [742-offline-mode](/docs/proposals/mobile/_master-plan_/phase-2/details/742-offline-mode.md)                                               | Auto      | done     |
| P2.1.10 | [779-automatic-offline-detection](/docs/proposals/mobile/_master-plan_/phase-2/details/779-automatic-offline-detection.md)                 | Opus 5    | done     |
| P2.1.5  | [733-download-list-sections-and-rows](/docs/proposals/mobile/_master-plan_/phase-2/details/733-download-list-sections-and-rows.md)         | Codex 5.3 | done     |
| P2.1.5  | [734-download-pause-resume-concurrency](/docs/proposals/mobile/_master-plan_/phase-2/details/734-download-pause-resume-concurrency.md)     | Opus 5    | done     |
| P2.1.5  | [735-swipe-action-row](/docs/proposals/mobile/_master-plan_/phase-2/details/735-swipe-action-row.md)                                       | Codex 5.3 | done     |
| P2.1.5  | [736-home-unsubscribed-downloads-section](/docs/proposals/mobile/_master-plan_/phase-2/details/736-home-unsubscribed-downloads-section.md) | Codex 5.3 | done     |
| P2.3.16 | [737-defer-storage-cache-precision](/docs/proposals/mobile/_master-plan_/phase-2/details/737-defer-storage-cache-precision.md)             | Auto      | deferred |

Locked decisions: `.llm/plans/completed/mobile-p2-library-downloads/00-SUMMARY.md`.

### Implemented steps — P2.1.5 Library (Queue)

Queue now matches the intended web parity surface for this area: one combined queue list, medium
chips, tap play-and-remove, swipe remove, and long-press reorder with accessibility move actions.
Web (`apps/web/src/app/queues/`) remained the behavior reference for this work. The implementation
plan set is complete and removed from active planning.

| Step   | Detail                                                                                                                               | Model     | Status |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------ | --------- | ------ |
| P2.1.5 | [757-queue-screen-list-and-row-parity](/docs/proposals/mobile/_master-plan_/phase-2/details/757-queue-screen-list-and-row-parity.md) | Codex 5.3 | done   |
| P2.1.5 | [758-queue-play-and-remove](/docs/proposals/mobile/_master-plan_/phase-2/details/758-queue-play-and-remove.md)                       | Opus 5    | done   |
| P2.1.5 | [759-queue-reorder-long-press-drag](/docs/proposals/mobile/_master-plan_/phase-2/details/759-queue-reorder-long-press-drag.md)       | Opus 5    | done   |

Locked decisions for this area are reflected in details 757, 758, and 759. History and a clear-queue
affordance remain outside this set.

Queue reorder reopened the functional half of
[599](/docs/proposals/mobile/_master-plan_/phase-2/details/599-defer-pixel-dnd-polish.md) for this
screen, and that functional work is now complete. Haptics, spring animation, and custom drag chrome
remain deferred under 599.

### Implemented steps — P2.1.4 Player & now playing

Operator-dictated area. Inventory and locked decisions live in
`.llm/plans/completed/mobile-p2-player/`
([FEATURE-INVENTORY.md](/.llm/plans/completed/mobile-p2-player/FEATURE-INVENTORY.md),
[00-SUMMARY.md](/.llm/plans/completed/mobile-p2-player/00-SUMMARY.md)).

| Step    | Detail                                                                                                                                 | Model     | Status   |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------- | -------- |
| P2.1.4  | [747-player-screen-layout-and-scroll](/docs/proposals/mobile/_master-plan_/phase-2/details/747-player-screen-layout-and-scroll.md)     | Opus 5    | done     |
| P2.1.4  | [748-player-transport-parity](/docs/proposals/mobile/_master-plan_/phase-2/details/748-player-transport-parity.md)                     | Opus 5    | done     |
| P2.1.4  | [749-player-action-rows-and-more-sheet](/docs/proposals/mobile/_master-plan_/phase-2/details/749-player-action-rows-and-more-sheet.md) | Codex 5.3 | done     |
| P2.1.4  | [750-player-section-chips-and-panes](/docs/proposals/mobile/_master-plan_/phase-2/details/750-player-section-chips-and-panes.md)       | Codex 5.3 | done     |
| P2.3.19 | [751-defer-player-volume-slider](/docs/proposals/mobile/_master-plan_/phase-2/details/751-defer-player-volume-slider.md)               | Auto      | deferred |

Clip authoring was split out as its own area and is now planned below. Transcript **coupling** stays
deferred (598); the Transcript chip itself is in 750.

### Planned steps — P2.1.4 Make Clip + P2.1.12 FAQ

The clip authoring area split out of the player work, detailed from an operator screenshot of the
previous-generation Make Clip screen. It brings a slice of P2.1.12 with it, because the previous
generation's Make Clip screen links to How To and FAQ content and those documents have to exist
somewhere.

| Step    | Detail                                                                                                                             | Model     | Status |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------- | ------ |
| P2.1.4  | [752-mobile-make-clip-authoring](/docs/proposals/mobile/_master-plan_/phase-2/details/752-mobile-make-clip-authoring.md)           | Opus 5    | done   |
| P2.1.4  | [753-clip-authoring-playback-hold](/docs/proposals/mobile/_master-plan_/phase-2/details/753-clip-authoring-playback-hold.md)       | Opus 5    | done   |
| P2.1.12 | [754-server-managed-copy-endpoint](/docs/proposals/mobile/_master-plan_/phase-2/details/754-server-managed-copy-endpoint.md)       | Codex 5.3 | done   |
| P2.1.12 | [755-mobile-faq-and-clip-how-to](/docs/proposals/mobile/_master-plan_/phase-2/details/755-mobile-faq-and-clip-how-to.md)           | Codex 5.3 | done   |
| P2.5.4  | [756-web-faq-and-clip-preview-parity](/docs/proposals/mobile/_master-plan_/phase-2/details/756-web-faq-and-clip-preview-parity.md) | Codex 5.3 | done   |

Locked decisions for this set are captured in the implemented details. The load-bearing ones: times
are captured from the playhead and never typed; visibility is three chips matching the API's three
sharable statuses; the queue **holds** the now-playing item while authoring rather than looping it as
the previous generation did; create and update require a membership while delete does not; and the
FAQ and how-to copy is served from the API so it can change without an app release.

**Two cross-surface changes ride along.** `ClipController.deleteClip` drops its membership
requirement, which changes web and every other client at the same time, and web gains a `/faq` page
plus the shared clip-preview constant (P2.5.4). Web's clip editor still does not hold its queue —
recorded as a known gap in 756, not assumed parity.

**Deliberately not in this area:** the rest of the previous generation's FAQ (the two open-source
answers), the other P2.1.12 static screens, and any clip authoring on web beyond what already ships.

### Implemented steps — P2.1.4 Alternate enclosures

Mobile now matches web parity for preferred-type seeding, source picker, and enclosure-switch
resume. The implementation plan set is complete and removed from active planning.

| Step   | Detail                                                                                                                                 | Model     | Status |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------ |
| P2.1.4 | [765-enclosure-selection-session-state](/docs/proposals/mobile/_master-plan_/phase-2/details/765-enclosure-selection-session-state.md) | Opus 5    | done   |
| P2.1.4 | [766-enclosure-source-picker](/docs/proposals/mobile/_master-plan_/phase-2/details/766-enclosure-source-picker.md)                     | Codex 5.3 | done   |
| P2.1.4 | [767-enclosure-switch-and-downloads](/docs/proposals/mobile/_master-plan_/phase-2/details/767-enclosure-switch-and-downloads.md)       | Opus 5    | done   |

Locked decisions were captured in the alternate-enclosures plan set before closeout.

### Implemented steps — P2.1.4 Medium player + video surface

Enclosure-driven video surface (web `isNonLiveVideoPlaying` parity) and music transport chrome are
implemented. The plan set is complete and removed from active planning.

| Step   | Detail                                                                                                                           | Model     | Status |
| ------ | -------------------------------------------------------------------------------------------------------------------------------- | --------- | ------ |
| P2.1.4 | [768-enclosure-driven-video-surface](/docs/proposals/mobile/_master-plan_/phase-2/details/768-enclosure-driven-video-surface.md) | Opus 5    | done   |
| P2.1.4 | [769-music-player-chrome](/docs/proposals/mobile/_master-plan_/phase-2/details/769-music-player-chrome.md)                       | Codex 5.3 | done   |

Locked decisions were captured in the medium-player plan set before closeout. No video channel or
video detail screens — Video medium stays on podcast/episode UX.

### Implemented steps — P2.1.6 Playlists

Web (`apps/web/src/app/playlists/`, `apps/web/src/app/playlist/`) is the behavior authority; no
legacy screenshots were provided for this area. Plan set:
`.llm/plans/completed/06-mobile-p2-playlists/`. Executed after queue work (757–759): playlist
reorder reuses long-press drag on `ReorderableSections` and the drop → first / last / between
resolver.

| Step   | Detail                                                                                                                                           | Model     | Status |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ------ |
| P2.1.6 | [771-playlist-data-layer-and-offline-cache](/docs/proposals/mobile/_master-plan_/phase-2/details/771-playlist-data-layer-and-offline-cache.md)   | Codex 5.3 | done   |
| P2.1.6 | [772-library-playlists-list](/docs/proposals/mobile/_master-plan_/phase-2/details/772-library-playlists-list.md)                                 | Codex 5.3 | done   |
| P2.1.6 | [773-playlist-detail-parity](/docs/proposals/mobile/_master-plan_/phase-2/details/773-playlist-detail-parity.md)                                 | Codex 5.3 | done   |
| P2.1.6 | [774-playlist-edit-items-reorder-and-remove](/docs/proposals/mobile/_master-plan_/phase-2/details/774-playlist-edit-items-reorder-and-remove.md) | Opus 5    | done   |
| P2.1.6 | [775-playlist-form-parity-and-delete](/docs/proposals/mobile/_master-plan_/phase-2/details/775-playlist-form-parity-and-delete.md)               | Codex 5.3 | done   |
| P2.1.6 | [776-add-to-playlist-sheet-parity](/docs/proposals/mobile/_master-plan_/phase-2/details/776-add-to-playlist-sheet-parity.md)                     | Codex 5.3 | done   |

Locked decisions: `.llm/plans/completed/06-mobile-p2-playlists/00-SUMMARY.md`. Library = My / Followed
chips (existing endpoints); Browse keeps public discovery; membership for mutations; offline-first
`playlistRepository`; owner edit-items mode with long-press drag + swipe remove; row tap plays.

Deferred from this area into Track P2.3: Liked playlists / row likes ([777](/docs/proposals/mobile/_master-plan_/phase-2/details/777-defer-liked-playlist-and-row-likes.md)),
public sorts beyond top and Library medium filter
([778](/docs/proposals/mobile/_master-plan_/phase-2/details/778-defer-playlist-medium-and-public-sort.md)).

## Track P2.2 — Visual polish (absorbs Phase 1 Track 23)

Phase 1's Track 23 was **declined as a standalone agent phase** because the operator planned to
polish by hand. The screenshot-driven loop supersedes that: polish is now part of each P2.1 area
rather than a separate pass.

| Step              | Detail                                                                                                                       | Model     | Status                                                                       |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------- | ---------------------------------------------------------------------------- |
| P2.2.1 (was 23.1) | [595-operator-polish-checklist](/docs/proposals/mobile/_master-plan_/phase-2/details/595-operator-polish-checklist.md)       | Auto      | superseded by per-area screenshot intake                                     |
| P2.2.2 (was 23.2) | [596-operator-polish-apply-briefs](/docs/proposals/mobile/_master-plan_/phase-2/details/596-operator-polish-apply-briefs.md) | Codex 5.3 | superseded — briefs are the answers captured per area                        |
| P2.2.3 (was 23.3) | [597-list-virtualization-polish](/docs/proposals/mobile/_master-plan_/phase-2/details/597-list-virtualization-polish.md)     | Codex 5.3 | part (a) baseline done; part (b) FlashList/windowing tuning still jank-gated |

**Publish hold remains in force.** No alpha / internal / pre-beta test-track promotion until the
operator authorizes it after the relevant implementation and verification work. Enforced by Phase 1
Track 4 (CI/store safety) and Track 22 (release process).

## Track P2.3 — Operational backlog

Low priority. Pulled in only when the operator asks. These carried over from Phase 1 with no detail
doc written except where noted.

| Step    | Carried from | What                                                                                                                                                                                                                                    | Model     |
| ------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| P2.3.1  | 22.4         | Minimum-supported-client-version API signal for forced upgrade prompts                                                                                                                                                                  | Opus 5    |
| P2.3.2  | 20.7         | Submit to metaboost-registry or F-Droid request issue (operator step)                                                                                                                                                                   | Auto      |
| P2.3.3  | 18.16        | CI tablet emulator matrix job (optional nightly, not a PR gate)                                                                                                                                                                         | Codex 5.3 |
| P2.3.4  | 18.17        | Store listings: separate screenshots per form factor                                                                                                                                                                                    | Auto      |
| P2.3.5  | 21.11        | [598-defer-player-transcript-chrome](/docs/proposals/mobile/_master-plan_/phase-2/details/598-defer-player-transcript-chrome.md) — player transcript chrome deferred                                                                    | Auto      |
| P2.3.6  | 21.12        | [599-defer-pixel-dnd-polish](/docs/proposals/mobile/_master-plan_/phase-2/details/599-defer-pixel-dnd-polish.md) — queue reopened and completed the functional reorder half; polish (haptics/springs/custom drag chrome) stays deferred | Auto      |
| P2.3.7  | new          | [898-defer-theme-mode-grouping](/docs/proposals/mobile/_master-plan_/phase-2/details/898-defer-theme-mode-grouping.md) — group UI themes by mode                                                                                        | Codex 5.3 |
| P2.3.8  | new          | [710-defer-filter-pull-down-reveal](/docs/proposals/mobile/_master-plan_/phase-2/details/710-defer-filter-pull-down-reveal.md)                                                                                                          | Codex 5.3 |
| P2.3.9  | new          | [711-defer-auto-renew-aware-reminders](/docs/proposals/mobile/_master-plan_/phase-2/details/711-defer-auto-renew-aware-reminders.md)                                                                                                    | Codex 5.3 |
| P2.3.10 | new          | [899-defer-accessibility-audit](/docs/proposals/mobile/_master-plan_/phase-2/details/899-defer-accessibility-audit.md) — full screen reader audit across all four surfaces                                                              | Opus 5    |
| P2.3.11 | new          | [897-defer-mobile-schema-and-persistence-contract-checks](/docs/proposals/mobile/_master-plan_/phase-2/details/897-defer-mobile-schema-drift-checks.md) — evaluate after Phase 2 closes                                                 | Auto      |
| P2.3.12 | new          | [896-defer-tablet-layout-parity](/docs/proposals/mobile/_master-plan_/phase-2/details/896-defer-tablet-layout-parity.md) — tablet left rail and missing mini player                                                                     | Opus 5    |
| P2.3.13 | new          | [894-schedule-cross-app-comments](/docs/proposals/mobile/_master-plan_/phase-2/details/894-schedule-cross-app-comments.md) — Podcasting 2.0 cross-app comments                                                                          | Opus 5    |
| P2.3.14 | new          | [728-defer-channel-auto-download](/docs/proposals/mobile/_master-plan_/phase-2/details/728-defer-channel-auto-download.md) — per-channel auto-download (placeholder on podcast settings)                                                | Auto      |
| P2.3.15 | new          | [729-defer-video-music-channel-visuals](/docs/proposals/mobile/_master-plan_/phase-2/details/729-defer-video-music-channel-visuals.md) — **music half superseded** by 762–764; video half stays deferred (podcast/episode UX)           | Auto      |
| P2.3.16 | new          | [737-defer-storage-cache-precision](/docs/proposals/mobile/_master-plan_/phase-2/details/737-defer-storage-cache-precision.md) — Clear cache / expo-image / concurrency pref                                                            | Auto      |
| P2.3.17 | new          | [745-defer-mobile-add-by-rss-playback-recording](/docs/proposals/mobile/_master-plan_/phase-2/details/745-defer-mobile-add-by-rss-playback-recording.md) — mobile records no add-by-RSS playback                                        | Opus 5    |
| P2.3.18 | new          | [746-defer-handoff-dismissal-memory](/docs/proposals/mobile/_master-plan_/phase-2/details/746-defer-handoff-dismissal-memory.md) — one dismissal slot, re-prompts when the other device plays on                                        | Opus 5    |
| P2.3.19 | new          | [751-defer-player-volume-slider](/docs/proposals/mobile/_master-plan_/phase-2/details/751-defer-player-volume-slider.md) — device volume in the player More sheet needs a native module                                                 | Auto      |
| P2.3.20 | new          | [777-defer-liked-playlist-and-row-likes](/docs/proposals/mobile/_master-plan_/phase-2/details/777-defer-liked-playlist-and-row-likes.md) — Liked playlists + per-row like toggles (cross-cutting)                                       | Codex 5.3 |
| P2.3.21 | new          | [778-defer-playlist-medium-and-public-sort](/docs/proposals/mobile/_master-plan_/phase-2/details/778-defer-playlist-medium-and-public-sort.md) — public sorts beyond top; Library AV/Music filter                                       | Codex 5.3 |

**P2.3.10 is a deferral of the _existing_ surface area only.** All **new** screens and components must
be screen reader accessible when they land, per
[`screen-reader-accessibility`](/.cursor/rules/screen-reader-accessibility.mdc). Do not cite the audit
deferral as a reason to ship a new unlabeled control.

### Open items needing an operator decision

These are real, currently-unresolved gaps from Phase 1. Surface them whenever the operator asks
what's next.

| #   | Item                                                                                                                                               | Why it needs the operator                                                                                                                                                                                                                                                       |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **CarPlay Simulator proof** — CarPlay Library/Downloads/play was implemented but never verified on a real Simulator session                        | Manual device workflow; see [CARPLAY-SIMULATOR-CHECKLIST.md](/apps/mobile/modules/podverse-media-engine/CARPLAY-SIMULATOR-CHECKLIST.md)                                                                                                                                         |
| 2   | **Android Auto DHU run + Play Console car declaration**                                                                                            | Manual DHU session plus a Play Console form submission; see [ANDROID-AUTO-DHU-CHECKLIST.md](/apps/mobile/modules/podverse-media-engine/ANDROID-AUTO-DHU-CHECKLIST.md) and [ANDROID-AUTO-DECLARATION.md](/apps/mobile/modules/podverse-media-engine/ANDROID-AUTO-DECLARATION.md) |
| 3   | **`deep-link` + `push` E2E flows fail on both platforms** — Expo dev-client claims the `podverse-next://` scheme, so 2 of 22 Maestro flows are red | Fixing it changes what the test proves; the operator must choose between wrapping the link for dev-client, gating the flows to a standalone build, or a dev-only launcher bypass                                                                                                |

Item 3 also leaves a sticky iOS SpringBoard alert that contaminates the next flow in the suite, so
flow ordering is part of the decision. Full write-up was captured in the (gitignored)
`.artifacts/mobile-e2e-operator-issues.md` run log.

## Track P2.4 — Cross-cutting foundations

Not a legacy screen area. These emerged from the P2.1.1 screenshot review as prerequisites that the
screen work depends on, and they change contracts beyond `apps/mobile` (API, ORM, workers).
**Sequence P2.4 before the P2.1.1 / P2.1.3 steps.**

| Step    | Detail                                                                                                                                   | Model     | Status |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------ |
| P2.4.1  | [700-access-tiers-and-membership-gating](/docs/proposals/mobile/_master-plan_/phase-2/details/700-access-tiers-and-membership-gating.md) | Opus 5    | done   |
| P2.4.2  | [701-anonymous-subscriptions](/docs/proposals/mobile/_master-plan_/phase-2/details/701-anonymous-subscriptions.md)                       | Opus 5    | done   |
| P2.4.3  | [702-offline-content-sync](/docs/proposals/mobile/_master-plan_/phase-2/details/702-offline-content-sync.md)                             | Opus 5    | done   |
| P2.4.4  | [703-channel-seen-state](/docs/proposals/mobile/_master-plan_/phase-2/details/703-channel-seen-state.md)                                 | Opus 5    | done   |
| P2.4.5  | [704-notifications-read-unread-rename](/docs/proposals/mobile/_master-plan_/phase-2/details/704-notifications-read-unread-rename.md)     | Opus 5    | done   |
| P2.4.6  | [714-filter-sort-persistence](/docs/proposals/mobile/_master-plan_/phase-2/details/714-filter-sort-persistence.md)                       | Opus 5    | done   |
| P2.4.7  | [716-forced-logout-notice](/docs/proposals/mobile/_master-plan_/phase-2/details/716-forced-logout-notice.md)                             | Opus 5    | done   |
| P2.4.8  | [717-fast-startup-and-sync-queue](/docs/proposals/mobile/_master-plan_/phase-2/details/717-fast-startup-and-sync-queue.md)               | Opus 5    | done   |
| P2.4.9  | [718-sync-progress-indicator](/docs/proposals/mobile/_master-plan_/phase-2/details/718-sync-progress-indicator.md)                       | Opus 5    | done   |
| P2.4.10 | [719-sync-event-log](/docs/proposals/mobile/_master-plan_/phase-2/details/719-sync-event-log.md)                                         | Opus 5    | done   |
| P2.4.11 | [743-offline-playback-reconciliation](/docs/proposals/mobile/_master-plan_/phase-2/details/743-offline-playback-reconciliation.md)       | Opus 5    | done   |
| P2.4.12 | [744-multi-device-playback-handoff](/docs/proposals/mobile/_master-plan_/phase-2/details/744-multi-device-playback-handoff.md)           | Opus 5    | done   |
| P2.4.13 | [760-shared-medium-route-kind](/docs/proposals/mobile/_master-plan_/phase-2/details/760-shared-medium-route-kind.md)                     | Codex 5.3 | done   |
| P2.4.13 | [761-channel-detail-shell-and-prefs](/docs/proposals/mobile/_master-plan_/phase-2/details/761-channel-detail-shell-and-prefs.md)         | Codex 5.3 | done   |

**P2.4.13 (medium foundations)** is complete and shares route-kind vocabulary across web and mobile.
It remains the prerequisite for music detail.
No Home `videos` chip; subscribed video channels stay under `podcasts` (web `av`).

**P2.4.11 and P2.4.12 are complete, and they are foundational correctness work.** Playback
reconciliation now records meaningful-event timestamps across writes, persists offline playback in a
bounded outbox, and replays that listening history in chronological order after reconnect. Mobile and
web both use the same handoff comparison logic: same-item disagreements adopt the newer position
silently, different-item disagreements prompt the user, and active local playback never gets
interrupted by loading a different item. Two gaps are recorded rather than closed:
[745](/docs/proposals/mobile/_master-plan_/phase-2/details/745-defer-mobile-add-by-rss-playback-recording.md)
(mobile records no add-by-RSS playback, so those listens never sync) and
[746](/docs/proposals/mobile/_master-plan_/phase-2/details/746-defer-handoff-dismissal-memory.md)
(one dismissal slot, which re-prompts while another device keeps playing).

**Three facts shape that work, and each was long assumed otherwise.** There is no pending-mutation
outbox anywhere in the app — subscriptions and channel seen state are local-first domain tables
reconciled by later-wins on the next sync run, and the `writeBehind` helper is exported but
uncalled. History, now playing, and upcoming are zones of `list_position` on one `queue_resource`
table where `UNIQUE (queue_id, item_id)` puts an item in exactly one zone, so reconciliation is one
rule over items rather than three rules over zones. And listen stats are already idempotent —
`UNIQUE (account_guid, <entity>_id)` with an `ON CONFLICT DO NOTHING` insert makes them unique
listeners in a rolling window, not play counts, so buffered stats replay safely with no dedupe
work at all.

Completed plan set: `.llm/plans/completed/mobile-p2-playback-reconciliation/`, which builds **both**
steps — P2.4.11 in prompts 01–07 and P2.4.12 in prompt 08. The handoff model is recorded in detail
744: a resume prompt for a **different** item, where the declined one moves to history, while the
same item at a different position simply adopts the newer position with no prompt.

**Step numbers are identifiers, not the run order.** Within P2.4 the run order is the plan set's —
see [00-EXECUTION-ORDER.md](/.llm/plans/completed/mobile-p2-home-podcasts/00-EXECUTION-ORDER.md).
**P2.4.8–P2.4.10 run before P2.4.3**: offline content sync is the largest producer of sync work, so
the queue and its indicator must exist before it is built, or it ships with no orchestration and is
reworked immediately after.

Five standing policies came out of this track and are now abcmemory rather than plan text:

- Mobile works signed out, and the premium boundary is "does this need a server-side write or job?" —
  [`mobile-anonymous-vs-account-features`](/.cursor/rules/mobile-anonymous-vs-account-features.mdc),
  including the three access tiers and lapsed-membership behavior.
- Offline listening is a headline feature; subscribed channels **and their items** are stored
  locally and background-synced — **mobile-data-layer** skill.
- Align layout with the previous generation, never its color scheme — **mobile-theme-parity** skill.
- Work focused on one surface must assess whether web, API, or ORM need matching changes —
  [`cross-surface-change-impact`](/.cursor/rules/cross-surface-change-impact.mdc).
- Every new screen and component ships screen reader accessible —
  [`screen-reader-accessibility`](/.cursor/rules/screen-reader-accessibility.mdc). The existing
  surface area is audited separately in P2.3.10.
- Filter and sort selections are remembered per instance and stored on the device —
  [`filter-sort-persistence`](/.cursor/rules/filter-sort-persistence.mdc). P2.4.6 defines the
  contract; three earlier details were each heading toward their own preference key.

### Vocabulary split

Two indicators, two verb pairs. Do not mix them:

| Concept                 | Verb pair     | Tier                               |
| ----------------------- | ------------- | ---------------------------------- |
| New content per channel | seen / unseen | Anonymous locally; Account to sync |
| Notification inbox      | read / unread | Membership                         |

P2.4.5 carried that split through the ORM, API, request helpers, web, and i18n as a **breaking
rename** rather than a copy tweak, so each word now names exactly one indicator.

## Track P2.5 — Web counterparts

Mobile-focused work that nonetheless requires changes in `apps/web`. Per-channel seen state is
account-synced, so web is a client of it: if web read the state without writing it, opening a podcast
on the website would leave a permanently stale badge on the phone. The subscribed filter is a
deliberate parity choice rather than a correctness requirement.

**Sequence P2.5 after the P2.4 foundations it depends on.**

| Step   | Detail                                                                                                                                 | Model     | Status | Depends on |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------ | ---------- |
| P2.5.1 | [712-web-unseen-episode-indicator](/docs/proposals/mobile/_master-plan_/phase-2/details/712-web-unseen-episode-indicator.md)           | Opus 5    | done   | P2.4.4     |
| P2.5.2 | [713-web-subscribed-filter-input](/docs/proposals/mobile/_master-plan_/phase-2/details/713-web-subscribed-filter-input.md)             | Codex 5.3 | done   | P2.1.1     |
| P2.5.3 | [715-web-filter-sort-persistence](/docs/proposals/mobile/_master-plan_/phase-2/details/715-web-filter-sort-persistence.md)             | Opus 5    | done   | P2.4.6     |
| P2.5.4 | [756-web-faq-and-clip-preview-parity](/docs/proposals/mobile/_master-plan_/phase-2/details/756-web-faq-and-clip-preview-parity.md)     | Codex 5.3 | done   | P2.1.12    |
| P2.5.5 | [770-web-medium-route-kind-counterpart](/docs/proposals/mobile/_master-plan_/phase-2/details/770-web-medium-route-kind-counterpart.md) | Codex 5.3 | done   | P2.4.13    |

Web changes also live inside two P2.4 steps rather than as separate entries: the shared tier resolver
in P2.4.1 refactors web's `useMembershipGate`, and the notifications rename in P2.4.5 touches web's
inbox, bell badge, and hooks.

**Intentional divergences — recorded, not accidental.** Mobile subscriptions are local-first and work
signed out; web's stay account-backed. Mobile's Home is subscribed-only with media-type chips; web
keeps its type selector and server pagination. Mobile Browse has a `videos` chip while web's
`/videos` stays "Coming soon" and Home on both lumps video under podcasts / `av`. Neither is a
parity gap for this phase.

## Appendix — Phase 2 detail index

Status values: `not started` → `questions asked` → `planned` → `done`, plus two terminal values that
sit outside that progression — `deferred` (recorded on purpose, picked up in a later phase) and
`superseded` (the work is now handled somewhere else). Keep this table in sync with the track tables
above whenever status changes, per
[`mobile-master-plan-phasing`](/.cursor/skills/mobile-master-plan-phasing/SKILL.md).

| Detail                                                                                                                                                   | Step    | Model     | Status                                               |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | --------- | ---------------------------------------------------- |
| [595-operator-polish-checklist](/docs/proposals/mobile/_master-plan_/phase-2/details/595-operator-polish-checklist.md)                                   | P2.2.1  | Auto      | superseded                                           |
| [596-operator-polish-apply-briefs](/docs/proposals/mobile/_master-plan_/phase-2/details/596-operator-polish-apply-briefs.md)                             | P2.2.2  | Codex 5.3 | superseded                                           |
| [597-list-virtualization-polish](/docs/proposals/mobile/_master-plan_/phase-2/details/597-list-virtualization-polish.md)                                 | P2.2.3  | Codex 5.3 | part (a) done                                        |
| [598-defer-player-transcript-chrome](/docs/proposals/mobile/_master-plan_/phase-2/details/598-defer-player-transcript-chrome.md)                         | P2.3.5  | Auto      | deferred                                             |
| [599-defer-pixel-dnd-polish](/docs/proposals/mobile/_master-plan_/phase-2/details/599-defer-pixel-dnd-polish.md)                                         | P2.3.6  | Auto      | deferred                                             |
| [700-access-tiers-and-membership-gating](/docs/proposals/mobile/_master-plan_/phase-2/details/700-access-tiers-and-membership-gating.md)                 | P2.4.1  | Opus 5    | done                                                 |
| [701-anonymous-subscriptions](/docs/proposals/mobile/_master-plan_/phase-2/details/701-anonymous-subscriptions.md)                                       | P2.4.2  | Opus 5    | done                                                 |
| [702-offline-content-sync](/docs/proposals/mobile/_master-plan_/phase-2/details/702-offline-content-sync.md)                                             | P2.4.3  | Opus 5    | done                                                 |
| [703-channel-seen-state](/docs/proposals/mobile/_master-plan_/phase-2/details/703-channel-seen-state.md)                                                 | P2.4.4  | Opus 5    | done                                                 |
| [704-notifications-read-unread-rename](/docs/proposals/mobile/_master-plan_/phase-2/details/704-notifications-read-unread-rename.md)                     | P2.4.5  | Opus 5    | done                                                 |
| [705-home-subscribed-list-and-filter](/docs/proposals/mobile/_master-plan_/phase-2/details/705-home-subscribed-list-and-filter.md)                       | P2.1.1  | Codex 5.3 | done                                                 |
| [706-home-filter-sort-screen](/docs/proposals/mobile/_master-plan_/phase-2/details/706-home-filter-sort-screen.md)                                       | P2.1.3  | Codex 5.3 | done                                                 |
| [707-home-row-metadata](/docs/proposals/mobile/_master-plan_/phase-2/details/707-home-row-metadata.md)                                                   | P2.1.1  | Codex 5.3 | done                                                 |
| [708-home-view-toggle-and-overflow-menu](/docs/proposals/mobile/_master-plan_/phase-2/details/708-home-view-toggle-and-overflow-menu.md)                 | P2.1.1  | Codex 5.3 | done                                                 |
| [709-search-tab-web-alignment](/docs/proposals/mobile/_master-plan_/phase-2/details/709-search-tab-web-alignment.md)                                     | P2.1.3  | Codex 5.3 | done                                                 |
| [710-defer-filter-pull-down-reveal](/docs/proposals/mobile/_master-plan_/phase-2/details/710-defer-filter-pull-down-reveal.md)                           | P2.3.8  | Codex 5.3 | deferred                                             |
| [711-defer-auto-renew-aware-reminders](/docs/proposals/mobile/_master-plan_/phase-2/details/711-defer-auto-renew-aware-reminders.md)                     | P2.3.9  | Codex 5.3 | deferred                                             |
| [712-web-unseen-episode-indicator](/docs/proposals/mobile/_master-plan_/phase-2/details/712-web-unseen-episode-indicator.md)                             | P2.5.1  | Opus 5    | done                                                 |
| [713-web-subscribed-filter-input](/docs/proposals/mobile/_master-plan_/phase-2/details/713-web-subscribed-filter-input.md)                               | P2.5.2  | Codex 5.3 | done                                                 |
| [714-filter-sort-persistence](/docs/proposals/mobile/_master-plan_/phase-2/details/714-filter-sort-persistence.md)                                       | P2.4.6  | Opus 5    | done                                                 |
| [715-web-filter-sort-persistence](/docs/proposals/mobile/_master-plan_/phase-2/details/715-web-filter-sort-persistence.md)                               | P2.5.3  | Opus 5    | done                                                 |
| [716-forced-logout-notice](/docs/proposals/mobile/_master-plan_/phase-2/details/716-forced-logout-notice.md)                                             | P2.4.7  | Opus 5    | done                                                 |
| [717-fast-startup-and-sync-queue](/docs/proposals/mobile/_master-plan_/phase-2/details/717-fast-startup-and-sync-queue.md)                               | P2.4.8  | Opus 5    | done                                                 |
| [718-sync-progress-indicator](/docs/proposals/mobile/_master-plan_/phase-2/details/718-sync-progress-indicator.md)                                       | P2.4.9  | Opus 5    | done                                                 |
| [719-sync-event-log](/docs/proposals/mobile/_master-plan_/phase-2/details/719-sync-event-log.md)                                                         | P2.4.10 | Opus 5    | done                                                 |
| [743-offline-playback-reconciliation](/docs/proposals/mobile/_master-plan_/phase-2/details/743-offline-playback-reconciliation.md)                       | P2.4.11 | Opus 5    | done                                                 |
| [744-multi-device-playback-handoff](/docs/proposals/mobile/_master-plan_/phase-2/details/744-multi-device-playback-handoff.md)                           | P2.4.12 | Opus 5    | done                                                 |
| [747-player-screen-layout-and-scroll](/docs/proposals/mobile/_master-plan_/phase-2/details/747-player-screen-layout-and-scroll.md)                       | P2.1.4  | Opus 5    | done                                                 |
| [748-player-transport-parity](/docs/proposals/mobile/_master-plan_/phase-2/details/748-player-transport-parity.md)                                       | P2.1.4  | Opus 5    | done                                                 |
| [749-player-action-rows-and-more-sheet](/docs/proposals/mobile/_master-plan_/phase-2/details/749-player-action-rows-and-more-sheet.md)                   | P2.1.4  | Codex 5.3 | done                                                 |
| [750-player-section-chips-and-panes](/docs/proposals/mobile/_master-plan_/phase-2/details/750-player-section-chips-and-panes.md)                         | P2.1.4  | Codex 5.3 | done                                                 |
| [751-defer-player-volume-slider](/docs/proposals/mobile/_master-plan_/phase-2/details/751-defer-player-volume-slider.md)                                 | P2.3.19 | Auto      | deferred                                             |
| [757-queue-screen-list-and-row-parity](/docs/proposals/mobile/_master-plan_/phase-2/details/757-queue-screen-list-and-row-parity.md)                     | P2.1.5  | Codex 5.3 | done                                                 |
| [758-queue-play-and-remove](/docs/proposals/mobile/_master-plan_/phase-2/details/758-queue-play-and-remove.md)                                           | P2.1.5  | Opus 5    | done                                                 |
| [759-queue-reorder-long-press-drag](/docs/proposals/mobile/_master-plan_/phase-2/details/759-queue-reorder-long-press-drag.md)                           | P2.1.5  | Opus 5    | done                                                 |
| [720-defer-home-media-type-sort-coverage](/docs/proposals/mobile/_master-plan_/phase-2/details/720-defer-home-media-type-sort-coverage.md)               | P2.1.3  | Codex 5.3 | deferred                                             |
| [721-home-combined-subscriptions-and-rss-detail](/docs/proposals/mobile/_master-plan_/phase-2/details/721-home-combined-subscriptions-and-rss-detail.md) | P2.1.1  | Auto      | done                                                 |
| [723-podcast-channel-header-and-section-chips](/docs/proposals/mobile/_master-plan_/phase-2/details/723-podcast-channel-header-and-section-chips.md)     | P2.1.2  | Codex 5.3 | done                                                 |
| [724-podcast-section-lists](/docs/proposals/mobile/_master-plan_/phase-2/details/724-podcast-section-lists.md)                                           | P2.1.2  | Codex 5.3 | done                                                 |
| [725-podcast-row-actions-and-download](/docs/proposals/mobile/_master-plan_/phase-2/details/725-podcast-row-actions-and-download.md)                     | P2.1.2  | Codex 5.3 | done                                                 |
| [726-podcast-settings-and-header-bell](/docs/proposals/mobile/_master-plan_/phase-2/details/726-podcast-settings-and-header-bell.md)                     | P2.1.2  | Codex 5.3 | done                                                 |
| [727-notification-subscribe-defaults](/docs/proposals/mobile/_master-plan_/phase-2/details/727-notification-subscribe-defaults.md)                       | P2.1.2  | Opus 5    | done                                                 |
| [730-podcast-header-and-item-row-density](/docs/proposals/mobile/_master-plan_/phase-2/details/730-podcast-header-and-item-row-density.md)               | P2.1.2  | Codex 5.3 | done                                                 |
| [731-redundant-screen-titles-sweep](/docs/proposals/mobile/_master-plan_/phase-2/details/731-redundant-screen-titles-sweep.md)                           | P2.1.5  | Auto      | done                                                 |
| [732-downloads-settings-storage](/docs/proposals/mobile/_master-plan_/phase-2/details/732-downloads-settings-storage.md)                                 | P2.1.10 | Codex 5.3 | done                                                 |
| [742-offline-mode](/docs/proposals/mobile/_master-plan_/phase-2/details/742-offline-mode.md)                                                             | P2.1.10 | Auto      | done                                                 |
| [779-automatic-offline-detection](/docs/proposals/mobile/_master-plan_/phase-2/details/779-automatic-offline-detection.md)                               | P2.1.10 | Opus 5    | done                                                 |
| [733-download-list-sections-and-rows](/docs/proposals/mobile/_master-plan_/phase-2/details/733-download-list-sections-and-rows.md)                       | P2.1.5  | Codex 5.3 | done                                                 |
| [734-download-pause-resume-concurrency](/docs/proposals/mobile/_master-plan_/phase-2/details/734-download-pause-resume-concurrency.md)                   | P2.1.5  | Opus 5    | done                                                 |
| [735-swipe-action-row](/docs/proposals/mobile/_master-plan_/phase-2/details/735-swipe-action-row.md)                                                     | P2.1.5  | Codex 5.3 | done                                                 |
| [736-home-unsubscribed-downloads-section](/docs/proposals/mobile/_master-plan_/phase-2/details/736-home-unsubscribed-downloads-section.md)               | P2.1.5  | Codex 5.3 | done                                                 |
| [737-defer-storage-cache-precision](/docs/proposals/mobile/_master-plan_/phase-2/details/737-defer-storage-cache-precision.md)                           | P2.3.16 | Auto      | deferred                                             |
| [738-browse-podcast-host-names](/docs/proposals/mobile/_master-plan_/phase-2/details/738-browse-podcast-host-names.md)                                   | P2.1.1  | Codex 5.3 | done                                                 |
| [739-home-subscribed-channel-kind-and-loaders](/docs/proposals/mobile/_master-plan_/phase-2/details/739-home-subscribed-channel-kind-and-loaders.md)     | P2.1.1  | Codex 5.3 | done                                                 |
| [740-home-empty-discovery-ctas](/docs/proposals/mobile/_master-plan_/phase-2/details/740-home-empty-discovery-ctas.md)                                   | P2.1.1  | Codex 5.3 | done                                                 |
| [741-home-filter-channel-lists-only](/docs/proposals/mobile/_master-plan_/phase-2/details/741-home-filter-channel-lists-only.md)                         | P2.1.1  | Codex 5.3 | done                                                 |
| [728-defer-channel-auto-download](/docs/proposals/mobile/_master-plan_/phase-2/details/728-defer-channel-auto-download.md)                               | P2.3.14 | Auto      | deferred                                             |
| [729-defer-video-music-channel-visuals](/docs/proposals/mobile/_master-plan_/phase-2/details/729-defer-video-music-channel-visuals.md)                   | P2.3.15 | Auto      | music half superseded (762–764); video half deferred |
| [896-defer-tablet-layout-parity](/docs/proposals/mobile/_master-plan_/phase-2/details/896-defer-tablet-layout-parity.md)                                 | P2.3.12 | Opus 5    | deferred                                             |
| [898-defer-theme-mode-grouping](/docs/proposals/mobile/_master-plan_/phase-2/details/898-defer-theme-mode-grouping.md)                                   | P2.3.7  | Codex 5.3 | deferred                                             |
| [899-defer-accessibility-audit](/docs/proposals/mobile/_master-plan_/phase-2/details/899-defer-accessibility-audit.md)                                   | P2.3.10 | Opus 5    | deferred                                             |
| [897-defer-mobile-schema-and-persistence-contract-checks](/docs/proposals/mobile/_master-plan_/phase-2/details/897-defer-mobile-schema-drift-checks.md)  | P2.3.11 | Auto      | deferred                                             |
| [752-mobile-make-clip-authoring](/docs/proposals/mobile/_master-plan_/phase-2/details/752-mobile-make-clip-authoring.md)                                 | P2.1.4  | Opus 5    | done                                                 |
| [753-clip-authoring-playback-hold](/docs/proposals/mobile/_master-plan_/phase-2/details/753-clip-authoring-playback-hold.md)                             | P2.1.4  | Opus 5    | done                                                 |
| [754-server-managed-copy-endpoint](/docs/proposals/mobile/_master-plan_/phase-2/details/754-server-managed-copy-endpoint.md)                             | P2.1.12 | Codex 5.3 | done                                                 |
| [755-mobile-faq-and-clip-how-to](/docs/proposals/mobile/_master-plan_/phase-2/details/755-mobile-faq-and-clip-how-to.md)                                 | P2.1.12 | Codex 5.3 | done                                                 |
| [756-web-faq-and-clip-preview-parity](/docs/proposals/mobile/_master-plan_/phase-2/details/756-web-faq-and-clip-preview-parity.md)                       | P2.5.4  | Codex 5.3 | done                                                 |
| [760-shared-medium-route-kind](/docs/proposals/mobile/_master-plan_/phase-2/details/760-shared-medium-route-kind.md)                                     | P2.4.13 | Codex 5.3 | done                                                 |
| [761-channel-detail-shell-and-prefs](/docs/proposals/mobile/_master-plan_/phase-2/details/761-channel-detail-shell-and-prefs.md)                         | P2.4.13 | Codex 5.3 | done                                                 |
| [762-album-detail-parity](/docs/proposals/mobile/_master-plan_/phase-2/details/762-album-detail-parity.md)                                               | P2.1.2  | Codex 5.3 | done                                                 |
| [763-artist-detail-parity](/docs/proposals/mobile/_master-plan_/phase-2/details/763-artist-detail-parity.md)                                             | P2.1.2  | Codex 5.3 | done                                                 |
| [764-track-detail-and-library-routes](/docs/proposals/mobile/_master-plan_/phase-2/details/764-track-detail-and-library-routes.md)                       | P2.1.2  | Codex 5.3 | done                                                 |
| [765-enclosure-selection-session-state](/docs/proposals/mobile/_master-plan_/phase-2/details/765-enclosure-selection-session-state.md)                   | P2.1.4  | Opus 5    | done                                                 |
| [766-enclosure-source-picker](/docs/proposals/mobile/_master-plan_/phase-2/details/766-enclosure-source-picker.md)                                       | P2.1.4  | Codex 5.3 | done                                                 |
| [767-enclosure-switch-and-downloads](/docs/proposals/mobile/_master-plan_/phase-2/details/767-enclosure-switch-and-downloads.md)                         | P2.1.4  | Opus 5    | done                                                 |
| [768-enclosure-driven-video-surface](/docs/proposals/mobile/_master-plan_/phase-2/details/768-enclosure-driven-video-surface.md)                         | P2.1.4  | Opus 5    | done                                                 |
| [769-music-player-chrome](/docs/proposals/mobile/_master-plan_/phase-2/details/769-music-player-chrome.md)                                               | P2.1.4  | Codex 5.3 | done                                                 |
| [770-web-medium-route-kind-counterpart](/docs/proposals/mobile/_master-plan_/phase-2/details/770-web-medium-route-kind-counterpart.md)                   | P2.5.5  | Codex 5.3 | done                                                 |
| [771-playlist-data-layer-and-offline-cache](/docs/proposals/mobile/_master-plan_/phase-2/details/771-playlist-data-layer-and-offline-cache.md)           | P2.1.6  | Codex 5.3 | done                                                 |
| [772-library-playlists-list](/docs/proposals/mobile/_master-plan_/phase-2/details/772-library-playlists-list.md)                                         | P2.1.6  | Codex 5.3 | done                                                 |
| [773-playlist-detail-parity](/docs/proposals/mobile/_master-plan_/phase-2/details/773-playlist-detail-parity.md)                                         | P2.1.6  | Codex 5.3 | done                                                 |
| [774-playlist-edit-items-reorder-and-remove](/docs/proposals/mobile/_master-plan_/phase-2/details/774-playlist-edit-items-reorder-and-remove.md)         | P2.1.6  | Opus 5    | done                                                 |
| [775-playlist-form-parity-and-delete](/docs/proposals/mobile/_master-plan_/phase-2/details/775-playlist-form-parity-and-delete.md)                       | P2.1.6  | Codex 5.3 | done                                                 |
| [776-add-to-playlist-sheet-parity](/docs/proposals/mobile/_master-plan_/phase-2/details/776-add-to-playlist-sheet-parity.md)                             | P2.1.6  | Codex 5.3 | done                                                 |
| [777-defer-liked-playlist-and-row-likes](/docs/proposals/mobile/_master-plan_/phase-2/details/777-defer-liked-playlist-and-row-likes.md)                 | P2.3.20 | Codex 5.3 | deferred                                             |
| [778-defer-playlist-medium-and-public-sort](/docs/proposals/mobile/_master-plan_/phase-2/details/778-defer-playlist-medium-and-public-sort.md)           | P2.3.21 | Codex 5.3 | deferred                                             |

New Phase 2 detail docs use the **700–899** ID band (see
[PHASES.md](/docs/proposals/mobile/_master-plan_/PHASES.md) § Detail ID bands).
