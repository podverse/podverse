# Subplan 6: Basic Auth for Add-by-RSS Feeds (Optional, Overview)

## Goal

Users can optionally provide HTTP Basic Auth credentials (username and
password) when adding an add-by-RSS feed. Credentials are sent
with **every** request that touches that private feed: feed fetch (parse),
images, chapters, transcripts. UI is optional and **collapsed by default**.

## Execution order

Implement in order: **[06a](06a-basic-auth-schema-orm.md)** → **[06b](06b-basic-auth-api.md)** → **[06c](06c-basic-auth-web.md)**; use **[06d](06d-basic-auth-request-paths.md)** as request-path checklist and security audit.

| File | Focus |
| ---- | ----- |
| [06a](06a-basic-auth-schema-orm.md) | Schema + ORM (new column(s), never expose password) |
| [06b](06b-basic-auth-api.md) | API (accept creds on follow (upsert), use on parse and other requests, never return password) |
| [06c](06c-basic-auth-web.md) | Web: add-feed UI only (optional toggle, collapsed); path: `/add-by-rss/add` |
| [06d](06d-basic-auth-request-paths.md) | Request-path checklist + security |

## Web app paths (for 06c)

- **Add feed only**: `apps/web/src/app/add-by-rss/add/AddByRSSAddFeedPageClient.tsx` — route `/add-by-rss/add`. There is no edit-feed UI; Basic Auth is only provided when adding a feed.

---

## Step 1: Database schema — see 06a

1. **Table**: Add-by-RSS feed relationship is stored in
   `AccountFollowingAddByRSSChannel` (feed_url, title, image_url, account_id).
   See `packages/orm/src/entities/account/accountFollowingAddByRSSChannel.ts`.

2. **New columns** (choose one approach):
   - **Option A**: `basic_auth_username` (varchar, nullable), `basic_auth_password`
     (varchar or text, nullable). Store password encrypted at rest (application-level
     or use DB encryption). Never select password in DTOs that go to the client.
   - **Option B**: Single column `basic_auth_credentials` (encrypted blob or
     text) containing a structured value (e.g. base64 of "user:pass") decrypted
     only when making outbound requests. Never return to client.

3. **Migration**: Add migration to add the new column(s). Use external SQL in
   `infra/database/migrations/` (see [06a](06a-basic-auth-schema-orm.md)). Ensure
   existing rows have NULL; no backfill.

**Audit**: Migration runs cleanly; entity has new fields; no password in logs
or default selects.

---

## Step 2: ORM entity and services — see 06a

1. **Entity**: Update `AccountFollowingAddByRSSChannel` with the new column(s).
   Do not expose password in any toJSON or DTO that is sent to the API
   response. If the ORM returns this entity to the controller, the controller
   (or a serialization layer) must strip password before sending.

2. **Services**: Any service that loads “followed add-by-RSS channels” for
   the API must **exclude** the password column from the response DTO (e.g.
   select only feed_url, title, image_url, basic_auth_username if needed for
   “username saved” indicator; never include basic_auth_password). When the
   backend needs to make an outbound request for a feed (parse, images,
   chapters, transcripts), load the credentials server-side and add the
   Basic Auth header; do not pass credentials to the client.

3. **Follow**: When the user adds an add-by-RSS feed (or the same endpoint is
   called with an existing feed_url, i.e. upsert), the API receives optional
   username/password in the request body; validate and persist. Never echo
   password back in the response. There is no separate edit-feed UI.

**Audit**: GET “my add-by-RSS channels” does not include password. POST/PATCH
with username/password saves them and returns success without password.

---

## Step 3: API – accept and use credentials — see 06b

1. **Follow add-by-RSS**: Endpoint that creates/updates
   AccountFollowingAddByRSSChannel by feed_url (single upsert endpoint; no
   separate edit-feed screen). Accept optional `basic_auth_username` and
   `basic_auth_password` in the body.
   Validate (e.g. if one is set, both required; or allow username-only for
   token-style auth). Persist; do not return password.

2. **Feed parse (and any feed fetch)**: When the API or a worker fetches the
   feed URL (e.g. add-by-RSS parse), load the feed’s stored credentials. If
   present, set the `Authorization: Basic <base64(user:pass)>` header on the
   request. Use the same for any request that hits the feed URL or
   feed-origin URLs (e.g. chapters URL, transcript URL if on same origin).

