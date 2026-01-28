# Feature: Monorepo Migration

## Metadata

- Started: 2026-01-23
- Completed: 2026-01-25
- Author: Mitch Downey
- LLM(s): Cursor (Claude)
- GitHub Issue: None

## Context

Migrating 13 repositories into a unified monorepo for LLM-driven development and simplified open source contribution.

## Sessions

### Session 111 - 2026-01-25

#### Prompt (Developer)

the PR has checklists, but it seems odd that the code contributor could fill them in, even though the box could be checked by a github action. is that just how the convention should work? this is for the contributors reference but is not the final authority, and instead the github action should reply with a message in the PR thread, or something, to signal that all lights green in its own checklist for merge?

#### Key Decisions

- PR template checklist is for contributor guidance/self-attestation
- CI is the actual enforcer via branch protection
- Enhanced CI comments to show detailed status table with all checks
- Success shows ✅ for all checks, failure shows which specific checks passed/failed/skipped

#### Files Modified

- .github/workflows/ci.yml (enhanced success/failure comments with detailed status table)

---

### Session 112 - 2026-01-25

#### Prompt (Developer)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself. To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

[Plan: Fix 74 ESLint warnings in apps/web - 12 non-null assertions, 61 explicit any, 1 console statement]

#### Key Decisions

- Phase 1: Fixed 12 non-null assertion warnings using optional chaining, null checks, and type guards
- Phase 2: Fixed 7 explicit any warnings in app/ files using `unknown` for catch blocks and proper types
- Phase 3: Fixed 24 explicit any warnings in components/ using proper imports (DropResult, DropdownMenuItem, etc.)
- Phase 4: Fixed 30 explicit any warnings in hooks/utils/ with generic type constraints and proper typing
- Phase 5: Changed console.log to console.warn for notification permission logging
- Used type-safe patterns: `(DTOPlaylistResource | DTOItem)[]` for auto-queue resources
- Used generic constraints: `<P extends FilterDefaultsPage, T extends object>` for filter defaults hook
- Cast `QUERY_PARAMS_GLOBAL_SORT_VALUES as readonly string[]` for includes() type compatibility

#### Files Modified

- apps/web/src/app/clip/edit/[clip_id]/ClipEditForm.tsx (removed ! assertion)
- apps/web/src/components/Content/About/ContentPeopleRow.tsx (added null check for person)
- apps/web/src/components/List/Music/Albums/Tracks/ListTrackRemoteItemNodes.tsx (filtered items with channels)
- apps/web/src/hooks/usePageStateCache.ts (added null check for scrollPos)
- apps/web/src/app/email-change-verifying/EmailChangeVerifyingClient.tsx (catch err: unknown)
- apps/web/src/app/global-error.tsx (Record<string, unknown> types)
- apps/web/src/app/membership/page.tsx (proper translation and status types)
- apps/web/src/app/verify-email/VerifyEmailClient.tsx (catch err: unknown)
- apps/web/src/components/Category/CategoriesList.tsx (typed tCategories)
- apps/web/src/components/Content/Podroll/ContentPodrollRows.tsx (type guards for key)
- apps/web/src/components/InfoWrapper/HowToStartInfo.tsx (rows: unknown[])
- apps/web/src/components/List/ListChannelSettings.tsx (catch err: unknown)
- apps/web/src/components/List/Playlists/ListPlaylistResources.tsx (DropResult import)
- apps/web/src/components/Media/Header/IconButton.tsx (button type literal)
- apps/web/src/components/MediaPlayer/Buttons/TrackPreviousButton.tsx (typed array)
- apps/web/src/components/MediaPlayer/Buttons/TrackPreviousButtonMobile.tsx (typed array)
- apps/web/src/components/MediaPlayer/Controller/MediaPlayerControllerAV.tsx (SelectedLabeledItemEnclosureAndSource)
- apps/web/src/components/MediaPlayer/Controller/MediaPlayerControllerLiveStreamAV.tsx (typed refs)
- apps/web/src/components/MediaPlayer/Modal/MediaPlayerInfoModal.tsx (typed useLinkHelper params)
- apps/web/src/components/Modal/ModalAuthLogin.tsx (catch err: unknown)
- apps/web/src/components/Playlist/PlaylistForm.tsx (DropdownMenuItem import)
- apps/web/src/components/PodcastIndex/PodcastIndexFeedInfo.tsx (catch error: unknown)
- apps/web/src/components/Settings/Panels/SettingsAccount/ModalChangeEmail.tsx (catch err: unknown)
- apps/web/src/components/Settings/Panels/SettingsAccount/ModalDeleteAccount.tsx (catch err: unknown)
- apps/web/src/constants/medium.ts (TranslationFn type)
- apps/web/src/constants/sharableStatus.ts (TranslationFn type)
- apps/web/src/hooks/useAutoQueueLoadResources.tsx (typed resource array, null coalescing for channel)
- apps/web/src/hooks/useFilterDefaults.ts (generic type constraints, FilterDefaultsForPage)
- apps/web/src/hooks/useMediaPlayerResourceUpdate.tsx (typed getAbridgedAndSet params)
- apps/web/src/hooks/useSkipInitialEffect.tsx (deps: unknown[])
- apps/web/src/providers/Providers.tsx (messages: Record<string, unknown>)
- apps/web/src/utils/categories.ts (AppRouterInstance, QueryParamsGlobalSort)
- apps/web/src/utils/downloadModal/downloadEpisodeWithModal.ts (Promise<unknown>)
- apps/web/src/utils/downloadModal/downloadTrackWithModal.ts (Promise<unknown>)
- apps/web/src/utils/localSettings/localSettings.ts (unknown type guard)
- apps/web/src/utils/mediaPlayer/mediaPlayerLayout.ts (nowPlayingItem: unknown)
- apps/web/src/utils/rateLimit/rateLimitAlert.ts (typed error object extraction)
- apps/web/src/lib/notifications/webpush/requestNotificationPermission.ts (console.warn)

