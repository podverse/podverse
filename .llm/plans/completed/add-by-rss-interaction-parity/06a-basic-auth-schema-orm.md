# 06a: Basic Auth for Add-by-RSS – Schema and ORM

## Goal

Add optional HTTP Basic Auth credential storage for add-by-RSS feeds. New
column(s) on the follow table; ORM entity updated; **password never exposed** in
DTOs or API responses.

**Parent**: [06-basic-auth.md](06-basic-auth.md). Follow with [06b](06b-basic-auth-api.md), [06c](06c-basic-auth-web.md), [06d](06d-basic-auth-request-paths.md).

---

## Step 1: Database schema

1. **Table**: Add-by-RSS follow is stored in
   `AccountFollowingAddByRSSChannel` (feed_url, title, image_url, account_id).
   Entity: `packages/orm/src/entities/account/accountFollowingAddByRSSChannel.ts`.

2. **New columns** (choose one):
   - **Option A**: `basic_auth_username` (varchar, nullable),
     `basic_auth_password` (varchar or text, nullable). Store plaintext and
     rely on DB encryption at rest and access control; or add application-level
     encryption later via [06a1](06a1-basic-auth-credential-encryption.md).
     Never select password in DTOs that go to the client.
   - **Option B**: Single column `basic_auth_credentials` (encrypted blob/text)
     containing structured value (e.g. base64 of "user:pass"); decrypted only
     when making outbound requests. Never return to client.

3. **Migration**: Schema changes use **external SQL files** in
   `infra/database/migrations/`. Add a new migration file (e.g.
   `0013_add_by_rss_basic_auth.sql`) with `ALTER TABLE
   account_following_add_by_rss_channel ADD COLUMN ...` for the new column(s).
   Follow the table/type style from
   [0006_account_following_tables.sql](../../../infra/database/migrations/0006_account_following_tables.sql)
   (`varchar_url`, `varchar_normal`). Existing rows have NULL; no backfill.

**Audit**: Migration runs cleanly; entity has new fields; no password in logs
or default selects.

---

## Step 2: ORM entity and services

1. **Entity**: Update `AccountFollowingAddByRSSChannel` with new column(s). Do
   not expose password in toJSON or any DTO sent to the API. If the ORM returns
   this entity to the controller, the controller (or serialization layer) must
   strip password before sending.

2. **Services**: Any service that loads “followed add-by-RSS channels” for the
   API must **exclude** the password column from the response DTO (e.g. select
   only feed_url, title, image_url, basic_auth_username if needed for “username
   saved” indicator; never include basic_auth_password). Add a **dedicated**
   server-only method `getCredentialsForFeed(accountId, feedUrl)` on
   `AccountFollowingAddByRSSChannelService` that returns `{ username, password }`
   (or null if none stored); used only by server-side callers (e.g. worker) when
   making outbound feed requests. Do not pass credentials to the client.
   **Callers use the result only when non-null**: add the Basic Auth header only
   when the account has stored credentials for that feed; if
   `getCredentialsForFeed` returns null, do not set Basic Auth.

3. **Follow (upsert)**: When the user adds an add-by-RSS feed, the API receives
   optional username/password in the request body; validate and persist. The
   same endpoint upserts by feed_url (no separate edit-feed UI). Never echo
   password back in the response.

**Audit**: GET “my add-by-RSS channels” does not include password. POST/PATCH
with username/password saves them and returns success without password.

---

## Deliverables checklist

- [ ] Migration adds column(s) in `infra/database/migrations/`; ORM entity
  updated.
- [ ] `getFollowedAddByRSSChannels` excludes password from select/DTO.
- [ ] `getCredentialsForFeed(accountId, feedUrl)` added; returns credentials
  only for server-side outbound feed requests.
- [ ] No password in logs or default selects.

---

## Files reference

| Area       | Path |
| ---------- | ---- |
| Entity     | `packages/orm/src/entities/account/accountFollowingAddByRSSChannel.ts` |
| Service    | `packages/orm/src/services/account/accountFollowingAddByRSSChannel.ts` |
| Migrations | `infra/database/migrations/` (e.g. `0013_add_by_rss_basic_auth.sql`) |
