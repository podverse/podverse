# 02 - Migrate apps/web Link To Thin Wrapper

## Assessment

After `01`, `@podverse/ui` exports a framework-agnostic `Link` plus
`LinkRenderProps`. The web app has 31 callsites that currently import
`Link` from `apps/web/src/components/Link/Link.tsx` (relative paths). The
import path stays the same; only the file's implementation changes.

Web responsibilities that must remain in the app wrapper:

- Resolving `href` through `getSafeLinkHref` from `@podverse/helpers`. When
  the result is `undefined`, render a disabled span (the "blocked link"
  branch).
- Providing a `next/link` adapter as `LinkComponent` so client-side nav
  continues to use Next routing for non-`fullPageLoad` links.

## Prompt

Replace the implementation in
[apps/web/src/components/Link/Link.tsx](../../../../apps/web/src/components/Link/Link.tsx)
with a thin wrapper around the new `@podverse/ui` `Link`. Do not change any
callsites; the public `Link` export and its prop types from this file must
stay backward compatible.

1. Update [apps/web/src/components/Link/Link.tsx](../../../../apps/web/src/components/Link/Link.tsx):

   ```tsx
   import NextLink from 'next/link';
   import type { ComponentType } from 'react';

   import { getSafeLinkHref } from '@podverse/helpers';
   import { Link as SharedLink } from '@podverse/ui';
   import type { LinkRenderProps } from '@podverse/ui';

   const NextLinkComponent: ComponentType<LinkRenderProps> = ({
     href,
     children,
     className,
     tabIndex,
     'aria-label': ariaLabel,
     title,
     style,
     target,
     rel,
   }) => (
     <NextLink
       href={href}
       className={className}
       tabIndex={tabIndex}
       aria-label={ariaLabel}
       title={title}
       style={style}
       target={target}
       rel={rel}
     >
       {children}
     </NextLink>
   );

   type LinkProps = {
     href?: string;
     onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
     children: React.ReactNode;
     className?: string;
     type?: 'button' | 'submit' | 'reset';
     tabIndex?: number;
     'aria-label'?: string;
     disabled?: boolean;
     style?: React.CSSProperties;
     color?: 'primary' | 'secondary';
     target?: '_blank';
     rel?: string;
     title?: string;
     fullPageLoad?: boolean;
   };

   export const Link: React.FC<LinkProps> = ({ href, disabled, ...rest }) => {
     const safeHref = href !== undefined ? getSafeLinkHref(href) : undefined;
     const hrefBlocked = href !== undefined && safeHref === undefined;

     if (hrefBlocked) {
       return <SharedLink {...rest} disabled />;
     }

     return (
       <SharedLink
         {...rest}
         href={safeHref}
         disabled={disabled}
         LinkComponent={NextLinkComponent}
       />
     );
   };
   ```

   Notes:
   - The wrapper preserves the original prop type (`LinkProps`) so callsites
     keep their existing prop spelling (`fullPageLoad`, `color`, etc.).
   - The "blocked" branch passes `disabled` to the shared `Link` without
     `href`, which makes the shared primitive render the disabled `<span>`
     branch — same visual effect as the original blocked-href branch.
   - The wrapper does not pass `AnchorComponent`; `fullPageLoad` continues to
     fall back to the shared primitive's default `<a>` for full page loads,
     which matches the previous behavior.
2. Delete
   [apps/web/src/styles/components/Link/Link.module.scss](../../../../apps/web/src/styles/components/Link/Link.module.scss).
   Verify nothing else under `apps/web/src/styles` imports it (it should be
   exclusive to the old `Link.tsx`).
3. Update the previous ADR exclusion in
   [.llm/plans/completed/shared-ui-component-consolidation/04-high-risk-feasibility-and-wrappers.md](../../../../.llm/plans/completed/shared-ui-component-consolidation/04-high-risk-feasibility-and-wrappers.md):
   - Replace the `Link — excluded as a concrete component` block (and the
     row in the decision matrix) with a short note that a
     **framework-agnostic** `Link` primitive now lives in `@podverse/ui` via
     the `LinkComponent` render-prop pattern, and that `next/link` and
     `getSafeLinkHref` remain excluded and stay in the app wrapper. Reference
     this plan directory by relative path. Keep the rest of the file
     (`Image`, `Toast`, modal split, etc.) unchanged.

## Acceptance Criteria

- `apps/web/src/components/Link/Link.tsx` exports the same `Link` symbol
  with the same prop names (`href`, `onClick`, `children`, `className`,
  `type`, `tabIndex`, `aria-label`, `disabled`, `style`, `color`, `target`,
  `rel`, `title`, `fullPageLoad`) and behavior.
- No callsites in `apps/web` are modified.
- `apps/web/src/styles/components/Link/Link.module.scss` is deleted; no
  other SCSS or component file references it.
- The ADR exclusion file is updated to reflect the new policy.
- No new imports of `next/*` or `@podverse/helpers` exist anywhere under
  `packages/ui/`.

## Verification (run in 03)

Defer all verification to `03-verification-and-followups.md`. Per
[.cursorrules](../../../../.cursorrules), do **not** run tests or builds in
this step.
