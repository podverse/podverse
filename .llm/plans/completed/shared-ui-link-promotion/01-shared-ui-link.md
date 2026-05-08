# 01 - Add Shared Link Primitive To @podverse/ui

## Assessment

The current implementation lives in
[apps/web/src/components/Link/Link.tsx](../../../../apps/web/src/components/Link/Link.tsx)
and
[apps/web/src/styles/components/Link/Link.module.scss](../../../../apps/web/src/styles/components/Link/Link.module.scss).

It does three things that decide the rendered element:

- If `href` is provided and `getSafeLinkHref(href)` returns `undefined`, render
  a disabled `<span>` (blocked link).
- If `href` is provided and safe:
  - When `disabled` is true, render a disabled `<span>`.
  - When `fullPageLoad` is true, render a plain `<a href>`.
  - Otherwise render `next/link`.
- If `href` is not provided, render a `<button>` with `onClick`.

It also picks one of two style classes by `color` (`primary` | `secondary`),
and merges in `className` and a shared `disabled` class for the `<span>` cases.

Two parts must stay in `apps/web`:

- `next/link` (Next.js-only).
- `getSafeLinkHref` from
  [@podverse/helpers safeLinkHref.ts](../../../../packages/helpers/src/lib/safeLinkHref.ts).

Per [.cursor/rules/shared-ui-i18n.mdc](../../../../.cursor/rules/shared-ui-i18n.mdc),
`@podverse/ui` must not embed user-facing copy. The Link primitive carries no
strings of its own; consumers pass `aria-label`, `title`, and `children`.

`@podverse/ui` already depends on `classnames`. No new package deps are needed.

The same render-prop precedent already exists in
[packages/ui/src/components/navigation/ActionLink/ActionLink.tsx](../../../../packages/ui/src/components/navigation/ActionLink/ActionLink.tsx):
a `LinkComponent` prop with a default plain-`<a>` implementation that the app
overrides with a `next/link` adapter.

## Prompt

Add the shared, framework-agnostic `Link` primitive to `@podverse/ui`.
**Do not** modify any `apps/web` files in this prompt. **Do not** add `next/link`
or `getSafeLinkHref` to `@podverse/ui`.

1. Create `packages/ui/src/components/navigation/Link/`:
   - `Link.tsx` — exported `Link` component with this prop API:
     - `href?: string` (treat as already-safe; the app wrapper resolves
       `getSafeLinkHref` before passing).
     - `onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void`.
     - `children: React.ReactNode`.
     - `className?: string`.
     - `type?: 'button' | 'submit' | 'reset'` (default `'button'`).
     - `tabIndex?: number`.
     - `'aria-label'?: string`.
     - `disabled?: boolean` (default `false`).
     - `style?: React.CSSProperties`.
     - `color?: 'primary' | 'secondary'` (default `'primary'`).
     - `target?: '_blank'`.
     - `rel?: string`.
     - `title?: string`.
     - `fullPageLoad?: boolean` (default `false`) — when true, force the plain
       anchor branch (apps render an `<a>` rather than a client-routed link).
     - `LinkComponent?: ComponentType<LinkRenderProps>` — render prop for the
       client-side anchor branch. Default is a plain `<a>`. The app passes a
       `next/link` adapter.
     - `AnchorComponent?: ComponentType<LinkRenderProps>` — optional render
       prop for the `fullPageLoad` branch. Defaults to a plain `<a>`. Provided
       so apps can inject extra props (e.g. `prefetch={false}`) without
       forking.
   - Export type `LinkRenderProps`:

     ```ts
     export type LinkRenderProps = {
       href: string;
       children: React.ReactNode;
       className?: string;
       title?: string;
       'aria-label'?: string;
       tabIndex?: number;
       style?: React.CSSProperties;
       target?: '_blank';
       rel?: string;
     };
     ```

   - Behavior (port verbatim from the web component, minus `next/link` and
     `getSafeLinkHref`):
     - `linkClassName = color === 'primary' ? styles.link : styles.linkSecondary`.
     - When `href` is provided and `disabled === true`, render a `<span>` with
       classes `linkClassName`, `className`, and `styles.disabled`,
       `aria-disabled="true"`, plus `style` and `title`.
     - When `href` is provided and not disabled and `fullPageLoad === true`,
       render `<AnchorComponent>` (default plain `<a>`) with merged classes
       and pass-throughs.
     - When `href` is provided and not disabled and `fullPageLoad === false`,
       render `<LinkComponent>` (default plain `<a>`) with merged classes and
       pass-throughs.
     - When `href` is **not** provided, render a `<button type={type}>` with
       `onClick`, merged classes, and pass-throughs (including
       `disabled={disabled}`).
   - **Removed** behavior vs the web component: the "blocked when
     `getSafeLinkHref` returns undefined" branch is **not** present in the
     shared primitive. That responsibility belongs to the app wrapper.
2. Create `packages/ui/src/components/navigation/Link/Link.module.scss` with
   the rules ported verbatim from
   [apps/web/src/styles/components/Link/Link.module.scss](../../../../apps/web/src/styles/components/Link/Link.module.scss):
   `.link`, `.linkSecondary`, and `.disabled` (using the existing CSS custom
   properties: `--text-color-link`, `--text-color-link-hover`,
   `--text-color-primary`, `--text-color-secondary`).
3. Create `packages/ui/src/components/navigation/Link/Link.test.tsx` that
   covers the meaningful branches (use existing `ActionLink` / `IconButton`
   tests as a stylistic reference):
   - With no `href`, renders a `<button>` and calls `onClick` when clicked.
   - With `href` and default props, renders the default `<a>` (the
     `LinkComponent` default) with merged class names and `href` pass-through.
   - With `href` and `disabled`, renders a `<span aria-disabled="true">`.
   - With `href` and `fullPageLoad`, renders the `AnchorComponent` (default
     `<a>`) instead of `LinkComponent`.
   - With a custom `LinkComponent`, the custom component is used and receives
     the expected `LinkRenderProps`.
   - `color="secondary"` applies `linkSecondary` class.
   - `target`, `rel`, `tabIndex`, `aria-label`, `title`, and `style` pass
     through correctly to the rendered element.
4. Add `packages/ui/src/components/navigation/Link/index.ts` barrel that
   re-exports `Link` and `LinkRenderProps`.
5. Update [packages/ui/src/index.ts](../../../../packages/ui/src/index.ts) to
   add named exports for `Link`, `LinkRenderProps`, and the prop type
   (`LinkProps`). Place them next to the other navigation exports (e.g. just
   after the `ActionLink` block).

## Acceptance Criteria

- New shared `Link` exists under
  `packages/ui/src/components/navigation/Link/` with matching SCSS module and
  unit tests.
- Exported by name from the `@podverse/ui` barrel.
- No imports of `next/*` or `@podverse/helpers` are introduced anywhere under
  `packages/ui/`.
- All existing `apps/web` callsites continue to compile (no app changes were
  made in this step; the existing app `Link.tsx` is still in place).

## Verification (run in 03)

Defer all verification to `03-verification-and-followups.md`. Per
[.cursorrules](../../../../.cursorrules), do **not** run tests or builds in
this step.
