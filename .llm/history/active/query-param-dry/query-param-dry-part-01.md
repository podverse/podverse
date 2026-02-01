# Feature: query-param-dry (Part 1)

> **Note**: This LLM history file is optional. If you're not using LLM assistance for
> development, you can delete this file and the containing directory. The history
> tracking system helps document LLM-assisted decisions but is not required for
> contributing.
>
> **10-Session Limit**: Each part file is limited to 10 sessions. When adding Session
> 11, create `query-param-dry-part-02.md`.

## Metadata

- Started: 2026-01-31
- Completed: In Progress
- Author: Mitch Downey
- LLM(s): Cursor, Claude, etc.
- GitHub Issues: None
- Branch: chore/query-param-type-cleanup
- Origin: git@github.com:podverse/podverse.git
- Is Fork: no

## Context

Reduce duplicate query param value sets in helpers to keep API/web validation consistent.

## Sessions

### Session 1 - 2026-01-31

#### Prompt (Developer)

@plan-execution-autopilot-prompt.md (10-23)

@migration-COPY-PASTA.md (1-37)

#### Key Decisions

- Introduced shared base arrays and type aliases for identical value sets.
- Kept existing exports, pointing them at shared arrays to avoid consumer changes.

#### Files Changed

- packages/helpers-requests/src/api/queryParams.ts
- .llm/history/active/query-param-dry/query-param-dry-part-01.md

---

### Session 2 - 2026-01-31

#### Prompt (Developer)

```markdown
You are running in autopilot mode to execute a set of plans end-to-end without human
interaction. Treat every approval as granted. Do not ask questions or request confirmation.

Rules:

- Treat the plan content that follows this prompt as the source of truth, regardless of
  filenames or prefixes.
- Execute each plan to completion before moving to the next.
- Follow repository rules and required workflows exactly.
- Use non-interactive command flags only; avoid any step that requires prompts.
- If a step would block on interactive input, choose a non-interactive alternative and
  continue. Record any assumption in LLM history.
- Keep going through errors by fixing them and retrying until the plans complete.
- Run tests or verification steps explicitly called for in the plans.
- Update LLM history before and after file changes as required.
```

# Query Param DRY Refactor - Copy-Pasta Prompts

## Critical Execution Rules

- Phases are sequential. Wait for each phase to finish before starting the next.
- Agents within a phase can run in parallel.

## Phase 1: Helpers Foundation (Sequential)

### Agent 1

```
Read and execute .llm/plans/active/query-param-dry/migration-01-helpers-dedupe.md

Focus on shared query param arrays and generic types.

Verify: no duplicate value arrays remain in helpers.
```

## Phase 2: Dependent Updates (Parallel)

### Agent 2A: API Joi Refactor

```
Read and execute .llm/plans/active/query-param-dry/migration-02-api-joi-refactor.md

Core rule: use shared constants for all query param validation.
```

### Agent 2B: Web Updates

```
Read and execute .llm/plans/active/query-param-dry/migration-03-web-updates.md

Core rule: align imports and types with shared helpers.
```

#### Key Decisions

- Added Joi helpers for common enum and page patterns.
- Moved controller Joi schemas inline and aligned enum validation with shared constants.
- Updated web query param enums to use shared generic constants.

#### Files Changed

- apps/api/src/lib/validation/index.ts
- apps/api/src/controllers/itemSoundbite.ts
- apps/api/src/controllers/playlist/playlistResource.ts
- apps/api/src/controllers/item.ts
- apps/api/src/controllers/channel.ts
- apps/api/src/controllers/playlist/playlist.ts
- apps/api/src/controllers/clip.ts
- apps/web/src/app/podcasts/page.tsx
- apps/web/src/app/profiles/page.tsx
- .llm/history/active/query-param-dry/query-param-dry-part-01.md

---

### Session 3 - 2026-01-31

#### Prompt (Developer)

@migration-COPY-PASTA.md (16-47)

#### Key Decisions

- Consolidate duplicate query param arrays into shared base constants in helpers.
- Preserve existing export names to avoid downstream changes.

#### Files Modified

- packages/helpers-requests/src/api/queryParams.ts
- .llm/history/active/query-param-dry/query-param-dry-part-01.md

---

### Session 4 - 2026-01-31

#### Prompt (Developer)

