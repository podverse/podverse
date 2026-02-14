# Feature: web-runtime-config-endpoint (Part 1)

> **Note**: This LLM history file is optional. If you're not using LLM assistance for development, you can delete this file and the containing directory. The history tracking system helps document LLM-assisted decisions but is not required for contributing.
>
> **10-Session Limit**: Each part file is limited to 10 sessions. When adding Session 11, create `web-runtime-config-endpoint-part-02.md`.

## Metadata

- Started: 2026-02-13
- Completed: In Progress
- Author: Mitch Downey
- LLM(s): Cursor, Claude, etc.
- GitHub Issues: https://github.com/podverse/podverse/issues/62
- Branch: feature/web-runtime-config-endpoint
- Origin: git@github.com:podverse/podverse.git
- Is Fork: no

## Context

Plan for shifting Next.js public env values to a runtime-config endpoint so
deployers can provide `.env.production` at runtime.

## Sessions

### Session 1 - 2026-02-13

#### Prompt (Developer)

Save the plans locally as multiple subplan files that are separate following our usual practices.

#### Key Decisions

- Split the runtime-config plan into numbered subplans under `.llm/plans/active`.

#### Files Changed

- .llm/plans/active/web-runtime-config-endpoint/00-overview.md
- .llm/plans/active/web-runtime-config-endpoint/01-runtime-config-contract.md
- .llm/plans/active/web-runtime-config-endpoint/02-endpoint-bootstrap.md
- .llm/plans/active/web-runtime-config-endpoint/03-validation-updates.md
- .llm/plans/active/web-runtime-config-endpoint/04-docker-make-ci.md
- .llm/plans/active/web-runtime-config-endpoint/05-infra-ansible-k8s.md
- .llm/plans/active/web-runtime-config-endpoint/06-docs.md
- .llm/plans/active/web-runtime-config-endpoint/EXECUTION.md

---

### Session 2 - 2026-02-13

#### Prompt (Developer)

Note in your current plans that we avoid using default values for NVARs as much as possible, as we want everyone to explain explicitly define their end vars before running the app without something happening in In the background they aren't aware of

#### Key Decisions

- Added explicit note to avoid env defaults and require explicit configuration.

#### Files Changed

- .llm/plans/active/web-runtime-config-endpoint/00-overview.md
- .llm/plans/active/web-runtime-config-endpoint/03-validation-updates.md

### Session 3 - 2026-02-13

#### Prompt (Developer)

Also note that some NVARs may be optional and you should look to the existing environment validation logic. Magic to determine which is optional

#### Key Decisions

- Use existing validation logic to determine optional env vars.

#### Files Changed

- .llm/plans/active/web-runtime-config-endpoint/03-validation-updates.md

### Session 4 - 2026-02-13

#### Prompt (Developer)

Implement the first plan

#### Key Decisions

- Add runtime-config contract files defining env key lists and types.

#### Files Changed

- apps/web/src/config/runtime-config.ts
- apps/management-web/src/config/runtime-config.ts

### Session 5 - 2026-02-13

#### Prompt (Developer)

implement plan 2

#### Key Decisions

- Add runtime-config endpoints and scripts for web and management-web.
- Switch config access to runtime-config stores and set runtime config in layouts.
- Replace apiRequestService singleton usage with getApiRequestService.

#### Files Changed

