# Shared UI Link Promotion

## Outcome

Promote the `Link` component from `apps/web` into `@podverse/ui` as a
**framework-agnostic** primitive, while keeping `next/link` and
`getSafeLinkHref` in `apps/web` via a thin app wrapper. Existing callsites
inside `apps/web` keep importing from
[apps/web/src/components/Link/Link.tsx](../../../../apps/web/src/components/Link/Link.tsx)
so this is a non-breaking move.

- One canonical `Link` primitive in
  [packages/ui/src/components/navigation/Link/Link.tsx](../../../../packages/ui/src/components/navigation/Link/Link.tsx)
  with the existing prop surface (`href`, `onClick`, `color`, `target`, `rel`,
  `disabled`, `tabIndex`, `aria-label`, `title`, `style`, `className`,
  `fullPageLoad`, `type`, `children`).
- A required-when-used `LinkComponent` render prop (same pattern as the
  existing
  [ActionLink](../../../../packages/ui/src/components/navigation/ActionLink/ActionLink.tsx)).
  Default link rendering is a plain `<a>`; the app passes a `NextLink` adapter.
- Visual parity with the existing web Link styles, using the design tokens
  already in `@podverse/ui` (`var(--text-color-link)`,
  `var(--text-color-link-hover)`, `var(--text-color-primary)`,
  `var(--text-color-secondary)`).
- A thin
  [apps/web/src/components/Link/Link.tsx](../../../../apps/web/src/components/Link/Link.tsx)
  wrapper that:
  - Calls `getSafeLinkHref` from `@podverse/helpers` before passing `href` to
    the shared `Link`.
  - Provides a `NextLinkComponent` adapter for `LinkComponent` so client-side
    nav still uses `next/link` unless `fullPageLoad` is true.
  - Re-exports the same named `Link`, so all 31 current callsites stay
    untouched.

## Scope

- `packages/ui` — add framework-agnostic
  `components/navigation/Link/{Link.tsx,Link.module.scss,Link.test.tsx,index.ts}`,
  add named exports + types in
  [packages/ui/src/index.ts](../../../../packages/ui/src/index.ts).
- `apps/web` — replace the implementation of
  [apps/web/src/components/Link/Link.tsx](../../../../apps/web/src/components/Link/Link.tsx)
  with a thin wrapper around `@podverse/ui` `Link`, delete
  [apps/web/src/styles/components/Link/Link.module.scss](../../../../apps/web/src/styles/components/Link/Link.module.scss)
  (now lives in `@podverse/ui`).
- Documentation — update the ADR exclusion in
  [.llm/plans/completed/shared-ui-component-consolidation/04-high-risk-feasibility-and-wrappers.md](../../../../.llm/plans/completed/shared-ui-component-consolidation/04-high-risk-feasibility-and-wrappers.md)
  to record that the **render-prop** Link primitive is now allowed in
  `@podverse/ui`; `next/link` and `getSafeLinkHref` are still excluded.

## Non-Goals

- No callsite migration. The 31 existing
  `from '../../components/Link/Link'` (and similar relative) imports inside
  `apps/web` stay as-is; they continue to import the app wrapper.
- No use in `apps/management-web` in this plan; management-web already uses
  `ActionLink` and other primitives.
- No visual redesign; preserve current Link / Link Secondary / disabled styles.
- No change to `getSafeLinkHref` semantics or location.

## Approach Decision

The repo previously documented an ADR-style exclusion in
[04-high-risk-feasibility-and-wrappers.md](../../../../.llm/plans/completed/shared-ui-component-consolidation/04-high-risk-feasibility-and-wrappers.md):

> **Link — excluded as a concrete component**
> Decision: Do not ship `next/link` or `getSafeLinkHref` inside `packages/ui`.

This plan **does not** ship either of those inside `packages/ui`:

- `next/link` stays in `apps/web` and is injected via the `LinkComponent`
  render-prop (same shape as the existing `ActionLink`).
- `getSafeLinkHref` stays in `apps/web`'s wrapper component; the shared
  primitive treats `href` as already-resolved.

The previously excluded "concrete Link" was a Link that imported `next/link`
and `getSafeLinkHref` directly. The framework-agnostic primitive proposed here
is a different artifact and is consistent with the existing `ActionLink`
pattern.

## References

- Shared UI rules:
  [.cursor/rules/prefer-shared-ui-web-management.mdc](../../../../.cursor/rules/prefer-shared-ui-web-management.mdc),
  [.cursor/rules/shared-ui-i18n.mdc](../../../../.cursor/rules/shared-ui-i18n.mdc).
- UI promotion skill:
  [.cursor/skills/ui-component-promotion/SKILL.md](../../../../.cursor/skills/ui-component-promotion/SKILL.md).
- Existing render-prop precedent:
  [packages/ui/src/components/navigation/ActionLink/ActionLink.tsx](../../../../packages/ui/src/components/navigation/ActionLink/ActionLink.tsx).
- Plan completion / archiving:
  [.cursor/skills/plan-completion/SKILL.md](../../../../.cursor/skills/plan-completion/SKILL.md).
