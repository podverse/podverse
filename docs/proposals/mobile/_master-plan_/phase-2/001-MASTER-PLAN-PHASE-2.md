# Podverse Mobile — Master Plan (Phase 2, operator-guided)

> **Active phase.** Phase 1 ([001-MASTER-PLAN.md](/docs/proposals/mobile/_master-plan_/phase-1/001-MASTER-PLAN.md))
> delivered the framework: navigation, playback engine, data layer, car surfaces, CI, and E2E. Phase 2
> closes the gap between that framework and a shippable product, working from the **legacy app**
> (`../podverse-rn`) screen by screen.
>
> Phase index: [PHASES.md](/docs/proposals/mobile/_master-plan_/PHASES.md)

## How Phase 2 differs from Phase 1

| | Phase 1 | Phase 2 |
| --- | --- | --- |
| Scope decisions | Agent proposed whole parallel groups | **Operator** picks one screen area at a time |
| Input | Master plan step list + web parity code | **Legacy app screenshots** the operator pastes into chat |
| Agent's first move | Write detail docs | **Ask questions** about what to keep, drop, or change |
| Definition of done | Functional sketch + `testID` + E2E | Functional **and** visually resolved for that area |
| Visual polish | Deferred to Track 23 | **Absorbed here** — polish happens per area, not in a separate track |

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

| Area | Legacy screens (`../podverse-rn/src/screens/`) | Status |
| --- | --- | --- |
| P2.1.1 Home & browse | `PodcastsScreen`, `PodcastsMediaTypeScreen`, `EpisodesScreen`, `ClipsScreen`, `AlbumsScreen`, `AlbumScreen`, `FeatureVideosScreen` | not started |
| P2.1.2 Podcast & episode detail | `PodcastScreen`, `PodcastInfoScreen`, `EpisodeScreen`, `EpisodeMediaRefScreen`, `EpisodeTranscriptScreen` | not started |
| P2.1.3 Search & filter | `SearchScreen`, `FilterScreen`, `ScanQRCodeScreen` | not started |
| P2.1.4 Player & now playing | `PlayerScreen`, `SleepTimerScreen`, `StartPodcastFromTimeScreen`, `MakeClipScreen` | not started |
| P2.1.5 Library | `MyLibraryScreen`, `QueueScreen`, `HistoryScreen`, `HistoryIndexListenerScreen`, `DownloadsScreen` | not started |
| P2.1.6 Playlists | `PlaylistsScreen`, `PlaylistScreen`, `EditPlaylistScreen`, `PlaylistsAddToScreen` | not started |
| P2.1.7 Add by RSS | `AddPodcastByRSSScreen`, `AddPodcastByRSSAuthScreen` | not started |
| P2.1.8 Auth & onboarding | `AuthScreen`, `OnboardingScreen`, `EmailVerificationScreen`, `ResetPasswordScreen` | not started |
| P2.1.9 Profiles | `ProfileScreen`, `ProfilesScreen`, `EditProfileScreen` | not started |
| P2.1.10 Settings & More | `MoreScreen`, `SettingsScreen*` (11 sub-screens), `TrackingConsentScreen` | not started |
| P2.1.11 Membership | `MembershipScreen`, `PurchasingScreen` | not started |
| P2.1.12 Static & support | `AboutScreen`, `ContactScreen`, `ContactXMPPChatScreen`, `FAQScreen`, `PrivacyPolicyScreen`, `TermsOfServiceScreen`, `ContributeScreen`, `WebPageScreen` | not started |

**Not in Phase 2:** the legacy `V4V*` screens (`V4VBoostagramScreen`, `V4VConsentScreen`,
`V4VInfoStreamingSatsScreen`, `V4VPreviewScreen`, `V4VProvidersScreen`, `V4VProvidersAlbyScreen`,
`V4VProvidersAlbyLoginScreen`) and `FundingNowPlayingItemScreen` / `FundingPodcastEpisodeScreen`.
Those belong to [Phase 3](/docs/proposals/mobile/_master-plan_/phase-3/001-MASTER-PLAN-PHASE-3.md).

**Legacy is inspiration, not a port target.** Per
[`legacy-app-reference`](/.cursor/rules/legacy-app-reference.mdc), do not assume legacy APIs,
navigation, storage, or UX are correct for nextgen. Where nextgen already has a better pattern, say so
and ask before matching legacy.

## Track P2.2 — Visual polish (absorbs Phase 1 Track 23)

Phase 1's Track 23 was **declined as a standalone agent phase** (see
[`.llm/plans/completed/phase-1/mobile-pg13-operator-polish/00-SUMMARY.md`](/.llm/plans/completed/phase-1/mobile-pg13-operator-polish/00-SUMMARY.md))
because the operator planned to polish by hand. The screenshot-driven loop supersedes that: polish is
now part of each P2.1 area rather than a separate pass.

