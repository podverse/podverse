# Add by RSS - API Enqueue + Progress (Overview)

## Goal

Expose API endpoints that enqueue Add by RSS parsing through MQ and provide progress/results
to the client without parsing directly in the API.

## Scope

- New API endpoints for enqueue and result retrieval.
- Progress status tracking per feed request.
- No direct parsing in API.

## Key Files

- Account routes:
  [apps/api/src/routes/account.ts](/Users/mitcheldowney/repos/pv/podverse/apps/api/src/routes/account.ts)
- Account controllers:
  [apps/api/src/controllers/account/](/Users/mitcheldowney/repos/pv/podverse/apps/api/src/controllers/account/)
- Add by RSS follow list:
  [packages/orm/src/services/account/accountFollowingAddByRSSChannel.ts](/Users/mitcheldowney/repos/pv/podverse/packages/orm/src/services/account/accountFollowingAddByRSSChannel.ts)

## Subplans

- API endpoints:
  [31-api-endpoints.md](/Users/mitcheldowney/repos/pv/podverse/.llm/plans/active/add-by-rss/31-api-endpoints.md)
- Progress and result tracking:
  [32-api-progress-and-results.md](/Users/mitcheldowney/repos/pv/podverse/.llm/plans/active/add-by-rss/32-api-progress-and-results.md)
- API guardrails (MQ-only parsing):
  [33-api-mq-only-guardrails.md](/Users/mitcheldowney/repos/pv/podverse/.llm/plans/active/add-by-rss/33-api-mq-only-guardrails.md)

## Decisions to Make Later

- Where progress/results are stored temporarily (short-lived store vs. in-memory vs. existing
  mechanism).
- Polling vs. long-polling vs. existing real-time channel support in web app.
