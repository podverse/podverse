# Web UI direct imports (remove re-export shims)

## Metadata

- **Started:** 2026-05-05
- **Author:** Agent
- **Context:** Remove `apps/web` one-line `@podverse/ui` re-exports; import UI from package at call sites.

### Session 1 - 2026-05-05

#### Prompt (Developer)

Remove unnecessary `@podverse/ui` re-export files in web

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Rewrote ~105 `apps/web` files to import values/types from `@podverse/ui` (separate `import type` lines); removed shim
  files and empty `Button/`, `Divider/`, `Tooltip/`, `Tabs/` dirs.
- Fixed [`HowToStartInfo.tsx`](apps/web/src/components/HowToStartInfo/HowToStartInfo.tsx) to import `InfoWrapper` from
  `@podverse/ui` after deleting `./InfoWrapper`.
- Next.js typecheck surfaced CSS-module computed keys in `@podverse/ui`: adjusted
  [`Divider.tsx`](packages/ui/src/components/layout/Divider/Divider.tsx) and
  [`Tab.tsx`](packages/ui/src/components/navigation/Tab/Tab.tsx) to use `classNames` with conditional classes instead
  of `{ [styles.x]: bool }`.
- Documented preference in [`apps/web/AGENTS.md`](apps/web/AGENTS.md).
- `make e2e_test_web_report_spec SPEC=e2e/smoke.spec.ts` failed here (Docker daemon unavailable); `npm run lint` and
  `npm run build -w @podverse/web` succeeded.

#### Files Created/Modified

- apps/web: broad import updates; deleted shim TSX files; `apps/web/AGENTS.md`;
  `apps/web/src/components/HowToStartInfo/HowToStartInfo.tsx`
- packages/ui: `packages/ui/src/components/layout/Divider/Divider.tsx`,
  `packages/ui/src/components/navigation/Tab/Tab.tsx`

### Session 2 — 2026-05-06

#### Prompt (Developer)

the "HowToStartInfo" component is in a folder named InfoWrapper but it should be in a folder named after itself in podverse web

#### Key Decisions

- Moved **`HowToStartInfo.tsx`** from **`apps/web/src/components/InfoWrapper/`** to
  **`apps/web/src/components/HowToStartInfo/HowToStartInfo.tsx`** (relative imports unchanged).
- Updated **nine** list page imports to **`../../components/HowToStartInfo/HowToStartInfo`** (or equivalent depth).
- Removed empty **`InfoWrapper/`** directory.

#### Files Created/Modified

- `apps/web/src/components/HowToStartInfo/HowToStartInfo.tsx`
- Deleted: `apps/web/src/components/InfoWrapper/HowToStartInfo.tsx`
- `apps/web/src/app/HomePageList.tsx`
- `apps/web/src/app/albums/AlbumsPageList.tsx`
- `apps/web/src/app/artists/ArtistsPageList.tsx`
- `apps/web/src/app/clips/ClipsPageList.tsx`
- `apps/web/src/app/episodes/EpisodesPageList.tsx`
- `apps/web/src/app/podcasts/PodcastsPageList.tsx`
- `apps/web/src/app/podcasts/livestreams/LivestreamsPageList.tsx`
- `apps/web/src/app/profiles/ProfilesPageList.tsx`
- `apps/web/src/app/tracks/TracksPageList.tsx`
- `.llm/history/active/web-ui-direct-imports/web-ui-direct-imports-part-01.md`
