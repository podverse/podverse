# 06d: Basic Auth for Add-by-RSS – Request Paths and Security

## Goal

Checklist of every request path that touches the feed or feed-origin URLs;
each either uses Basic Auth when credentials exist or is documented why not.
Security checklist for credentials handling.

**Parent**: [06-basic-auth.md](06-basic-auth.md). Implement after [06a](06a-basic-auth-schema-orm.md)–[06c](06c-basic-auth-web.md).

---

## Request paths that must send Basic Auth

1. **Feed parse**: API or worker that fetches the feed XML (e.g.
   `apps/api/src/controllers/account/accountAddByRSSParse.ts`, workers that
   run add-by-RSS parse). Load credentials for that feed; set Basic Auth
   header on the request.

2. **Images**: If the backend fetches or proxies images for add-by-RSS (e.g. to
   resize or avoid CORS), use the feed’s credentials for requests to the same
   origin as the feed. If images are loaded only by the client from feed-origin
   URLs, see 06b: proxy with credentials or document that Basic Auth does not
   apply to client fetches until a safe design exists.

3. **Chapters / transcript**: If the backend ever fetches chapter or
   transcript URLs for add-by-RSS (e.g. during parse or on-demand), use the
   feed’s credentials. If only the client fetches these (from bundle or URLs in
   IndexedDB), document that Basic Auth may not apply to those client requests
   unless proxied.

**Credentials usage**: Use `getCredentialsForFeed(accountId, feedUrl)` only when
the account may have stored credentials for that feed. Add the Basic Auth
header only when the result is non-null; if null, do not set Basic Auth.

**Deliverable**: Checklist of all request paths; each either uses Basic Auth
when credentials exist or documents why not (e.g. client-only fetch).

---

## Files to update

| Path | Purpose |
| ---- | ------- |
| `apps/api/src/controllers/account/accountAddByRSSParse.ts` | Feed parse: load credentials for feed, set Basic Auth when non-null |
| Workers that run add-by-RSS parse | Identify the worker command(s) that consume the add-by-RSS parse queue (e.g. in `apps/workers` or the parser consumer). There, call `getCredentialsForFeed(accountId, feedUrl)` for the feed being parsed and set Basic Auth on the request when non-null. |
| `apps/api/src/controllers/account/accountAddByRSSChaptersTranscript.ts` | Chapters/transcript fetch: use credentials for feed-origin URLs when non-null |
| `apps/api/src/lib/chapters.ts`, `apps/api/src/lib/transcript.ts` | HTTP fetch helpers: accept optional Basic Auth (or credentials) for requests |
| Images | Document: if backend proxies add-by-RSS images, use feed credentials; if client-only, document that Basic Auth does not apply |

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

- [ ] All request paths that touch the feed are updated or documented.
- [ ] Security checklist satisfied and audited.