| Step | Detail | Model | Status |
| --- | --- | --- | --- |
| P2.2.1 (was 23.1) | [595-operator-polish-checklist](/docs/proposals/mobile/_master-plan_/phase-2/details/595-operator-polish-checklist.md) | Auto | superseded by per-area screenshot intake |
| P2.2.2 (was 23.2) | [596-operator-polish-apply-briefs](/docs/proposals/mobile/_master-plan_/phase-2/details/596-operator-polish-apply-briefs.md) | Codex 5.3 | superseded — briefs are the answers captured per area |
| P2.2.3 (was 23.3) | [597-list-virtualization-polish](/docs/proposals/mobile/_master-plan_/phase-2/details/597-list-virtualization-polish.md) | Codex 5.3 | part (a) baseline done; part (b) FlashList/windowing tuning still jank-gated |

**Publish hold remains in force.** No alpha / internal / pre-beta test-track promotion until the
operator signs off that the app looks right. Enforced by Phase 1 Track 4 (CI/store safety) and Track
22 (release process).

## Track P2.3 — Operational backlog

Low priority. Pulled in only when the operator asks. These carried over from Phase 1 with no detail
doc written except where noted.

| Step | Carried from | What | Model |
| --- | --- | --- | --- |
| P2.3.1 | 22.4 | Minimum-supported-client-version API signal for forced upgrade prompts | Opus 5 |
| P2.3.2 | 20.7 | Submit to metaboost-registry or F-Droid request issue (operator step) | Auto |
| P2.3.3 | 18.16 | CI tablet emulator matrix job (optional nightly, not a PR gate) | Codex 5.3 |
| P2.3.4 | 18.17 | Store listings: separate screenshots per form factor | Auto |
| P2.3.5 | 21.11 | [598-defer-player-transcript-chrome](/docs/proposals/mobile/_master-plan_/phase-2/details/598-defer-player-transcript-chrome.md) — record the deferral | Auto |
| P2.3.6 | 21.12 | [599-defer-pixel-dnd-polish](/docs/proposals/mobile/_master-plan_/phase-2/details/599-defer-pixel-dnd-polish.md) — record the deferral | Auto |

### Open items needing an operator decision

These are real, currently-unresolved gaps from Phase 1. Surface them whenever the operator asks
what's next.

| # | Item | Why it needs the operator |
| --- | --- | --- |
| 1 | **CarPlay Simulator proof** — CarPlay Library/Downloads/play was implemented but never verified on a real Simulator session | Manual device workflow; see [CARPLAY-SIMULATOR-CHECKLIST.md](/apps/mobile/modules/podverse-media-engine/CARPLAY-SIMULATOR-CHECKLIST.md) |
| 2 | **Android Auto DHU run + Play Console car declaration** | Manual DHU session plus a Play Console form submission; see [ANDROID-AUTO-DHU-CHECKLIST.md](/apps/mobile/modules/podverse-media-engine/ANDROID-AUTO-DHU-CHECKLIST.md) and [ANDROID-AUTO-DECLARATION.md](/apps/mobile/modules/podverse-media-engine/ANDROID-AUTO-DECLARATION.md) |
| 3 | **`deep-link` + `push` E2E flows fail on both platforms** — Expo dev-client claims the `podverse-next://` scheme, so 2 of 22 Maestro flows are red | Fixing it changes what the test proves; the operator must choose between wrapping the link for dev-client, gating the flows to a standalone build, or a dev-only launcher bypass |

Item 3 also leaves a sticky iOS SpringBoard alert that contaminates the next flow in the suite, so
flow ordering is part of the decision. Full write-up was captured in the (gitignored)
`.artifacts/mobile-e2e-operator-issues.md` run log.

## Appendix — Phase 2 detail index

Status values: `not started` → `questions asked` → `planned` → `done`. Keep this table in sync with
the track tables above whenever status changes, per
[`mobile-master-plan-phasing`](/.cursor/skills/mobile-master-plan-phasing/SKILL.md).

| Detail | Step | Model | Status |
| --- | --- | --- | --- |
| [595-operator-polish-checklist](/docs/proposals/mobile/_master-plan_/phase-2/details/595-operator-polish-checklist.md) | P2.2.1 | Auto | superseded |
| [596-operator-polish-apply-briefs](/docs/proposals/mobile/_master-plan_/phase-2/details/596-operator-polish-apply-briefs.md) | P2.2.2 | Codex 5.3 | superseded |
| [597-list-virtualization-polish](/docs/proposals/mobile/_master-plan_/phase-2/details/597-list-virtualization-polish.md) | P2.2.3 | Codex 5.3 | part (a) done |
| [598-defer-player-transcript-chrome](/docs/proposals/mobile/_master-plan_/phase-2/details/598-defer-player-transcript-chrome.md) | P2.3.5 | Auto | not started |
| [599-defer-pixel-dnd-polish](/docs/proposals/mobile/_master-plan_/phase-2/details/599-defer-pixel-dnd-polish.md) | P2.3.6 | Auto | not started |

New Phase 2 detail docs use the **700–899** ID band (see
[PHASES.md](/docs/proposals/mobile/_master-plan_/PHASES.md) § Detail ID bands).
