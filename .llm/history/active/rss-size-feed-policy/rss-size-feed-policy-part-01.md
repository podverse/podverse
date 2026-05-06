### Session 1 - 2026-05-05

#### Prompt (Developer)

RSS response size + feed-level overrides

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Implement the attached plan end-to-end across podverse and partytime.
- Start with shared env-driven max response size and then move through parser, ORM, API, web, admin, and tests.
- Adopt split feed policy model now (conditions + effective policy tables) while keeping legacy flag status compatibility.
- Ensure parser always persists feed rows by podcast_index_id attempts and creates/retains minimal channel rows with best-effort Podcast Index title enrichment.
- Use `feed_policy` for blocked-feed UX decisions (podcast-index banner, channel-page redirect) and for public-listing visibility filters.

#### Files Modified

- .llm/history/active/rss-size-feed-policy/rss-size-feed-policy-part-01.md
- apps/workers/.env.example
- apps/workers/ENV.md
- apps/workers/src/lib/startup/validation.ts
- apps/api/src/controllers/channel.ts
- apps/management-api/src/lib/database/tablePolicy.ts
- apps/management-api/src/lib/feed/feedFlagStatusAppDb.ts
- apps/management-api/src/routes/feedFlagStatus.ts
- apps/management-web/src/app/(management)/feed-operations/flag-status/FlagStatusPageClient.tsx
- apps/management-web/src/lib/requests/feedFlagStatus.ts
- apps/web/src/app/album/[channel_id]/page.tsx
- apps/web/src/app/podcast/[channel_id]/page.tsx
- apps/web/src/app/podcast-index/feed/[podcast_index_id]/page.tsx
- apps/web/src/app/podcast-index/feed/[podcast_index_id]/PodcastIndexFeedClient.tsx
- infra/k8s/base/workers/source/workers.env
- infra/k8s/base/ops/source/database/linear-migrations/app/0024_feed_policy_split.sql
- infra/k8s/base/db/source/bootstrap/0003a_app_linear_baseline.sql.gz
- packages/helpers/src/index.ts
- packages/helpers/src/lib/parserMaxFeedBodyBytes.ts
- packages/helpers/src/lib/parserMaxFeedBodyBytes.test.ts
- packages/helpers/src/dtos/feed/feed.ts
- packages/helpers/src/dtos/feed/feedPolicy.ts
- packages/helpers/src/dtos/index.ts
- packages/helpers-requests/src/\_requestOutbound.ts
- packages/helpers-requests/src/requestOutbound.test.ts
- packages/orm/src/db/entities.ts
- packages/orm/src/entities/feed/feed.ts
- packages/orm/src/entities/feed/feedCondition.ts
- packages/orm/src/entities/feed/feedConditionType.ts
- packages/orm/src/entities/feed/feedPolicy.ts
- packages/orm/src/entities/feed/feedPolicyOverride.ts
- packages/orm/src/index.ts
- packages/orm/src/lib/feedFlagHelpers.ts
- packages/orm/src/services/account/accountFollowingChannel.ts
- packages/orm/src/services/channel/channel.ts
- packages/orm/src/services/clip.ts
- packages/orm/src/services/feed/feed.ts
- packages/orm/src/services/feed/feedPolicy.ts
- packages/orm/src/services/item/item.ts
- packages/parser/package.json
- packages/parser/src/lib/\_request.ts
- packages/parser/src/lib/rss/addByRSS.ts
- packages/parser/src/lib/rss/feed/feed.ts
- packages/parser/src/lib/rss/parser.ts
- packages/parser/src/lib/rss/parser.getAndParseRSSFeed.test.ts
- packages/parser/src/lib/rss/parser.noopLockLoser.test.ts
- ../partytime/src/config.ts
- ../partytime/README.md