break all of the remaining query-param-dry plans into sub plans so they can be run one by one or in
parallel without exceeding the complexity threshold

#### Key Decisions

- Split the API Joi refactor into smaller controller-focused plan files plus a shared schema step.
- Split web verification into per-page verification steps to keep each plan under the threshold.

#### Files Modified

- .llm/plans/active/query-param-dry/migration-02a-api-shared-schemas.md
- .llm/plans/active/query-param-dry/migration-02b-api-channel-item.md
- .llm/plans/active/query-param-dry/migration-02c-api-clip-playlist.md
- .llm/plans/active/query-param-dry/migration-02d-api-playlist-resources.md
- .llm/plans/active/query-param-dry/migration-02e-api-item-soundbite-queue.md
- .llm/plans/active/query-param-dry/migration-02f-api-queue-resources.md
- .llm/plans/active/query-param-dry/migration-02g-api-misc-controllers.md
- .llm/plans/active/query-param-dry/migration-03a-web-podcasts-tracks.md
- .llm/plans/active/query-param-dry/migration-03b-web-profiles-queues.md
- .llm/plans/active/query-param-dry/migration-COPY-PASTA.md
- .llm/plans/active/query-param-dry/migration-02-api-joi-refactor.md
- .llm/plans/active/query-param-dry/migration-03-web-updates.md
- .llm/history/active/query-param-dry/query-param-dry-part-01.md

---

### Session 5 - 2026-01-31

#### Prompt (Developer)

go

#### Key Decisions

- Temporarily comment out the complexity assessment rule in `.cursorrules`.

#### Files Modified

- .cursorrules
- .llm/history/active/query-param-dry/query-param-dry-part-01.md

---

### Session 6 - 2026-01-31

#### Prompt (Developer)

execute the remaining plans for the query-param-dry

#### Key Decisions

- Added shared query Joi schemas and re-exported them for controller usage.
- Inlined non-reusable schemas and switched Joi.valid arrays to shared constants.

#### Files Modified

- apps/api/src/lib/validation/querySchemas.ts
- apps/api/src/lib/validation/index.ts
- apps/api/src/controllers/channel.ts
- apps/api/src/controllers/item.ts
- apps/api/src/controllers/clip.ts
- apps/api/src/controllers/playlist/playlist.ts
- apps/api/src/controllers/playlist/playlistResource.ts
- apps/api/src/controllers/playlist/playlistResourceItem.ts
- apps/api/src/controllers/playlist/playlistResourceClip.ts
- apps/api/src/controllers/playlist/playlistResourceItemSoundbite.ts
- apps/api/src/controllers/playlist/playlistResourceItemAddByRSS.ts
- apps/api/src/controllers/itemSoundbite.ts
- apps/api/src/controllers/queue/queue.ts
- apps/api/src/controllers/queue/queueResource.ts
- apps/api/src/controllers/queue/queueResourceItem.ts
- apps/api/src/controllers/queue/queueResourceClip.ts
- apps/api/src/controllers/queue/queueResourceItemSoundbite.ts
- apps/api/src/controllers/queue/queueResourceItemAddByRSS.ts
- apps/api/src/controllers/account/account.ts
- apps/api/src/controllers/account/accountFCMDevice.ts
- apps/api/src/controllers/account/accountUPDevice.ts
- apps/api/src/controllers/account/accountWebPushDevice.ts
- apps/api/src/controllers/account/accountSettings/accountSettingsLocale.ts
- apps/api/src/controllers/account/accountSettings/accountSettingsNotificationType.ts
- apps/api/src/controllers/account/accountNotificationChannelType.ts
- apps/api/src/controllers/account/accountNotificationChannel.ts
- apps/api/src/controllers/account/accountFollowingPlaylist.ts
- apps/api/src/controllers/account/accountFollowingChannel.ts
- apps/api/src/controllers/account/accountFollowingAddByRSSChannel.ts
- apps/api/src/controllers/account/accountFollowingAccount.ts
- apps/api/src/controllers/profileContent.ts
- apps/api/src/controllers/publisherFeed.ts
- apps/api/src/controllers/podroll.ts
- apps/api/src/controllers/itemTranscript.ts
- apps/api/src/controllers/itemChapter.ts
- apps/api/src/controllers/membershipClaimToken.ts
- apps/api/src/controllers/liveItem.ts
- apps/api/src/controllers/feed.ts
- apps/api/src/controllers/externalServices/podcastIndex.ts
- apps/api/src/controllers/category.ts
- apps/api/src/controllers/stats/statsTrackEventPlaylist.ts
- apps/api/src/controllers/stats/statsTrackEventItem.ts
- apps/api/src/controllers/stats/statsTrackEventClip.ts
- apps/api/src/controllers/stats/statsTrackEventChannel.ts
- apps/api/src/controllers/stats/statsTrackEventAccount.ts
- .llm/history/active/query-param-dry/query-param-dry-part-01.md

