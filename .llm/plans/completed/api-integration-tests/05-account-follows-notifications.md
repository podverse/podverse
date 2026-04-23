# 05 — Account Follows and Notifications

## Goal

Integration tests for follow/unfollow operations and notification channel management.

## Routes under test

All routes are under `/api/v1/account/` and require authentication (enforced in controllers).

### Follow/Unfollow

| Method | Path | Notes |
|--------|------|-------|
| POST | `/follow/account` | Follow an account |
| POST | `/unfollow/account` | Unfollow an account |
| POST | `/follow/add-by-rss-channel` | Follow an add-by-RSS channel |
| GET | `/follow/add-by-rss-channel/:account_id_text` | Get followed add-by-RSS channels |
| POST | `/unfollow/add-by-rss-channel` | Unfollow an add-by-RSS channel |
| POST | `/follow/channel` | Follow a channel |
| POST | `/unfollow/channel` | Unfollow a channel |
| POST | `/follow/playlist` | Follow a playlist |
| POST | `/unfollow/playlist` | Unfollow a playlist |

### Add-by-RSS Parse

| Method | Path | Rate Limit | Notes |
|--------|------|------------|-------|
| POST | `/add-by-rss/chapters-transcript` | 1min/30 (IP) | Get chapters/transcript for add-by-RSS |
| POST | `/add-by-rss/parse` | None | Enqueue RSS parse |
| POST | `/add-by-rss/parse/all` | None | Enqueue parse all |
| GET | `/add-by-rss/parse/status/:request_id` | None | Get parse status |

### Notification Channels

| Method | Path | Notes |
|--------|------|-------|
| GET | `/notification/channel/:channel_id_text` | Get notification by account and channel |
| GET | `/notification/channels` | Get all notification channels for account |
| POST | `/notification/channel` | Create notification channel |
| DELETE | `/notification/channel/:channel_id_text` | Delete notification channel |
| POST | `/notification/channel/type` | Create notification channel type |
| DELETE | `/notification/channel/:channel_id_text/type/:type` | Delete notification channel type |

### Account browse (read)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/recent` | Public recent accounts |
| GET | `/top` | Public top accounts |
| GET | `/subscribed/az` | Subscribed accounts A-Z (auth) |
| GET | `/subscribed/recent` | Subscribed accounts recent (auth) |
| GET | `/subscribed/top` | Subscribed accounts top (auth) |

## File

`apps/api/src/test/account-follows-notifications.test.ts`

## Test cases

### Follow/Unfollow Account

- **200 follow account** — authenticated, mocks follow service
- **200 unfollow account** — authenticated, mocks unfollow service
- **401 without auth** for follow and unfollow

### Follow/Unfollow Channel

- **200 follow channel** — authenticated
- **200 unfollow channel** — authenticated
- **401 without auth**

### Follow/Unfollow Playlist

- **200 follow playlist** — authenticated
- **200 unfollow playlist** — authenticated
- **401 without auth**

### Follow/Unfollow Add-by-RSS

- **200 follow add-by-rss-channel** — authenticated, mocks service
- **200 get followed channels** — authenticated
- **200 unfollow add-by-rss-channel** — authenticated
- **401 without auth**

### Add-by-RSS Parse

- **200 parse** — authenticated, mocks MQ publish
- **200 parse all** — authenticated, mocks MQ publish
- **200 get status** — authenticated, mocks status check
- **200 chapters-transcript** — mocks parser
- **429 when chapters-transcript rate limited**

### Notification Channels

- **200 get channels** — authenticated, returns array
- **200 create channel** — authenticated, mocks creation
- **200 delete channel** — authenticated, mocks deletion
- **200 create channel type** — authenticated
- **200 delete channel type** — authenticated
- **401 without auth** for all operations

### Account browse (read)

- **200 recent** — public, returns array
- **200 top** — public, returns array
- **200 subscribed/az** — authenticated
- **200 subscribed/recent** — authenticated
- **200 subscribed/top** — authenticated

## Mocking strategy

- Mock follow services, notification services, MQ service, and parser from `@podverse/orm`
- Use shared helpers

## Verification

```bash
./scripts/nix/with-env npm run test -w apps/api -- src/test/account-follows-notifications.test.ts
```
