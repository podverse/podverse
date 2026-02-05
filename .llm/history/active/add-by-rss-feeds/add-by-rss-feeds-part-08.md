# Feature: add-by-rss-feeds (Part 8)

> **Note**: This LLM history file is optional. If you're not using LLM assistance for
> development, you can delete this file and the containing directory. The history tracking
> system helps document LLM-assisted decisions but is not required for contributing.
>
> **10-Session Limit**: Each part file is limited to 10 sessions. When adding Session 91,
> create `add-by-rss-feeds-part-09.md`.

## Metadata

- Started: 2026-02-03
- Completed: In Progress
- Author: Mitch Downey
- LLM(s): Cursor, Claude, etc.
- GitHub Issues: https://github.com/podverse/podverse/issues/43
- Branch: feature/add-by-rss-feeds
- Origin: git@github.com:podverse/podverse.git
- Is Fork: no

## Context

Add-by-RSS unsubscribe cleanup helpers.

## Sessions

### Session 81 - 2026-02-03

#### Prompt (Developer)

when a user unsubscribes from an add by rss feed, it should be cleared from index db. since this is a multistep process it should be handled in a helper so other pages can potentially use it

#### Key Decisions

- Added a helper to unfollow add-by-RSS feeds and clear IndexedDB entries in one step.

#### Files Modified

- apps/web/src/utils/addByRSS/actions.ts
- apps/web/src/app/add-by-rss/podcast/AddByRSSPodcastHeader.tsx
- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-08.md

### Session 82 - 2026-02-03

#### Prompt (Developer)

instead of an actions.ts actions should be a folder and the helper you wrote should be moved into accountFollowingAddByRSSChannel

#### Key Decisions

- Moved add-by-RSS follow/unfollow cleanup helper into actions/accountFollowingAddByRSSChannel.

#### Files Modified

- apps/web/src/utils/addByRSS/actions/accountFollowingAddByRSSChannel.ts
- apps/web/src/utils/addByRSS/actions.ts
- apps/web/src/app/add-by-rss/podcast/AddByRSSPodcastHeader.tsx
- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-08.md

### Session 83 - 2026-02-03

#### Prompt (Developer)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Added a shared add-by-RSS subscribe action that follows, seeds IndexedDB, and queues parsing.

#### Files Modified

- apps/web/src/utils/addByRSS/actions/accountFollowingAddByRSSChannel.ts
- apps/web/src/app/add-by-rss/AddByRSSListClient.tsx
- apps/web/src/app/add-by-rss/podcast/AddByRSSPodcastHeader.tsx
- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-08.md

### Session 84 - 2026-02-03

#### Prompt (Developer)

@AddByRSSListClient.tsx (29-49)

these are the utils that are missing

#### Key Decisions

- Restored the requested add-by-RSS utility imports even though they are currently unused.

#### Files Modified

- apps/web/src/app/add-by-rss/AddByRSSListClient.tsx
- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-08.md

### Session 85 - 2026-02-03

#### Prompt (Developer)

http://localhost:3000/add-by-rss/podcast/3Fz9URvTRN

when you attempt to navigate to a page like this, but the feed is not in the index db, it should say this feed could not be found locally and use I-18N Translations

#### Key Decisions

- Added a dedicated add-by-RSS translation for missing local feed detail views.
- Updated add-by-RSS detail not-found state to use the new translation key.

#### Files Modified

- apps/web/i18n/originals/en-US.json
- apps/web/src/app/add-by-rss/AddByRSSDetailClient.tsx
- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-08.md

### Session 86 - 2026-02-03

#### Prompt (Developer)

The Add Feed RSS feed URL text input appears to become disabled when I press the Add Feed button, but it should not become disabled

#### Key Decisions

- Keep the Add Feed input enabled while the add request is running.

#### Files Modified

- apps/web/src/app/add-by-rss/AddByRSSListClient.tsx
- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-08.md

### Session 87 - 2026-02-03

#### Prompt (Developer)

yes and add any temp console log statements to help you identify the issue or rule out other causes

#### Key Decisions

- Add MQ debug logging around enqueue and sending.
- Surface MQ send failures by rethrowing errors.

#### Files Modified

- apps/api/src/controllers/account/accountAddByRSSParse.ts
- packages/mq/src/services/activeMQArtemis/index.ts
- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-08.md

### Session 88 - 2026-02-03

#### Prompt (Developer)

@/Users/mitcheldowney/.cursor/projects/Users-mitcheldowney-repos-pv-pv-code-workspace/terminals/18.txt:810-822

@/Users/mitcheldowney/.cursor/projects/Users-mitcheldowney-repos-pv-pv-code-workspace/terminals/19.txt:1020-1026 the debug logs do not shed more light but browse queues page still shows message count 0

#### Key Decisions

- Ensure local Artemis creates add-by-rss queues explicitly via env config.

#### Files Modified

- infra/config/local/mq.env
- infra/config/env-templates/mq.env.example
- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-08.md

### Session 89 - 2026-02-03

#### Prompt (Developer)

add parser-add-by-rss-ondemand.yaml and parser-add-by-rss-ondemand-background.yaml

#### Key Decisions

- Add add-by-RSS parser deployments with explicit queue args.
- Update add-by-RSS parser command to require -q and support background queue.

#### Files Modified

- apps/workers/src/commands/mq/rss/runAddByRSSParser.ts
- infra/k8s/base/workers/parser-add-by-rss-ondemand.yaml
- infra/k8s/base/workers/parser-add-by-rss-ondemand-background.yaml
- infra/k8s/base/workers/kustomization.yaml
- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-08.md

### Session 90 - 2026-02-03

#### Prompt (Developer)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Add shared add-by-RSS parse status + polling helpers and reuse them across list/detail views.

#### Files Modified

- apps/web/src/utils/addByRSS/actions.ts
- apps/web/src/app/add-by-rss/AddByRSSListClient.tsx
- apps/web/src/app/add-by-rss/podcast/AddByRSSPodcastDetailClient.tsx
- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-08.md