- apps/web/src/app/api/runtime-config/route.ts
- apps/web/src/components/Head/RuntimeConfigScript.tsx
- apps/web/src/config/index.ts
- apps/web/src/config/runtime-config-client.ts
- apps/web/src/config/runtime-config-store.ts
- apps/web/src/config/runtime-config.server.ts
- apps/web/src/app/layout.tsx
- apps/web/src/app/api/proxy/route.ts
- apps/web/src/constants/contact.ts
- apps/web/src/constants/socials.ts
- apps/web/src/constants/web.ts
- apps/web/src/contexts/Notifications.tsx
- apps/web/src/components/Boost/BoostForm.tsx
- apps/web/src/components/PodcastIndex/PodcastIndexFeedInfo.tsx
- apps/web/src/app/membership/page.tsx
- apps/web/src/app/checkout/page.tsx
- apps/web/src/app/sign-up/SignUpClient.tsx
- apps/web/src/components/Footer/FooterBrand.tsx
- apps/web/src/components/Modal/ModalDisclaimer.tsx
- apps/web/src/components/NavBar/NavBarBrand.tsx
- apps/web/src/components/SideBar/SideBarBrand.tsx
- apps/web/src/components/Playlist/PlaylistForm.tsx
- apps/web/src/components/Modal/ModalPlaylistAddTo.tsx
- apps/web/src/components/MediaPlayer/Controller/MediaPlayerController.tsx
- apps/web/src/components/MediaPlayer/Buttons/TrackPreviousButton.tsx
- apps/web/src/components/MediaPlayer/Buttons/TrackPreviousButtonMobile.tsx
- apps/web/src/components/Media/Header/SubscribeButton.tsx
- apps/web/src/components/Media/Header/NotificationIconButton.tsx
- apps/web/src/components/Media/Clip/ClipHeaderPlaySection.tsx
- apps/web/src/components/Media/ItemSoundbite/ItemSoundbiteHeaderPlaySection.tsx
- apps/web/src/components/List/SearchResults/ListSearchResultPodcastIndexFeedRow.tsx
- apps/web/src/components/List/Queues/ListQueueResources.tsx
- apps/web/src/components/List/Queues/ListQueueResourceRow.tsx
- apps/web/src/components/List/Podcasts/Episodes/ListEpisodeRow.tsx
- apps/web/src/components/List/Playlists/ListPlaylistResources.tsx
- apps/web/src/components/List/Playlists/ListPlaylistResourceRow.tsx
- apps/web/src/components/List/Music/Albums/Tracks/ListTrackRow.tsx
- apps/web/src/components/List/ListChannelSettings.tsx
- apps/web/src/components/List/ItemSoundbites/ListItemSoundbiteRow.tsx
- apps/web/src/components/List/Clips/ListClipRow.tsx
- apps/web/src/components/Core/Podcast/Episodes/CoreEpisodeHeaderPlaySection.tsx
- apps/web/src/components/Core/Artist/Album/Track/CoreTrackHeaderPlaySection.tsx
- apps/web/src/components/Common/Podcast/Episode/CommonEpisodeRow.tsx
- apps/web/src/components/Settings/Panels/SettingsGeneral/SettingsLocaleSelector.tsx
- apps/web/src/hooks/useAddByRSSPositionSave.tsx
- apps/web/src/hooks/useAutoQueueLoadResources.tsx
- apps/web/src/hooks/usePlayAddByRSS.tsx
- apps/web/src/hooks/useQueueResourceMoveNowPlayingToHistory.tsx
- apps/web/src/hooks/useQueueResourceUpdateNowPlaying.tsx
- apps/web/src/hooks/useQueueResourcesLoadActive.tsx
- apps/web/src/i18n/request.ts
- apps/web/src/lib/notifications/webpush/requestNotificationPermission.ts
- apps/web/src/utils/addByRSS/api.ts
- apps/web/src/utils/localSettings/uiTheme.ts
- apps/web/src/utils/value/appValue.ts
- apps/web/src/factories/apiRequestService.ts
- apps/management-web/src/app/api/runtime-config/route.ts
- apps/management-web/src/app/layout.tsx
- apps/management-web/src/components/Head/RuntimeConfigScript.tsx
- apps/management-web/src/config/index.ts
- apps/management-web/src/config/runtime-config-client.ts
- apps/management-web/src/config/runtime-config-store.ts
- apps/management-web/src/config/runtime-config.server.ts
- apps/management-web/src/i18n/request.ts
- apps/management-web/src/lib/requests/apiRequestService.ts

### Session 6 - 2026-02-13

#### Prompt (Developer)

update the plans as per your recommendations

#### Key Decisions

- Revise plan to use a sidecar runtime-config service with internal-only access.

#### Files Changed

- .llm/plans/active/web-runtime-config-endpoint/00-overview.md
- .llm/plans/active/web-runtime-config-endpoint/02-endpoint-bootstrap.md
- .llm/plans/active/web-runtime-config-endpoint/03-validation-updates.md
- .llm/plans/active/web-runtime-config-endpoint/04-docker-make-ci.md
- .llm/plans/active/web-runtime-config-endpoint/05-infra-ansible-k8s.md
- .llm/plans/active/web-runtime-config-endpoint/06-docs.md
- .llm/plans/active/web-runtime-config-endpoint/EXECUTION.md

### Session 7 - 2026-02-13

#### Prompt (Developer)

implement all of the plans until they are all completed

#### Key Decisions

- Implement sidecar-based runtime config across web and management-web.
- Remove public runtime-config API routes and client fetches.
- Shift web app validation to `RUNTIME_CONFIG_URL` and keep `NEXT_PUBLIC_*` in sidecar envs.

#### Files Changed

