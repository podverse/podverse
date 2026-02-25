# 06b: Basic Auth for Add-by-RSS – API

## Goal

API accepts optional Basic Auth credentials on follow (upsert by feed_url); uses
stored credentials when making requests for that feed (parse and any
proxied/fetched resources). Never returns password.

**Parent**: [06-basic-auth.md](06-basic-auth.md). Depends on [06a](06a-basic-auth-schema-orm.md). Follow with [06c](06c-basic-auth-web.md), [06d](06d-basic-auth-request-paths.md).

---

## Step 1: Follow (upsert) add-by-RSS

- Endpoint that creates/updates `AccountFollowingAddByRSSChannel` by feed_url
  (single upsert; no separate edit-feed screen). Accept optional
  `basic_auth_username` and `basic_auth_password` in the body. Validate (e.g. if
  one is set, both required; or allow username-only for token-style auth).
  Persist; do not return password.

---

## Step 2: Feed parse and feed fetch

- When the API or a worker fetches the feed URL (add-by-RSS parse), load the
  feed’s stored credentials via `getCredentialsForFeed(accountId, feedUrl)`.
  **Use stored credentials only when the account has saved credentials for that
  feed**: if `getCredentialsForFeed` returns null, do not set Basic Auth. When
  non-null, set `Authorization: Basic <base64(user:pass)>` on the request. Same
  for any request that hits the feed URL or feed-origin URLs (e.g. chapters URL,
  transcript URL if same origin).

---

## Step 3: Images / chapters / transcripts

- If the backend proxies or fetches images, chapters, or transcripts for
  add-by-RSS, use the stored Basic Auth for that feed when making the request.
- If those are client-side only (add-by-RSS data in IndexedDB, client fetches
  directly), the client cannot send server-stored credentials without the server
  exposing them—so either (a) proxy those requests through the API with
  credentials injected server-side, or (b) do not support Basic Auth for
  client-fetched resources until a safe design (e.g. short-lived signed URL)
  exists. Document the choice.

**Audit**: Follow with username/password; trigger parse; verify outbound feed
request includes Basic Auth. Response never contains password.

---

## Deliverables checklist

- [ ] API accepts optional username/password on follow (upsert by feed_url);
  persists; never returns password.
- [ ] Feed parse (and any backend feed fetch) uses stored credentials for
  Authorization header.
- [ ] Images/chapters/transcripts: either proxied with credentials or design
  documented.

---

## Files reference

| Area            | Path |
| --------------- | ---- |
| Follow (upsert) | `apps/api/src/controllers/account/accountFollowingAddByRSSChannel.ts` — `addOrUpdateRSSChannel`; route `POST /follow/add-by-rss-channel` |
| Parse           | `apps/api/src/controllers/account/accountAddByRSSParse.ts` |
| Chapters/transcript | `apps/api/src/controllers/account/accountAddByRSSChaptersTranscript.ts`; fetch libs: `apps/api/src/lib/chapters.ts`, `apps/api/src/lib/transcript.ts` |
