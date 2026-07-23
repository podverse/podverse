# Mobile visual parity: primitives now, polish later

How the mobile app should align with the **look and feel of the website** without blocking
functionality work.

Foundation:
[DOCS-MOBILE-PROCESS-OVERVIEW.md](DOCS-MOBILE-PROCESS-OVERVIEW.md),
[shared-vs-divergent](DOCS-MOBILE-PROCESS-SHARED-VS-DIVERGENT.md),
**mobile-theme-parity** skill (`.cursor/skills/mobile-theme-parity/SKILL.md`).

> **Status:** Process decision. Design tokens (Track 0.20 / PG-4 themes) are **done**. Shared RN
> primitives (Track 9b.6–9b.7) are **done**. **Action-affordance parity** (Track 9c / PG-6.6) is
> the next control-chrome investment; full pixel polish remains deferred.

## 1. Decision

| Phase                         | When                          | Scope                                                                |
| ----------------------------- | ----------------------------- | -------------------------------------------------------------------- |
| Design tokens + ThemeProvider | Done (PG-4 themes)            | Same theme IDs + token values as web via `@podverse/design-tokens`   |
| Shared visual primitives      | **Done** (Track 9b.6–9b.7)    | Mobile analog to `@podverse/ui`: reusable RN components + type/space |
| Media row action affordances  | **Next / parallel with PG-7** | Same Play + more-menu intents as web (Track 9c)                      |
| Full pixel / layout polish    | **Later phase**               | Screen-by-screen visual parity pass after feature-complete           |

**Rationale:** Screens already have behavior but ad-hoc `StyleSheet`s. Extracting primitives now
centralizes restyle later. Spending a full polish cycle before queue/player and the offline data
layer would delay the product core.

Follow web patterns unless a **documented platform improvement** wins (native back, pull-to-refresh,
safe area, tab bar). Do not invent a different information architecture when a web counterpart
exists.

## 2. Current state

- Tokens: `packages/design-tokens`; `apps/mobile/src/theme/{ThemeProvider,useTheme,createStyles}`.
- Pref key `uit` matches web.
- **Shared primitives scaffold landed (Track 9b.6):** `apps/mobile/src/components/primitives/`
  (`Button`, `Card`, `ListRow`, `ScreenHeader`, `index.ts`) + `apps/mobile/src/theme/spacing.ts`
  and `typography.ts`, all token-driven. Dev-only smoke via `src/debug/PrimitivesDebugPanel` on the
  hello-world screen (skipped under E2E).
- **Opportunistic migration landed (Track 9b.7):** primary lists now consume primitives —
  `Button` (compact `size="sm"`) for Home/Search feed-row actions (`HomeFeedRow`, shared by Home,
  Search, and Library Queue), `Card` around Search results (`search-results-card`), and
  `Card` + `ListRow` for Library Playlists rows. Web information architecture preserved; no full
  polish pass. Remaining screens migrate opportunistically as they are touched.
- `@podverse/ui` remains **forbidden** on mobile (web SCSS components).

## 3. Shared RN primitives (do now)

Suggested home (app-local, not a new npm package until promotion is justified):

```
apps/mobile/src/components/
├── primitives/
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── ListRow.tsx
│   ├── ScreenHeader.tsx
│   └── index.ts
apps/mobile/src/theme/
├── spacing.ts      # 4/8/12/16/24/32 scale from tokens
├── typography.ts   # title / body / meta / caption
└── ...existing
```

Minimum set:

| Primitive      | Web reference (intent)                    | Notes                               |
| -------------- | ----------------------------------------- | ----------------------------------- |
| `Button`       | Primary / secondary / danger actions      | Loading state; token colors only    |
| `Card`         | Section / feed card chrome                | Padding + radius from tokens        |
| `ListRow`      | Artwork + title + meta + trailing actions | Home / search / library rows        |
| `ScreenHeader` | Title + optional actions                  | Safe-area aware                     |
| Spacing/type   | Match web density where practical         | No hardcoded hex; prefer token maps |

Rules:

1. New screens **prefer** primitives over one-off layout soup.
2. Migrate existing screens opportunistically when touching them (do not big-bang rewrite).
3. All colors/spacing/radii from `@podverse/design-tokens` / theme factories — **no hardcoded hex**.
4. i18n: pass localized strings in; no copy inside primitives (same as `@podverse/ui` policy).

## 4. Action / control affordance parity (do now — not polish)

**Pixel polish is deferred. Which controls exist is not.**

For every mobile list row / header that has a web counterpart, mobile must expose the **same
primary actions** (same intent and i18n keys where shared), adapted to RN:

| Web pattern                                                                             | Mobile expectation                                                                          |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `PlayButtonRow` / `PlayButtonLarge`                                                     | Primary Play (and pause when active)                                                        |
| `ItemRowMoreActions` / more menu (`queue_next`, `queue_last`, playlist, mark played, …) | Same menu items via icon + action sheet / bottom sheet                                      |
| Channel Subscribe / Unsubscribe                                                         | Same labels (`features.subscribe` / `features.unsubscribe`) — never queue copy for unfollow |
| Feed-level vs item-level actions                                                        | Do not put item-queue actions on feed rows (or vice versa)                                  |

Rules:

1. Before adding a button, open the matching web component and inventory its actions.
2. Prefer a shared RN module (e.g. `MediaRowActions` / more-sheet) over one-off `Pressable`s per
   screen — see master-plan **Track 9c**.
3. Wrong i18n keys that make a control look like a different feature (e.g. queue label on
   remove-feed) are **bugs**, not acceptable “simplified” UX.
4. Document intentional omissions (store policy, deferred Track) in the detail doc — do not silently
   invent alternate chrome.

Track 9c + plan set: `.llm/plans/active/mobile-media-row-actions/`.

## 5. Full polish (defer)

Later dedicated phase (after data layer + audio player/queue parity at minimum):

- Screen-by-screen **pixel** comparison to web (home, podcast, episode, search, player, add-by-RSS, …)
- Typography rhythm, list density, artwork sizes, empty/error chrome
- Theme picker in Settings (infra exists; UI still placeholder)
- Optional: promote primitives to a small `@podverse/ui-native` package only if web/mobile sharing
  becomes real (not required for v1)

**Does not defer:** action inventory parity (§4) or shared row-action components (Track 9c).

## 6. Consistency with agents

When implementing a screen:

1. Read web route + components first (**mobile-theme-parity** § Screen & visual parity).
2. Mirror information hierarchy **and action affordances** (§4); adapt to RN.
3. Use primitives + tokens; note intentional divergences in the detail doc.
4. Do **not** block feature PRs on pixel-perfect polish — file polish follow-ups.
5. Do **block** (or fix in the same PR) mismatched / mislabeled primary actions vs web.

## 7. Related

- [DOCS-MOBILE-PROCESS-MOBILE-ONLY-FEATURES.md](DOCS-MOBILE-PROCESS-MOBILE-ONLY-FEATURES.md)
  feature priority (primitives P1, polish P2)
- Master-plan Track 9b (primitives) + **Track 9c** (media row actions) in
  [001-MASTER-PLAN.md](/docs/proposals/mobile/_master-plan_/001-MASTER-PLAN.md)
- Skills: **mobile-theme-parity**, **mobile-master-plan-phasing**
