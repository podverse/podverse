# Mobile master plan — plan set overview

Created: 2026-07-04

This plan set orchestrates **deferred authoring** of the Podverse next-generation mobile app master
plan. It does **not** implement `apps/mobile` or change production code. When complete, operators
will have `docs/proposals/mobile/_master-plan_/001-MASTER-PLAN.md` — a highest-level, ordered,
parallel-grouped numbered step list for building the mobile app from start to finish.

## Goal

Produce one master plan document by authoring **Track sections** in parallel, then stitching them
in Phase C. Each Track becomes a section of `001-MASTER-PLAN.md` with hierarchical step numbering.

| Deliverable | Path |
| ----------- | ---- |
| Master plan (assembled) | `docs/proposals/mobile/_master-plan_/001-MASTER-PLAN.md` |
| Detail plan placeholders | `docs/proposals/mobile/_master-plan_/details/NNN-*.md` (_TBD until implemented_) |
| This plan set | `.llm/plans/active/mobile-master-plan/` |

## Source material (read-only references)

Incorporate everything from existing proposal docs plus operator constraints:

- [DOCS-MOBILE.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE.md) — strategy index
- Track A: [monorepo-llm-setup](/docs/proposals/mobile/monorepo-llm-setup/)
- Track B: [app-development-process](/docs/proposals/mobile/app-development-process/)
- **No `react-native-track-player`** — custom native media engine (Track 2)
- Cursor abcmemory (`.cursor/` guidance) from day one
- Mobile E2E with screenshots from first feature (Maestro or Detox)
- Early hello-world on iOS + Android; safe alpha/internal beta (separate app id)
- Seamless mini↔full video via single persistent native surface
- Home media-type selector: Podcasts, Episodes, Clips, Artists, Albums, Tracks
- Bottom tabs: Home, Search, My Library, RSS, More
- OPML import/export
- Multi-device: phone, tablet, watch, TV (+ foldables)
- CI build/sign/publish without touching existing Prod/Beta store listings
- F-Droid/FOSS path documented (flavors, non-FOSS dependency register)

## Track outline (23 Tracks, 0–22)

**Default model** = typical tier for most steps in that Track; individual steps may differ (see authoring
file tables).

| Track | Title | Default model | Authoring file |
| ----- | ----- | ------------- | -------------- |
| 0 | Monorepo, Tier D, abcmemory prep | Auto / Codex 5.3 | 01-authoring-foundation-and-tooling.md |
| 1 | Extract `packages/playback-core` | Opus 4.8 | 01-authoring-foundation-and-tooling.md |
| 2 | Custom native media engine | Opus 4.8 | 02-authoring-native-media-engine.md |
| 3 | App bootstrap (hello-world) | Codex 5.3 | 01-authoring-foundation-and-tooling.md |
| 4 | CI/CD, alpha track, store safety | Codex 5.3 / Opus 4.8 | 03-authoring-cicd-release-store-safety.md |
| 5 | Mobile E2E + screenshots harness | Codex 5.3 | 01-authoring-foundation-and-tooling.md |
| 6 | Bearer auth + secure storage | Codex 5.3 | 04-authoring-app-shell-nav-home.md |
| 7 | Navigation shell (tabs + stacks) | Codex 5.3 | 04-authoring-app-shell-nav-home.md |
| 8 | Home + media-type selector | Codex 5.3 | 04-authoring-app-shell-nav-home.md |
| 9 | Browse/content screens + RSS | Codex 5.3 | 05-authoring-browse-content-screens.md |
| 10 | Queue, auto-queue, playlists, history | Opus 4.8 | 06-authoring-playback-queue-parity.md |
| 11 | Mini + full player (seamless video) | Opus 4.8 / Codex 5.3 | 06-authoring-playback-queue-parity.md |
| 12 | CarPlay / Android Auto + native cache | Opus 4.8 | 07-authoring-car-layer.md |
| 13 | Offline downloads | Codex 5.3 / Opus 4.8 | 08-authoring-mobile-only-features.md |
| 14 | Push (FCM + UnifiedPush) | Codex 5.3 / Opus 4.8 | 08-authoring-mobile-only-features.md |
| 15 | Deep links / universal links | Codex 5.3 | 08-authoring-mobile-only-features.md |
| 16 | Settings, prefs sync, OPML | Codex 5.3 | 08-authoring-mobile-only-features.md |
| 17 | RN i18n runtime | Auto / Codex 5.3 | 08-authoring-mobile-only-features.md |
| 18 | Multi-device (tablet, watch, TV) | Codex 5.3 / Opus 4.8 | 09-authoring-multi-device-targets.md |
| 19 | Membership / IAP | Opus 4.8 | 10-authoring-membership-fdroid-deferrals.md |
| 20 | F-Droid / FOSS flavor | Opus 4.8 / Codex 5.3 | 10-authoring-membership-fdroid-deferrals.md |
| 21 | Explicit deferrals and post-v1 backlog | Auto | 10-authoring-membership-fdroid-deferrals.md |
| 22 | Store release train + API compat | Codex 5.3 / Opus 4.8 | 03-authoring-cicd-release-store-safety.md |