3. **Images / chapters / transcripts**: If the backend proxies or fetches
   images, chapters, or transcripts for add-by-RSS (e.g. when generating
   response or in a worker), use the stored Basic Auth for that feed when
   making the request. If those are client-side only (add-by-RSS data is
   in IndexedDB and client fetches images directly), then the client cannot
   send server-stored credentials without the server exposing them—so either
   (a) proxy those requests through the API with credentials injected
   server-side, or (b) do not support Basic Auth for client-fetched
   resources until a safe design (e.g. short-lived signed URL) exists.
   Document the choice.

**Audit**: Follow with username/password; trigger parse; verify the outbound
feed request includes Basic Auth (e.g. in logs or with a test server that
checks the header). Response never contains password.

---

## Step 4: Web – add-feed UI only — see 06c

1. **Add feed screen**: Locate the “add add-by-RSS feed” form at
   `apps/web/src/app/add-by-rss/add/AddByRSSAddFeedPageClient.tsx`. Add an
   **optional** section for Basic Auth:
   - **Toggle**: “Use Basic Auth” or “This feed requires username/password”.
   - **Collapsed by default**: The section (username + password fields) is
     hidden until the user turns the toggle on.
   - **Fields**: Username (text), Password (password input). No prefill; never
     show existing password (N/A for add).

2. **Submit**: When submitting follow, include `basic_auth_username` and
   `basic_auth_password` (if provided) in the request body. Clear password
   from client state after successful submit; do not keep in memory longer
   than needed.

**Audit**: Add feed with Basic Auth off → no credentials sent. Add feed with
toggle on and username/password → credentials sent and not echoed back. No
edit-feed capability; credentials are only set when adding a feed.

---

## Step 5: Request paths that must send Basic Auth — see 06d

List every place the system touches the feed or feed-origin URLs:

1. **Feed parse**: API or worker that fetches the feed XML (e.g.
   `apps/api/src/controllers/account/accountAddByRSSParse.ts`, workers that
   run add-by-RSS parse). Load credentials for that feed and set Basic Auth
   header.

2. **Images**: If the backend fetches or proxies images for add-by-RSS (e.g.
   to resize or to avoid CORS), use the feed’s credentials for requests to
   the same origin as the feed. If images are loaded only by the client from
   feed-origin URLs, see Step 3 (proxy or signed URL vs no Basic Auth for
   client fetches).

3. **Chapters / transcript**: If the backend ever fetches chapter or
   transcript URLs for add-by-RSS (e.g. during parse or on-demand), use the
   feed’s credentials. If only the client fetches these (from bundle or
   URLs in IndexedDB), document that Basic Auth may not apply to those
   client requests unless proxied.

**Deliverable**: Checklist of all request paths; each either uses Basic Auth
when credentials exist or documents why not (e.g. client-only fetch).

---

## Security checklist

- [ ] Password stored encrypted or in a way that is not returned in any API
  response.
- [ ] API never returns basic_auth_password; optional username can be returned
  for “saved username” display only.
- [ ] Client does not log or persist password beyond the submit request.
- [ ] Outbound requests that use the feed URL include Basic Auth when
  credentials are stored.

---

## Deliverables checklist

- [ ] Migration adds column(s); ORM entity updated; services exclude password
  from DTOs.
- [ ] API accepts optional username/password on follow (upsert by feed_url); uses credentials
  when making requests for that feed (parse and any proxied/fetched
  resources).
- [ ] Web: add-feed has optional Basic Auth section (toggle, collapsed by
  default, username/password fields). No edit-feed capability.
- [ ] All request paths that touch the feed are updated or documented.

---

## Files reference

| Area       | Path |
| ---------- | ---- |
| Entity     | `packages/orm/src/entities/account/accountFollowingAddByRSSChannel.ts` |
| Migrations | `infra/database/migrations/` (see 06a) |
| API follow/parse | `apps/api/src/controllers/account/` (add-by-RSS follow, parse) |
| Web add feed | `apps/web/src/app/add-by-rss/add/AddByRSSAddFeedPageClient.tsx` |
