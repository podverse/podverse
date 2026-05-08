# app-local-ui-wrappers

Started: 2026-05-07  
Author: Agent  
Context: Skills/rules + apps/web loading overlay wrappers

---

### Session 1 - 2026-05-07

#### Prompt (Developer)

App-local configured UI wrappers + web sweep

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Added **Podverse** and **Metaboost** guidance: `reusable-components` skill + `app-local-ui-wrappers.mdc` rule; aligned [`apps/web/AGENTS.md`](../../../apps/web/AGENTS.md) and root [`AGENTS.md`](../../../AGENTS.md).
- Introduced [`apps/web/src/components/LoadingSpinner/WebLoadingSpinnerOverlay.tsx`](../../../apps/web/src/components/LoadingSpinner/WebLoadingSpinnerOverlay.tsx): `WebLoadingSpinnerOverlay` (`misc.loading`) and `WebLoadingYourContentSpinnerOverlay` (`misc.loading_your_content` for aria + message).
- Migrated all prior `LoadingSpinnerOverlay` + `tMisc('loading')` / loading_your_content usages in **apps/web** to those wrappers; removed redundant `useTranslations('misc')` where only used for those overlays.

#### Files Created/Modified

- `.cursor/skills/reusable-components/SKILL.md`, `.cursor/skills/ui-component-promotion/SKILL.md`, `.cursor/rules/app-local-ui-wrappers.mdc`
- `apps/web/AGENTS.md`, `AGENTS.md`
- `apps/web/src/components/LoadingSpinner/WebLoadingSpinnerOverlay.tsx`
- Metaboost: `.cursor/skills/reusable-components/SKILL.md`, `.cursor/rules/app-local-ui-wrappers.mdc`
- Numerous `apps/web/src/**/*.tsx` call sites (list pages, profile content, Add-by-RSS clients, etc.)

#### Follow-up sweep (inventory)

- **`MoreButton ariaLabel={tMedia('more_options')}`** appears in many row/header components — candidate for a thin wrapper if duplication threshold is met consistently.
- **`LazyLoadPlaceholder ariaLabel={tMisc('loading')}`** in [`PlaylistEditPageList.tsx`](../../../apps/web/src/app/playlist/edit/[playlist_id]/PlaylistEditPageList.tsx) — consider aligning with the same `misc.loading` wrapper pattern if/when a second identical callsite appears.
