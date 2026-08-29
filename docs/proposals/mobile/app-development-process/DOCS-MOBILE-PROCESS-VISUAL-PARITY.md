# Mobile visual parity: sketches now, operator polish later

How the mobile app should align with the **look and feel of the website** without blocking
functionality work — and without agents thrashing on final layout.

Foundation:
[DOCS-MOBILE-PROCESS-OVERVIEW.md](DOCS-MOBILE-PROCESS-OVERVIEW.md),
[shared-vs-divergent](DOCS-MOBILE-PROCESS-SHARED-VS-DIVERGENT.md),
**mobile-theme-parity** skill (`.cursor/skills/mobile-theme-parity/SKILL.md`),
master plan **Ship bar** in
[001-MASTER-PLAN.md](/docs/proposals/mobile/_master-plan_/phase-1/001-MASTER-PLAN.md).

> **Status:** Process decision. Tokens, primitives, and action-affordance parity are **done**.
> Remaining feature tracks ship **functional sketches**. **Track 23** is the only place for
> operator-led pixel / layout finishing.

## 1. Decision

| Phase                         | When                    | Scope                                                                 |
| ----------------------------- | ----------------------- | --------------------------------------------------------------------- |
| Design tokens + ThemeProvider | Done (PG-4 themes)      | Same theme IDs + token values as web via `@podverse/design-tokens`    |
| Shared visual primitives      | Done (Track 9b.6–9b.7)  | RN Button / Card / ListRow / ScreenHeader + type/space                |
| Media row action affordances  | Done (Track 9c)         | Same Play + more-menu **intents** as web                              |
| Feature screens (Tracks 8–22) | In progress / remaining | **Functional sketch** — IA, affordances, wiring, `testID`s, E2E smoke |
| Operator visual polish        | **Track 23 / PG-13**    | Screen-by-screen briefs from operator; agents apply only those notes  |

**Rationale:** The master-plan goal is a sensible bulk of functionality and screens with a sketch of
components — not production-perfect chrome. Layout debates and design-heavy player surfaces
(integrated transcripts, clip authoring UI, pixel DnD) wait for operator involvement.

Follow web **information architecture** and **action inventory** unless a documented platform
improvement wins (native back, pull-to-refresh, safe area, tab bar). Do not invent a different IA
when a web counterpart exists. Do **not** invent final visual design without a Track 23 brief.

## 2. Current state

- Tokens: `packages/design-tokens`; `apps/mobile/src/theme/{ThemeProvider,useTheme,createStyles}`.
- Pref key `uit` matches web.
- Shared primitives under `apps/mobile/src/components/primitives/`.
- Action affordances via Track 9c shared more-sheet patterns.
- `@podverse/ui` remains **forbidden** on mobile (web SCSS components).
- Pixel polish remains **deferred** until Track 23.

## 3. Shared RN primitives (done — keep using)

Home: `apps/mobile/src/components/primitives/` + `theme/spacing.ts` / `typography.ts`.

Rules:

1. New screens **prefer** primitives over one-off layout soup.
2. Migrate existing screens opportunistically when touching them (do not big-bang rewrite).
3. All colors/spacing/radii from `@podverse/design-tokens` / theme factories — **no hardcoded hex**.
4. i18n: pass localized strings in; no copy inside primitives.
5. “Looks a bit rough” is **OK** until Track 23 — do not restyle the whole app mid-feature.

## 4. Action / control affordance parity (not polish)

**Pixel polish is deferred. Which controls exist is not.**

For every mobile list row / header that has a web counterpart, mobile must expose the **same
primary actions** (same intent and i18n keys where shared), adapted to RN — see Track 9c.

Rules:

1. Before adding a button, open the matching web component and inventory its actions.
2. Prefer shared RN modules over one-off `Pressable`s per screen.
3. Wrong i18n keys that make a control look like a different feature are **bugs**.
4. Document intentional omissions (store policy, Track 21 deferrals) — do not silently invent chrome.
5. **Do not** expand into create-clip, player-transcript panels, or fancy DnD unless a master-plan
   step asks for a **functional sketch** (playlist reorder = 9d.3 sketch; clip authoring = deferred).

## 5. Full polish (Track 23 only)

After the feature bulk is in place:

1. **Operator** walks screens with a checklist (23.1) and writes briefs (spacing, density, chrome).
2. **Agents** apply those briefs only (23.2) — no freestyle redesign.
3. Optional list virtualization / jank pass only if operator flags it (23.3).

Until then: file polish follow-ups; do **not** block feature PRs on pixel perfection.

## 6. Consistency with agents

When implementing a screen:

1. Read web route + components first (**mobile-theme-parity** § Screen & visual parity).
2. Mirror information hierarchy **and action affordances** (§4); adapt to RN.
3. Use primitives + tokens; note intentional divergences in the detail doc.
4. Ship a **working sketch** — stop when behavior + affordances + `testID`s are done.
5. Do **not** thrash on layout aesthetics or add design-heavy surfaces without a plan step.
6. Do **block** (or fix in the same PR) mismatched / mislabeled primary actions vs web.

## 7. Related

- Master plan **Ship bar**, Track **9d** (playlist authoring sketches), Track **21** deferrals,
  Track **23** operator polish —
  [001-MASTER-PLAN.md](/docs/proposals/mobile/_master-plan_/phase-1/001-MASTER-PLAN.md)
- [DOCS-MOBILE-PROCESS-MOBILE-ONLY-FEATURES.md](DOCS-MOBILE-PROCESS-MOBILE-ONLY-FEATURES.md)
- Skills: **mobile-theme-parity**, **mobile-master-plan-phasing**
