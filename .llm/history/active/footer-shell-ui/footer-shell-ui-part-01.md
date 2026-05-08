# footer-shell-ui

**Started:** 2026-05-06  
**Author:** Agent  
**Context:** Extract main+footer shell and footer layout primitives into `@podverse/ui`; compose in web.

### Session 1 - 2026-05-06

#### Prompt (Developer)

Footer shell and layout primitives in `@podverse/ui`

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Used composable `MainFooterShell` with `footer` slot (no HOC factory); default `outerId` preserves Boost `mainOuterWrapper` anchor.
- `FooterLayout` takes `top` / `links` / `social` slots; `FooterLinks` and `FooterSocialLinks` are presentational wrappers sharing `FooterLayout.module.scss`.
- Removed web `MainWrapper.module.scss` and `Footer.module.scss` after migrating styles to `packages/ui`.

#### Files Created/Modified

- packages/ui/src/components/layout/MainFooterShell/MainFooterShell.tsx
- packages/ui/src/components/layout/MainFooterShell/MainFooterShell.module.scss
- packages/ui/src/components/layout/MainFooterShell/MainFooterShell.test.tsx
- packages/ui/src/components/layout/FooterLayout/FooterLayout.tsx
- packages/ui/src/components/layout/FooterLayout/FooterLayout.module.scss
- packages/ui/src/components/layout/FooterLayout/FooterLinks.tsx
- packages/ui/src/components/layout/FooterLayout/FooterSocialLinks.tsx
- packages/ui/src/index.ts
- apps/web/src/components/Main/MainWrapper.tsx
- apps/web/src/components/Footer/Footer.tsx
- apps/web/src/styles/components/Main/MainWrapper.module.scss (deleted)
- apps/web/src/styles/components/Footer/Footer.module.scss (deleted)
