# 11 — External Services, Meta, and Miscellaneous Routes

## Goal

Integration tests for external services, feed, medium-value, membership, membership claim tokens, stats (already tested but verify coverage), metaboost, and message queue routes.

## Routes under test

### ExternalServices (`/api/v1/external-services`)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/podcast-index/feed/:podcast_index_id` | Podcast by PodcastIndex ID |
| GET | `/podcast-index/search/podcasts` | Search podcasts via PodcastIndex |

### Feed (`/api/v1/feed`)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/:podcast_index_id` | Get feed by PodcastIndex ID |

### Medium-value (`/api/v1/medium-value`)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/` | Get all medium values |

### Membership (`/api/v1/membership`)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/pricing` | Get membership pricing |

### MembershipClaimToken (`/api/v1/membership-claim-token`)

| Method | Path | Notes |
|--------|------|-------|
| POST | `/claim/:token` | Claim a membership token |

### Stats (`/api/v1/stats`) — already partially tested

| Method | Path | Notes |
|--------|------|-------|
| POST | `/account` | Already in `stats.track.test.ts` |
| POST | `/channel` | Already in `stats.track.test.ts` |
| POST | `/clip` | Already in `stats.track.test.ts` |
| POST | `/item` | Already in `stats.track.test.ts` |
| POST | `/playlist` | Already in `stats.track.test.ts` |

### Metaboost (`/api/v1/metaboost`)

| Method | Path | Auth | Rate Limit | Notes |
|--------|------|------|------------|-------|
| GET | `/mbrss-v1/mint-app-assertion/rate-limit-status` | None | None | Check rate limit status |
| POST | `/mbrss-v1/mint-app-assertion` | Required | Custom middleware | Mint app assertion |

### MQ (`/api/v1/mq`)

| Method | Path | Notes |
|--------|------|-------|
| POST | `/rss/add/on-demand` | Add RSS to on-demand queue |
| POST | `/rss/refresh/on-demand` | Refresh RSS on-demand queue |

## File

`apps/api/src/test/external-services-and-meta.test.ts`

## Test cases

### ExternalServices

- **200 /podcast-index/feed/:id** — mocks PodcastIndex service, returns podcast data
- **200 /podcast-index/search/podcasts** — mocks search, with query param `q`, returns results array
- **500 when PodcastIndex service fails** — mocks error

### Feed

- **200 /feed/:id** — mocks feed service, returns feed data
- **404 when feed not found**

### Medium-value

- **200 /medium-value/** — returns array of medium values

### Membership

- **200 /membership/pricing** — returns pricing object with `monthly`, `annually` fields

### MembershipClaimToken

- **200 /claim/:token** — mocks claim service with valid token
- **400 with invalid token** — mocks claim service to throw
- **404 with expired/used token**

### Metaboost

- **200 /rate-limit-status** — returns rate limit status object
- **200 POST /mint-app-assertion** — authenticated + custom rate limit, mocks minting service
- **401 without auth** for POST
- **429 when rate limit exceeded** — tests the custom rate limit middleware

### MQ

- **200 /rss/add/on-demand** — mocks MQ publish, verifies message enqueued
- **200 /rss/refresh/on-demand** — mocks MQ publish
- **500 when MQ service fails** — mocks error

## Mocking strategy

- Mock PodcastIndex service, membership services, metaboost services, and MQ service from their respective packages
- Stats routes already covered by existing `stats.track.test.ts` — no new tests needed

## Verification

```bash
./scripts/nix/with-env npm run test -w apps/api -- src/test/external-services-and-meta.test.ts
```
