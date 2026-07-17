# Mobile visual parity: primitives now, polish later

How the mobile app should align with the **look and feel of the website** without blocking
functionality work.

Foundation:
[DOCS-MOBILE-PROCESS-OVERVIEW.md](DOCS-MOBILE-PROCESS-OVERVIEW.md),
[shared-vs-divergent](DOCS-MOBILE-PROCESS-SHARED-VS-DIVERGENT.md),
**mobile-theme-parity** skill (`.cursor/skills/mobile-theme-parity/SKILL.md`).

> **Status:** Process decision. Design tokens (Track 0.20 / PG-4 themes) are **done**. Shared RN
> primitives are the next cheap investment; full pixel polish is deferred.

## 1. Decision

| Phase                         | When                         | Scope                                                                 |
| ----------------------------- | ---------------------------- | --------------------------------------------------------------------- |
| Design tokens + ThemeProvider | Done (PG-4 themes)           | Same theme IDs + token values as web via `@podverse/design-tokens`    |
| Shared visual primitives      | **Next / parallel with PG-7** | Mobile analog to `@podverse/ui`: reusable RN components + type/space |
| Full pixel / layout polish    | **Later phase**              | Screen-by-screen visual parity pass after feature-complete            |

**Rationale:** Screens already have behavior but ad-hoc `StyleSheet`s. Extracting primitives now
centralizes restyle later. Spending a full polish cycle before queue/player and the offline data
layer would delay the product core.

Follow web patterns unless a **documented platform improvement** wins (native back, pull-to-refresh,
safe area, tab bar). Do not invent a different information architecture when a web counterpart
exists.

## 2. Current state

- Tokens: `packages/design-tokens`; `apps/mobile/src/theme/{ThemeProvider,useTheme,createStyles}`.
- Pref key `uit` matches web.
- No shared `Card` / `ListRow` / `Button` library yet — each screen builds styles inline.
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

| Primitive       | Web reference (intent)                         | Notes                                      |
| --------------- | ---------------------------------------------- | ------------------------------------------ |
| `Button`        | Primary / secondary / danger actions           | Loading state; token colors only           |
| `Card`          | Section / feed card chrome                     | Padding + radius from tokens               |
| `ListRow`       | Artwork + title + meta + trailing actions      | Home / search / library rows               |
| `ScreenHeader`  | Title + optional actions                       | Safe-area aware                            |
| Spacing/type    | Match web density where practical              | No hardcoded hex; prefer token maps        |

Rules:

1. New screens **prefer** primitives over one-off layout soup.
2. Migrate existing screens opportunistically when touching them (do not big-bang rewrite).
3. All colors/spacing/radii from `@podverse/design-tokens` / theme factories — **no hardcoded hex**.
4. i18n: pass localized strings in; no copy inside primitives (same as `@podverse/ui` policy).

## 4. Full polish (defer)

Later dedicated phase (after data layer + audio player/queue parity at minimum):

- Screen-by-screen comparison to web (home, podcast, episode, search, player, add-by-RSS, …)
- Typography rhythm, list density, artwork sizes, empty/error chrome
- Theme picker in Settings (infra exists; UI still placeholder)
- Optional: promote primitives to a small `@podverse/ui-native` package only if web/mobile sharing
  becomes real (not required for v1)

## 5. Consistency with agents

When implementing a screen:

1. Read web route + components first (**mobile-theme-parity** § Screen & visual parity).
2. Mirror information hierarchy; adapt to RN.
3. Use primitives + tokens; note intentional divergences in the detail doc.
4. Do **not** block feature PRs on pixel-perfect polish — file polish follow-ups.

## 6. Related

- [DOCS-MOBILE-PROCESS-MOBILE-ONLY-FEATURES.md](DOCS-MOBILE-PROCESS-MOBILE-ONLY-FEATURES.md)
  feature priority (primitives P1, polish P2)
- Master-plan steps for visual primitives (see
  [001-MASTER-PLAN.md](/docs/proposals/mobile/_master-plan_/001-MASTER-PLAN.md))