## LLM model recommendations (Cursor)

Each master-plan step and its future detail plan include a **Model** field. Use these Cursor models:

| Model | Tier | Use when |
| ----- | ---- | -------- |
| **Auto** | Cheapest | Mechanical work, transcription, simple config/docs, operator-only steps, E2E flows following patterns |
| **Codex 5.3** | Medium | Standard RN/features, abcmemory from templates, CI scaffolding, auth/nav/screens mirroring web |
| **Opus 4.8** | Premium | Native engine, playback/queue parity, car layer, assembly, store safety, IAP policy, architecture spikes |

**Bump one tier** if a step fails review or touches cross-cutting playback/native code unexpectedly.

### COPY-PASTA authoring prompts (this plan set only)

| Prompt | Phase | Model |
| ------ | ----- | ----- |
| 1 | A — draft Tracks 0,1,3,5 | Auto |
| 2–10 | B — parallel draft tracks | Auto |
| 11 | C — assemble master plan | Opus 4.8 |

### Detail plan documents (`details/NNN-*.md`)

When a master-plan step moves from _TBD_ to a written detail plan:

1. Copy **Model** from the master-plan step into the detail plan header.
2. **Authoring the detail plan** (files, acceptance criteria, web references): use that Model, or
   **Opus 4.8** when the step is playback, native engine, car, or store-release critical.
3. **Implementing the detail plan** (code changes): use the detail plan's Model unless the operator
   explicitly upgrades for a retry.

Detail plan header template (see `11-authoring-assemble-and-finalize.md`):

```markdown
# NNN-slug

**Master step:** Track.Step  
**Model (author + implement):** Codex 5.3  
**Status:** draft | ready | done
```

## Master-plan numbering rule

Each step uses **Track.Step** hierarchical numbering:

```
Track.Step. One-sentence summary. Model: <Auto|Codex 5.3|Opus 4.8>. Detail: [slug](path) — _TBD_
```

Examples:

- `0.1. Add `.cursorignore` entries for native build artifacts. Model: Auto. Detail: [001-cursorignore-native](...) — _TBD_`
- `2.15. Implement iOS AVPlayer audio session lifecycle. Model: Opus 4.8. Detail: [045-ios-audio-session](...) — _TBD_`

**Parallel authoring:** different agents write different Tracks; Track numbers never collide.

**Global order in assembled master plan:** Tracks appear in numeric order (0 → 22). Within each
Track, steps are sequential. Cross-Track parallel groups are annotated in Phase C (see
`11-authoring-assemble-and-finalize.md`).

## Placeholder detail-link convention

Every step MUST link to a future detailed plan file:

```markdown
Detail: [NNN-kebab-slug](/docs/proposals/mobile/_master-plan_/details/NNN-kebab-slug.md) — _TBD_
```

- `NNN` = zero-padded three-digit sequence unique across the whole master plan (assigned per
  authoring file; ranges reserved below).
- Slug = short kebab-case topic name.
- `_TBD_` suffix until the detail doc is written.
- Do **not** create detail files during authoring — links only.

### Reserved detail ID ranges (by authoring file)

| Authoring file | ID range |
| -------------- | -------- |
| 01 (Tracks 0,1,3,5) | 001–079 |
| 02 (Track 2) | 080–149 |
| 03 (Tracks 4,22) | 150–199 |
| 04 (Tracks 6,7,8) | 200–259 |
| 05 (Track 9) | 260–309 |
| 06 (Tracks 10,11) | 310–379 |
| 07 (Track 12) | 380–429 |
| 08 (Tracks 13–17) | 430–509 |
| 09 (Track 18) | 510–559 |
| 10 (Tracks 19–21) | 560–609 |

## How to run

1. Read [00-EXECUTION-ORDER.md](00-EXECUTION-ORDER.md).
2. Open [COPY-PASTA.md](COPY-PASTA.md).
3. Execute prompts in phase order; parallel prompts may run simultaneously within a phase.
4. After Phase C, verify `001-MASTER-PLAN.md` exists; every step has **Model** and a placeholder detail link.
5. Archive this plan set to `.llm/plans/completed/mobile-master-plan/` when satisfied.

## Open decisions (record in master plan, do not block authoring)

- CI tooling: EAS Build/Submit (paid) vs Fastlane on GitHub macOS runners
- Separate app id (`*.next`) vs internal track on existing Podverse listing
- E2E framework: Maestro vs Detox
- Watch/TV scope: v1 vs post-MVP within Track 18

## Verification (operator, after Phase C)

Docs-only — no tests. Confirm master plan and structure:

```bash
test -f docs/proposals/mobile/_master-plan_/001-MASTER-PLAN.md
grep -c 'Model:' docs/proposals/mobile/_master-plan_/001-MASTER-PLAN.md
grep -c 'Detail:' docs/proposals/mobile/_master-plan_/001-MASTER-PLAN.md
ls .llm/plans/active/mobile-master-plan/
```