---

### Session 7 - 2026-01-31

#### Prompt (Developer)

review the query-param-dry plans, and if you decide they are all finished, handle them as complete

#### Key Decisions

- Mark query-param-dry plan files as completed and move to completed directory.

#### Files Modified

- .llm/history/active/query-param-dry/query-param-dry-part-01.md
- .llm/plans/active/query-param-dry/migration-00-EXECUTION-ORDER.md
- .llm/plans/active/query-param-dry/migration-00-SUMMARY.md
- .llm/plans/active/query-param-dry/migration-01-helpers-dedupe.md
- .llm/plans/active/query-param-dry/migration-02-api-joi-refactor.md
- .llm/plans/active/query-param-dry/migration-02a-api-shared-schemas.md
- .llm/plans/active/query-param-dry/migration-02b-api-channel-item.md
- .llm/plans/active/query-param-dry/migration-02c-api-clip-playlist.md
- .llm/plans/active/query-param-dry/migration-02d-api-playlist-resources.md
- .llm/plans/active/query-param-dry/migration-02e-api-item-soundbite-queue.md
- .llm/plans/active/query-param-dry/migration-02f-api-queue-resources.md
- .llm/plans/active/query-param-dry/migration-02g-api-account-core.md
- .llm/plans/active/query-param-dry/migration-02h-api-account-devices-settings.md
- .llm/plans/active/query-param-dry/migration-02i-api-account-notification-following.md
- .llm/plans/active/query-param-dry/migration-02j-api-misc-content.md
- .llm/plans/active/query-param-dry/migration-02k-api-misc-services.md
- .llm/plans/active/query-param-dry/migration-02l-api-stats-controllers.md
- .llm/plans/active/query-param-dry/migration-03-web-updates.md
- .llm/plans/active/query-param-dry/migration-03a-web-podcasts-tracks.md
- .llm/plans/active/query-param-dry/migration-03b-web-profiles-queues.md
- .llm/plans/active/query-param-dry/migration-COPY-PASTA.md
- .llm/plans/completed/query-param-dry/migration-00-EXECUTION-ORDER.md
- .llm/plans/completed/query-param-dry/migration-00-SUMMARY.md
- .llm/plans/completed/query-param-dry/migration-01-helpers-dedupe.md
- .llm/plans/completed/query-param-dry/migration-02-api-joi-refactor.md
- .llm/plans/completed/query-param-dry/migration-02a-api-shared-schemas.md
- .llm/plans/completed/query-param-dry/migration-02b-api-channel-item.md
- .llm/plans/completed/query-param-dry/migration-02c-api-clip-playlist.md
- .llm/plans/completed/query-param-dry/migration-02d-api-playlist-resources.md
- .llm/plans/completed/query-param-dry/migration-02e-api-item-soundbite-queue.md
- .llm/plans/completed/query-param-dry/migration-02f-api-queue-resources.md
- .llm/plans/completed/query-param-dry/migration-02g-api-account-core.md
- .llm/plans/completed/query-param-dry/migration-02h-api-account-devices-settings.md
- .llm/plans/completed/query-param-dry/migration-02i-api-account-notification-following.md
- .llm/plans/completed/query-param-dry/migration-02j-api-misc-content.md
- .llm/plans/completed/query-param-dry/migration-02k-api-misc-services.md
- .llm/plans/completed/query-param-dry/migration-02l-api-stats-controllers.md
- .llm/plans/completed/query-param-dry/migration-03-web-updates.md
- .llm/plans/completed/query-param-dry/migration-03a-web-podcasts-tracks.md
- .llm/plans/completed/query-param-dry/migration-03b-web-profiles-queues.md
- .llm/plans/completed/query-param-dry/migration-COPY-PASTA.md

---

## Related Resources

- [Link to PR]
- [Link to related issues]
