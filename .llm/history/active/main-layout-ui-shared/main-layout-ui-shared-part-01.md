# main-layout-ui-shared

**Started:** 2026-05-06  
**Author:** Agent  
**Context:** Move Main layout primitives from apps/web into `@podverse/ui`.

### Session 1 - 2026-05-06

#### Prompt (Developer)

Move Main layout components into `@podverse/ui`

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Promoted `MainHeader`, `MainInnerWrapper`, and `MainInnerContentWrapper` into `packages/ui` with co-located SCSS; moved `line-clamp` styling from `.header h1` to `.title` on the `h1` for clearer CSS modules scope.
- Left `MainWrapper` in `apps/web` (composes `MainFooterShell` + `Footer`).
- Used a one-off migration script then removed it from the repo after import updates.

#### Files Created/Modified

- packages/ui/src/components/layout/MainHeader/\*
- packages/ui/src/components/layout/MainInnerWrapper/\*
- packages/ui/src/components/layout/MainInnerContentWrapper/\*
- packages/ui/src/index.ts
- apps/web: migrated imports across page/client/header files; removed old Main TSX and SCSS under `apps/web/src/styles/components/Main/`

---

### Session 2 - 2026-05-07

#### Prompt (Developer)

do it

#### Key Decisions

- Renamed **`MainFooterShell`** → **`MainPageScaffold`** (component, props type, folder, SCSS module, tests) to better describe main column + divider + footer scaffold; default **`outerId`** unchanged (**`mainOuterWrapper`**).
- **`MainWrapper`** now composes **`MainPageScaffold`** + **`Footer`**; **`MainFooterShell`** removed from **`@podverse/ui`** public API.

#### Files Created/Modified

- `packages/ui/src/components/layout/MainPageScaffold/MainPageScaffold.tsx`
- `packages/ui/src/components/layout/MainPageScaffold/MainPageScaffold.module.scss`
- `packages/ui/src/components/layout/MainPageScaffold/MainPageScaffold.test.tsx`
- `packages/ui/src/index.ts`
- `apps/web/src/components/Main/MainWrapper.tsx`
- Removed `packages/ui/src/components/layout/MainFooterShell/*`
