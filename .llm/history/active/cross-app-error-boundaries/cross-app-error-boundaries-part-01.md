# cross-app-error-boundaries

**Started:** 2026-05-06  
**Author:** Agent  
**Context:** Align Next.js `error.tsx` / `global-error.tsx` and i18n with Podverse web for management-web and Metaboost apps.

### Session 1 - 2026-05-06

#### Prompt (Developer)

Align error boundary handling (Podverse + Metaboost)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the todo's.

#### Key Decisions

- Podverse management-web: added `error.tsx`, `global-error.tsx`, SCSS module mirroring web, and top-level `errors` + `misc` keys in all originals; ran `npm run i18n:compile`.
- Metaboost web and management-web: added matching route/global error files using `@metaboost/ui` (`CenterInViewport`, `Text`, `Button`) and extended existing `errors` namespace with boundary/global/action strings; `global-error` loads locale JSON outside providers with safe fallbacks and `ThemeWrapper` + `globals.scss`.
- Deferred optional class-component `ErrorBoundary` (no LazyLoadedComponents-style subtree isolation required yet).

#### Files Created/Modified

- apps/management-web/src/app/error.tsx
- apps/management-web/src/app/global-error.tsx
- apps/management-web/src/styles/components/ErrorBoundary/ErrorBoundary.module.scss
- apps/management-web/i18n/originals/en-US.json, es.json, fr.json, el-GR.json
- apps/management-web/i18n/overrides/\*.json (via i18n compile sync)