- apps/web/src/config/runtime-config.server.ts
- apps/management-web/src/config/runtime-config.server.ts
- apps/web/src/app/layout.tsx
- apps/management-web/src/app/layout.tsx
- apps/web/src/app/api/proxy/route.ts
- apps/web/sidecar/server.js
- apps/web/sidecar/Dockerfile
- apps/management-web/sidecar/server.js
- apps/management-web/sidecar/Dockerfile
- apps/web/scripts/validate-env.ts
- apps/management-web/scripts/validate-env.ts
- apps/web/Dockerfile
- apps/management-web/Dockerfile
- infra/docker/local/web/docker-compose.yml
- infra/docker/local/management-web/docker-compose.yml
- infra/docker/alpha/web/docker-compose.yml.template
- infra/docker/alpha/management-web/docker-compose.yml.template
- Makefile.alpha
- .github/workflows/publish-alpha.yml
- Makefile
- Makefile.local
- apps/web/APPS-WEB.md
- apps/management-web/APPS-MANAGEMENT-WEB.md
- apps/web/ENV.md
- apps/management-web/ENV.md
- infra/config/env-templates/web.env.example
- infra/config/env-templates/management-web.env.example
- infra/k8s/base/web/01-configmap.yaml
- infra/k8s/base/web/03-deployment.yaml
- tools/web-perf/lighthouse/src/web-app-manager.ts
- tools/web-perf/lighthouse/.env.web.example
- tools/web-perf/lighthouse/.env.web
- tools/web-perf/lighthouse/TOOLS-WEB-PERF-LIGHTHOUSE.md
- apps/web/src/config/runtime-config-client.ts (deleted)
- apps/management-web/src/config/runtime-config-client.ts (deleted)
- apps/web/src/app/api/runtime-config/route.ts (deleted)
- apps/management-web/src/app/api/runtime-config/route.ts (deleted)

### Session 8 - 2026-02-13

#### Prompt (Developer)

continue with the web env var plans

update podverse-ansible at /Users/mitcheldowney/repos/pv/podverse-ansible note that
you won't be able to update the encrypted env vars but you should add everythung
else and tell me in the final instructions what still needs me to update it, and
also create new files if needed

#### Key Decisions

- **Alpha only:** Web and management-web runtime-config Ansible changes apply only to Alpha (no sandbox/prod role changes).
- Created `podverse_alpha_web_conf` and `podverse_alpha_management_web_conf` roles; added to
  `podverse-alpha-srv.yaml`. Alpha env files live under `/opt/podverse/infra/config/alpha/`.
- Added plain `.env.example` files in each new role; encrypted `web.env` and `management-web.env`
  must be created and vault-encrypted by the user (documented in role READMEs and
  `docs/WEB-RUNTIME-CONFIG.md`).
- Created `docs/WEB-RUNTIME-CONFIG.md` scoped to Alpha only (what you still need to do for alpha web.env and management-web.env).

#### Files Changed (podverse-ansible repo)

- roles/podverse_alpha_web_conf/ (new role: tasks, meta, defaults, handlers, vars, tests, README,
  files/opt/podverse/infra/config/alpha/web.env.example)
- roles/podverse_alpha_management_web_conf/ (new role: same structure, management-web.env.example)
- podverse-alpha-srv.yaml (added podverse_alpha_web_conf, podverse_alpha_management_web_conf)
- docs/WEB-RUNTIME-CONFIG.md (new, Alpha only)
- README.md (link to docs/WEB-RUNTIME-CONFIG.md)

### Session 9 - 2026-02-13

#### Prompt (Developer)

implement plan

#### Key Decisions

- Implemented thorough startup validation in both runtime-config sidecars (web and management-web) per plan: validate every env var (PORT + all requiredKeys + all optionalKeys), log each by category with ✓/✗ and message, display validation summary (Total, Passed, Skipped, Failed, Required Missing), exit(1) if requiredMissing > 0. Pattern matches api/workers/validate-env.
- Web sidecar: value validators for protocol, signup mode, server env, proxy user-agent, supported/default locales, supported/default themes, optional positive numbers (ports, polling interval). Categories: Server, API, API (SSR), Web, Features, Themes, Proxy, General, Brand, Lightning, Social, Notifications.
- Management-web sidecar: value validators for protocol, supported/default locales, optional API port. Categories: Server, API, Features, Brand.
- Constants (VALID_LOCALES, VALID_THEMES, SERVER_ENV_VALUES, SIGNUP_MODES) hardcoded in server.js; comment to keep in sync with packages/helpers and ENV.md.
- ENV.md (both apps): updated Overview to state sidecar runs full env validation at startup and logs every var's status.

#### Files Modified

- apps/web/sidecar/server.js (full validation + displayValidationResults)
- apps/management-web/sidecar/server.js (full validation + displayValidationResults)
- apps/web/ENV.md (Overview)
- apps/management-web/ENV.md (Overview)

### Session 10 - 2026-02-13

#### Prompt (Developer)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Update sidecar Dockerfiles to skip npm scripts during `npm ci` so the git-hooks
  prepare step does not fail in Alpine images without bash.

#### Files Modified

- apps/web/sidecar/Dockerfile
- apps/management-web/sidecar/Dockerfile

## Related Resources

- [Link to PR]
- [Link to related issues]
