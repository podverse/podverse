# 02 — Apply operator polish briefs (Track 23.2)

**Cursor model:** Codex 5.3
**Detail:** [596-operator-polish-apply-briefs](/docs/proposals/mobile/_master-plan_/details/596-operator-polish-apply-briefs.md)
**Ship bar:** For each screen the operator has briefed, the app matches the brief (spacing,
typography, chrome, empty/error states) using tokens/primitives — with `testID`s intact and E2E
smoke green. Unbriefed screens are untouched.

## Gate (read first)

This step is **blocked** until:

1. The checklist scaffold from step 01 exists, **and**
2. The operator has written **at least one** per-screen brief (in the template below).

If no brief text exists for a screen, that screen is **out of scope**. Do not guess layouts.

## Brief template (operator authors; agent consumes)

Each brief should be a short block per screen:

```markdown
### Brief: <Screen name> (<route / component path>)

- Target device(s): iOS phone | Android phone | tablet
- Spacing/density: <e.g. tighten row vertical padding to spacing.sm; section gap spacing.lg>
- Typography: <e.g. title → typography.h2; secondary text → textSecondary>
- Chrome/header/nav: <e.g. add back title; align header actions right>
- Empty/loading/error: <e.g. use ListEmpty with misc.info; center spinner>
- Explicit do-not-touch: <areas to leave as-is>
- Web parity reference: <apps/web/... path if applicable>
```

## Workflow (per briefed screen or small batch)

1. Read the operator brief + the screen's current RN source and the cited web parity component.
2. Apply **only** what the brief names, using `@podverse/design-tokens` / theme factories and existing
   `apps/mobile/src/components/primitives/*`. No hardcoded hex; no new deps.
3. Keep all existing `testID`s and behavior; do not rename navigation routes or change data flow.
4. Localize any new copy via i18n (pass strings in; no literals in primitives).
5. Note intentional divergences from web in the screen's detail doc if relevant.

## Guards / gotchas

- **No freestyle redesign, no new features, no design-heavy surfaces** (transcript panels, clip
  authoring, pixel DnD are Track 21 / 598 / 599 deferrals).
- Do not restyle screens the operator did not brief.
- Do not promote anything to `@podverse/ui` (forbidden on mobile) or introduce web SCSS.
- Preserve virtualization: keep `FlatList`/`SectionList` where present (baseline from
  `mobile-list-virtualization`); do not revert to `ScrollView` + `.map()`.

## Acceptance

- Each briefed screen matches its brief; every change traces to a brief line.
- Unbriefed screens are byte-unchanged.
- E2E smoke for touched areas stays green (operator runs; see verification).

## After each briefed batch

- Update the checklist row(s) `Status` for the screens polished.
- Keep 23.2 `planned` until the operator declares the checklist worked through; when they do and all
  briefed screens are applied, mark 23.2 `done`, update Appendix C row 596 → `done`, set the detail
  header to `**Status:** done`.
- If 23.2 and 23.3(b) are both resolved (23.3(b) may stay deferred by operator), only then consider
  the ` (DONE)` marker on the Track 23 heading per **mobile-master-plan-phasing**.

## Verification (operator, after a batch)

Focused Maestro for touched areas (see **mobile-e2e-screenshots**; **Mobile Metro** + devices up):

```bash
npm run mobile:e2e:test -- <area>
```