---

### Session 113 - 2026-01-25

#### Prompt (Developer)

uuid module not found error in packages/orm/node_modules - corrupted partial install after some issue

#### Key Decisions

- Diagnosed corrupted uuid package (missing dist/ folder) in packages/orm/node_modules
- Added npm scripts for cleaning and reinstalling node_modules across the monorepo
- Created `clean:node_modules`, `reinstall`, and `reinstall:full` scripts

#### Files Modified

- package.json (added clean:node_modules, reinstall, reinstall:full scripts)

---

### Session 114 - 2026-01-25

#### Prompt (Developer)

add a skill that says all .env and .env.example files should be surrounded with quotation marks. Update: empty string is not used, but no value is used instead. Then update all .env files with the new format.

#### Key Decisions

- Created workspace rule for env file formatting
- Non-empty values must use double quotes (`VAR="value"`)
- Empty values should have no value (`VAR=`) instead of `VAR=""`
- Updated 9 infra/config files to add quotation marks
- Updated 10 apps env files to change `=""` to `=`

#### Files Created

- .cursor/rules/env-file-formatting.mdc

#### Files Modified

- infra/config/local/db.env, keyvaldb.env, mq.env, management-db.env
- infra/config/local/podverse-local-db.env, podverse-local-keyvaldb.env, podverse-local-management-db.env, podverse-local-mq.env
- infra/config/test/db.env
- apps/api/.env.example, apps/api/.env
- apps/web/.env.example, apps/web/.env, apps/web/env/local.env, apps/web/env/alpha.env
- apps/workers/.env.example, apps/workers/.env
- apps/management-api/.env
- apps/management-web/env/alpha.env

---

### Session 115 - 2026-01-25

#### Prompt (Developer)

Workers error: Cannot find module '@workers/commands' - ts-node not resolving path aliases

#### Key Decisions

- ts-node doesn't resolve TypeScript path aliases without tsconfig-paths package
- Added tsconfig-paths to devDependencies
- Updated all worker scripts to use `-r tsconfig-paths/register` flag
- Fixed start script to use `node` instead of `ts-node` for compiled output

#### Files Modified

- apps/workers/package.json (added tsconfig-paths, updated all scripts with -r flag)

---

### Session 116 - 2026-01-25

#### Prompt (Developer)

[mgmt-api] should not be yellow because it looks like a warning. white is also not acceptable. Make all colors unique.

#### Key Decisions

- Changed mgmt-api color from yellow to magentaBright (unique, not alarming)
- Changed mgmt-web color from magenta to greenBright (unique, distinct)
- All concurrently colors now unique and non-alarming

#### Files Modified

- package.json (updated dev:management:all and dev:all color schemes)

---

### Session 117 - 2026-01-25

#### Prompt (Developer)

Config files should not use `!` assertions - make config values `string | undefined` and handle at usage sites.

#### Key Decisions

- Attempted to make all config values `string | undefined` instead of using `!`
- Updated type definitions in packages/helpers, packages/orm, packages/parser, packages/notifications, packages/external-services
- Updated config files to not use `!` assertions
- Added fallbacks at usage sites throughout apps

#### Outcome

- Reverted in Session 118 - approach created too much boilerplate at usage sites

---

### Session 118 - 2026-01-25

#### Prompt (Developer)

Revert the undefined config approach. Using `!` with eslint-disable at top of config files is cleaner since startup validation ensures values exist.

#### Key Decisions

- Config files ARE the one exception where `!` assertions are allowed
- All env vars pass through startup validation before config is used
- Config files should use `/* eslint-disable @typescript-eslint/no-non-null-assertion -- env vars validated at startup */`
- Never set default values in config files (rule remains)

#### Files Modified

- .cursor/rules/config-type-safety.mdc (updated rule to allow `!` in config files only)
- packages/helpers/src/lib/validation/configValidation.ts (reverted types)
- packages/orm/src/config/types.ts (reverted types)
- packages/parser/src/config/types.ts (reverted types)
- packages/notifications/src/config/types.ts (reverted types)
- packages/external-services/src/config/types.ts (reverted types)
- apps/api/src/config/index.ts (restored `!` with eslint-disable)
- apps/workers/src/config/index.ts (restored `!` with eslint-disable)
- apps/management-api/src/config/index.ts (restored `!` with eslint-disable)
- apps/web/src/config/index.ts (restored `!` with eslint-disable)
- Reverted all consuming code changes (factories, auth, proxy, components)

---

### Session 119 - 2026-01-25

#### Prompt (Developer)

`next lint` is deprecated and will be removed in Next.js 16. Migrate to ESLint CLI.

#### Key Decisions

- Simple migration: change from `next lint` to `eslint ./src`
- Matches pattern used by other apps in monorepo (api, workers, etc.)

#### Files Modified

- apps/web/package.json (lint scripts changed to use eslint directly)
- apps/management-web/package.json (lint scripts changed to use eslint directly)

---
