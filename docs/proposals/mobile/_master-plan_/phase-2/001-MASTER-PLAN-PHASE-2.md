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
| Definition of done | Functional sketch + `testID` + E2E      | Functional **and** visually resolved for that area                   |
| Visual polish      | Deferred to Track 23                    | **Absorbed here** — polish happens per area, not in a separate track |

**Ship bar change:** Phase 1's ship bar told agents to stop at functional sketches and defer layout to
Track 23. That bar no longer applies. In Phase 2 an area is not done until the operator says the
screen looks right. Agents still do **not** invent visual direction — it comes from the screenshots
and the operator's answers.

## Working loop

```text
1. Operator pastes a batch of legacy screenshots for one screen area.
2. Agent asks questions — as many as are genuinely decision-blocking (see skill).
3. Operator answers; agent records the answers as a locked decision list.
4. Agent writes details/<id>-*.md + .llm/plans/active/mobile-p2-<area>/ COPY-PASTA set.
5. Operator pastes COPY-PASTA prompts; agent implements and marks steps done.
6. Operator verifies on device; area closes; repeat.
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

| Area                            | Legacy screens (`../podverse-rn/src/screens/`)                                                                                                           | Status             |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| P2.1.1 Home & browse            | `PodcastsScreen`, `PodcastsMediaTypeScreen`, `EpisodesScreen`, `ClipsScreen`, `AlbumsScreen`, `AlbumScreen`, `FeatureVideosScreen`                       | planned (podcasts) |
| P2.1.2 Podcast & episode detail | `PodcastScreen`, `PodcastInfoScreen`, `EpisodeScreen`, `EpisodeMediaRefScreen`, `EpisodeTranscriptScreen`                                                | not started        |
| P2.1.3 Search & filter          | `SearchScreen`, `FilterScreen`, `ScanQRCodeScreen`                                                                                                       | planned            |
| P2.1.4 Player & now playing     | `PlayerScreen`, `SleepTimerScreen`, `StartPodcastFromTimeScreen`, `MakeClipScreen`                                                                       | not started        |
| P2.1.5 Library                  | `MyLibraryScreen`, `QueueScreen`, `HistoryScreen`, `HistoryIndexListenerScreen`, `DownloadsScreen`                                                       | not started        |
| P2.1.6 Playlists                | `PlaylistsScreen`, `PlaylistScreen`, `EditPlaylistScreen`, `PlaylistsAddToScreen`                                                                        | not started        |
| P2.1.7 Add by RSS               | `AddPodcastByRSSScreen`, `AddPodcastByRSSAuthScreen`                                                                                                     | not started        |
| P2.1.8 Auth & onboarding        | `AuthScreen`, `OnboardingScreen`, `EmailVerificationScreen`, `ResetPasswordScreen`                                                                       | not started        |
| P2.1.9 Profiles                 | `ProfileScreen`, `ProfilesScreen`, `EditProfileScreen`                                                                                                   | not started        |
| P2.1.10 Settings & More         | `MoreScreen`, `SettingsScreen*` (11 sub-screens), `TrackingConsentScreen`                                                                                | not started        |
| P2.1.11 Membership              | `MembershipScreen`, `PurchasingScreen`                                                                                                                   | not started        |
| P2.1.12 Static & support        | `AboutScreen`, `ContactScreen`, `ContactXMPPChatScreen`, `FAQScreen`, `PrivacyPolicyScreen`, `TermsOfServiceScreen`, `ContributeScreen`, `WebPageScreen` | not started        |

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

| Step   | Detail                                                                                                                                   | Model     | Status  |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------- |
| P2.1.1 | [705-home-subscribed-list-and-filter](/docs/proposals/mobile/_master-plan_/phase-2/details/705-home-subscribed-list-and-filter.md)       | Codex 5.3 | implemented |
| P2.1.1 | [707-home-row-metadata](/docs/proposals/mobile/_master-plan_/phase-2/details/707-home-row-metadata.md)                                   | Codex 5.3 | implemented |
| P2.1.1 | [708-home-view-toggle-and-overflow-menu](/docs/proposals/mobile/_master-plan_/phase-2/details/708-home-view-toggle-and-overflow-menu.md) | Codex 5.3 | implemented |
| P2.1.3 | [706-home-filter-sort-screen](/docs/proposals/mobile/_master-plan_/phase-2/details/706-home-filter-sort-screen.md)                       | Codex 5.3 | implemented |
| P2.1.3 | [709-search-tab-web-alignment](/docs/proposals/mobile/_master-plan_/phase-2/details/709-search-tab-web-alignment.md)                     | Codex 5.3 | implemented |

Locked decisions for this area live in `.llm/plans/active/mobile-p2-home-podcasts/00-SUMMARY.md`.

**Navigation note.** The nextgen bottom tab layout intentionally differs from the previous
generation and is **not** a parity gap. Nextgen keeps Home, Search, Notifications, My Library, and
More; the previous generation's separate Podcasts / Episodes / Clips tabs are represented by Home's
media-type chips. Home is subscribed-only and all discovery lives in the Search tab.

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
operator signs off that the app looks right. Enforced by Phase 1 Track 4 (CI/store safety) and Track
22 (release process).

## Track P2.3 — Operational backlog

Low priority. Pulled in only when the operator asks. These carried over from Phase 1 with no detail
doc written except where noted.

| Step                                                                                              | Carried from | What                                                                                                                                                                       | Model     |
| ------------------------------------------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| P2.3.1                                                                                            | 22.4         | Minimum-supported-client-version API signal for forced upgrade prompts                                                                                                     | Opus 5    |
| P2.3.2                                                                                            | 20.7         | Submit to metaboost-registry or F-Droid request issue (operator step)                                                                                                      | Auto      |
| P2.3.3                                                                                            | 18.16        | CI tablet emulator matrix job (optional nightly, not a PR gate)                                                                                                            | Codex 5.3 |
| P2.3.4                                                                                            | 18.17        | Store listings: separate screenshots per form factor                                                                                                                       | Auto      |
| P2.3.5                                                                                            | 21.11        | [598-defer-player-transcript-chrome](/docs/proposals/mobile/_master-plan_/phase-2/details/598-defer-player-transcript-chrome.md) — record the deferral                     | Auto      |
| P2.3.6                                                                                            | 21.12        | [599-defer-pixel-dnd-polish](/docs/proposals/mobile/_master-plan_/phase-2/details/599-defer-pixel-dnd-polish.md) — record the deferral                                     | Auto      |
| P2.3.7                                                                                            | new          | [898-defer-theme-mode-grouping](/docs/proposals/mobile/_master-plan_/phase-2/details/898-defer-theme-mode-grouping.md) — group UI themes by mode                           | Codex 5.3 |
| P2.3.8                                                                                            | new          | [710-defer-filter-pull-down-reveal](/docs/proposals/mobile/_master-plan_/phase-2/details/710-defer-filter-pull-down-reveal.md)                                             | Codex 5.3 |
| P2.3.9                                                                                            | new          | [711-defer-auto-renew-aware-reminders](/docs/proposals/mobile/_master-plan_/phase-2/details/711-defer-auto-renew-aware-reminders.md)                                       | Codex 5.3 |
| P2.3.10                                                                                           | new          | [899-defer-accessibility-audit](/docs/proposals/mobile/_master-plan_/phase-2/details/899-defer-accessibility-audit.md) — full screen reader audit across all four surfaces | Opus 5    |
| P2.3.11                                                                                           | new          | [897-defer-mobile-schema-drift-checks](/docs/proposals/mobile/_master-plan_/phase-2/details/897-defer-mobile-schema-drift-checks.md) — evaluate after Phase 2 closes       | Auto      |
| P2.3.12                                                                                           | new          | [896-defer-tablet-layout-parity](/docs/proposals/mobile/_master-plan_/phase-2/details/896-defer-tablet-layout-parity.md) — tablet left rail and missing mini player        | Opus 5    |
| **P2.3.10 is a deferral of the _existing_ surface area only.** All **new** screens and components |
| must be screen reader accessible when they land, per                                              |
| [`screen-reader-accessibility`](/.cursor/rules/screen-reader-accessibility.mdc). Do not cite the  |
| audit deferral as a reason to ship a new unlabeled control.                                       |

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

| Step    | Detail                                                                                                                                   | Model  | Status      |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------- |
| P2.4.1  | [700-access-tiers-and-membership-gating](/docs/proposals/mobile/_master-plan_/phase-2/details/700-access-tiers-and-membership-gating.md) | Opus 5 | planned     |
| P2.4.2  | [701-anonymous-subscriptions](/docs/proposals/mobile/_master-plan_/phase-2/details/701-anonymous-subscriptions.md)                       | Opus 5 | planned     |
| P2.4.3  | [702-offline-content-sync](/docs/proposals/mobile/_master-plan_/phase-2/details/702-offline-content-sync.md)                             | Opus 5 | implemented |
| P2.4.4  | [703-channel-seen-state](/docs/proposals/mobile/_master-plan_/phase-2/details/703-channel-seen-state.md)                                 | Opus 5 | implemented |
| P2.4.5  | [704-notifications-read-unread-rename](/docs/proposals/mobile/_master-plan_/phase-2/details/704-notifications-read-unread-rename.md)     | Opus 5 | planned     |
| P2.4.6  | [714-filter-sort-persistence](/docs/proposals/mobile/_master-plan_/phase-2/details/714-filter-sort-persistence.md)                       | Opus 5 | planned     |
| P2.4.7  | [716-forced-logout-notice](/docs/proposals/mobile/_master-plan_/phase-2/details/716-forced-logout-notice.md)                             | Opus 5 | implemented |
| P2.4.8  | [717-fast-startup-and-sync-queue](/docs/proposals/mobile/_master-plan_/phase-2/details/717-fast-startup-and-sync-queue.md)               | Opus 5 | done        |
| P2.4.9  | [718-sync-progress-indicator](/docs/proposals/mobile/_master-plan_/phase-2/details/718-sync-progress-indicator.md)                       | Opus 5 | done        |
| P2.4.10 | [719-sync-event-log](/docs/proposals/mobile/_master-plan_/phase-2/details/719-sync-event-log.md)                                         | Opus 5 | done        |

**Step numbers are identifiers, not the run order.** Within P2.4 the run order is the plan set's —
see [00-EXECUTION-ORDER.md](/.llm/plans/active/mobile-p2-home-podcasts/00-EXECUTION-ORDER.md).
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

Notifications ship today using seen/unseen, so P2.4.5 is a **breaking rename** across the ORM, API,
request helpers, web, and i18n — not a copy tweak.

## Track P2.5 — Web counterparts

Mobile-focused work that nonetheless requires changes in `apps/web`. Per-channel seen state is
account-synced, so web is a client of it: if web read the state without writing it, opening a podcast
on the website would leave a permanently stale badge on the phone. The subscribed filter is a
deliberate parity choice rather than a correctness requirement.

**Sequence P2.5 after the P2.4 foundations it depends on.**

| Step   | Detail                                                                                                                       | Model     | Status  | Depends on |
| ------ | ---------------------------------------------------------------------------------------------------------------------------- | --------- | ------- | ---------- |
| P2.5.1 | [712-web-unseen-episode-indicator](/docs/proposals/mobile/_master-plan_/phase-2/details/712-web-unseen-episode-indicator.md) | Opus 5    | implemented | P2.4.4     |
| P2.5.2 | [713-web-subscribed-filter-input](/docs/proposals/mobile/_master-plan_/phase-2/details/713-web-subscribed-filter-input.md)   | Codex 5.3 | implemented | P2.1.1     |
| P2.5.3 | [715-web-filter-sort-persistence](/docs/proposals/mobile/_master-plan_/phase-2/details/715-web-filter-sort-persistence.md)   | Opus 5    | planned | P2.4.6     |

Web changes also live inside two P2.4 steps rather than as separate entries: the shared tier resolver
in P2.4.1 refactors web's `useMembershipGate`, and the notifications rename in P2.4.5 touches web's
inbox, bell badge, and hooks.

**Intentional divergences — recorded, not accidental.** Mobile subscriptions are local-first and work
signed out; web's stay account-backed. Mobile's Home is subscribed-only with media-type chips; web
keeps its type selector and server pagination. Neither is a parity gap.

## Appendix — Phase 2 detail index

Status values: `not started` → `questions asked` → `planned` → `done`. Keep this table in sync with
the track tables above whenever status changes, per
[`mobile-master-plan-phasing`](/.cursor/skills/mobile-master-plan-phasing/SKILL.md).

| Detail                                                                                                                                   | Step    | Model     | Status        |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ------- | --------- | ------------- |
| [595-operator-polish-checklist](/docs/proposals/mobile/_master-plan_/phase-2/details/595-operator-polish-checklist.md)                   | P2.2.1  | Auto      | superseded    |
| [596-operator-polish-apply-briefs](/docs/proposals/mobile/_master-plan_/phase-2/details/596-operator-polish-apply-briefs.md)             | P2.2.2  | Codex 5.3 | superseded    |
| [597-list-virtualization-polish](/docs/proposals/mobile/_master-plan_/phase-2/details/597-list-virtualization-polish.md)                 | P2.2.3  | Codex 5.3 | part (a) done |
| [598-defer-player-transcript-chrome](/docs/proposals/mobile/_master-plan_/phase-2/details/598-defer-player-transcript-chrome.md)         | P2.3.5  | Auto      | not started   |
| [599-defer-pixel-dnd-polish](/docs/proposals/mobile/_master-plan_/phase-2/details/599-defer-pixel-dnd-polish.md)                         | P2.3.6  | Auto      | not started   |
| [700-access-tiers-and-membership-gating](/docs/proposals/mobile/_master-plan_/phase-2/details/700-access-tiers-and-membership-gating.md) | P2.4.1  | Opus 5    | done          |
| [701-anonymous-subscriptions](/docs/proposals/mobile/_master-plan_/phase-2/details/701-anonymous-subscriptions.md)                       | P2.4.2  | Opus 5    | planned       |
| [702-offline-content-sync](/docs/proposals/mobile/_master-plan_/phase-2/details/702-offline-content-sync.md)                             | P2.4.3  | Opus 5    | implemented   |
| [703-channel-seen-state](/docs/proposals/mobile/_master-plan_/phase-2/details/703-channel-seen-state.md)                                 | P2.4.4  | Opus 5    | implemented   |
| [704-notifications-read-unread-rename](/docs/proposals/mobile/_master-plan_/phase-2/details/704-notifications-read-unread-rename.md)     | P2.4.5  | Opus 5    | planned       |
| [705-home-subscribed-list-and-filter](/docs/proposals/mobile/_master-plan_/phase-2/details/705-home-subscribed-list-and-filter.md)       | P2.1.1  | Codex 5.3 | implemented   |
| [706-home-filter-sort-screen](/docs/proposals/mobile/_master-plan_/phase-2/details/706-home-filter-sort-screen.md)                       | P2.1.3  | Codex 5.3 | implemented   |
| [707-home-row-metadata](/docs/proposals/mobile/_master-plan_/phase-2/details/707-home-row-metadata.md)                                   | P2.1.1  | Codex 5.3 | implemented   |
| [708-home-view-toggle-and-overflow-menu](/docs/proposals/mobile/_master-plan_/phase-2/details/708-home-view-toggle-and-overflow-menu.md) | P2.1.1  | Codex 5.3 | implemented   |
| [709-search-tab-web-alignment](/docs/proposals/mobile/_master-plan_/phase-2/details/709-search-tab-web-alignment.md)                     | P2.1.3  | Codex 5.3 | implemented   |
| [710-defer-filter-pull-down-reveal](/docs/proposals/mobile/_master-plan_/phase-2/details/710-defer-filter-pull-down-reveal.md)           | P2.3.8  | Codex 5.3 | deferred      |
| [711-defer-auto-renew-aware-reminders](/docs/proposals/mobile/_master-plan_/phase-2/details/711-defer-auto-renew-aware-reminders.md)     | P2.3.9  | Codex 5.3 | deferred      |
| [712-web-unseen-episode-indicator](/docs/proposals/mobile/_master-plan_/phase-2/details/712-web-unseen-episode-indicator.md)             | P2.5.1  | Opus 5    | implemented   |
| [713-web-subscribed-filter-input](/docs/proposals/mobile/_master-plan_/phase-2/details/713-web-subscribed-filter-input.md)               | P2.5.2  | Codex 5.3 | implemented   |
| [714-filter-sort-persistence](/docs/proposals/mobile/_master-plan_/phase-2/details/714-filter-sort-persistence.md)                       | P2.4.6  | Opus 5    | planned       |
| [715-web-filter-sort-persistence](/docs/proposals/mobile/_master-plan_/phase-2/details/715-web-filter-sort-persistence.md)               | P2.5.3  | Opus 5    | planned       |
| [716-forced-logout-notice](/docs/proposals/mobile/_master-plan_/phase-2/details/716-forced-logout-notice.md)                             | P2.4.7  | Opus 5    | implemented   |
| [717-fast-startup-and-sync-queue](/docs/proposals/mobile/_master-plan_/phase-2/details/717-fast-startup-and-sync-queue.md)               | P2.4.8  | Opus 5    | done          |
| [718-sync-progress-indicator](/docs/proposals/mobile/_master-plan_/phase-2/details/718-sync-progress-indicator.md)                       | P2.4.9  | Opus 5    | done          |
| [719-sync-event-log](/docs/proposals/mobile/_master-plan_/phase-2/details/719-sync-event-log.md)                                         | P2.4.10 | Opus 5    | done          |
| [720-defer-home-media-type-sort-coverage](/docs/proposals/mobile/_master-plan_/phase-2/details/720-defer-home-media-type-sort-coverage.md) | P2.1.3 | Codex 5.3 | deferred      |
| [896-defer-tablet-layout-parity](/docs/proposals/mobile/_master-plan_/phase-2/details/896-defer-tablet-layout-parity.md)                 | P2.3.12 | Opus 5    | deferred      |
| [898-defer-theme-mode-grouping](/docs/proposals/mobile/_master-plan_/phase-2/details/898-defer-theme-mode-grouping.md)                   | P2.3.7  | Codex 5.3 | deferred      |
| [899-defer-accessibility-audit](/docs/proposals/mobile/_master-plan_/phase-2/details/899-defer-accessibility-audit.md)                   | P2.3.10 | Opus 5    | deferred      |
| [897-defer-mobile-schema-drift-checks](/docs/proposals/mobile/_master-plan_/phase-2/details/897-defer-mobile-schema-drift-checks.md)     | P2.3.11 | Auto      | deferred      |

New Phase 2 detail docs use the **700–899** ID band (see
[PHASES.md](/docs/proposals/mobile/_master-plan_/PHASES.md) § Detail ID bands).
