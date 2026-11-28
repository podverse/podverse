# Cookie-authenticated writes require a same-site header

**Cursor model:** Opus 5.5 · **Reasoning:** high

## Issue

https://github.com/podverse/podverse/issues/420

## Rows

- **R1** A state-changing request authenticated by the session cookie includes a header browsers do not attach on a cross-site form post.

## Runs after

none

## Review before running

No operator question. Settled:

- Header name: `X-Podverse-Request-Intent`. Value: `same-origin`. One constant in
  `@podverse/helpers`, used by the API, the management API, and the HTTP client.
- The check applies only when the session cookie is what authenticated the request and
  the method is `POST`, `PUT`, `PATCH`, or `DELETE`.
- Bearer tokens and API keys do not need the header. Mobile stays unchanged.
- Login and other routes that do not yet have a session cookie do not need the header.
- `GET` and `HEAD` do not need the header. EventSource stays as it is.
- Missing or wrong header on a cookie write is 403 with the API's usual structural
  English message. Do not start the handler.

## Alpha GitOps (k.podcastdj.com)

No new env key and no logout. Alpha cookie writes keep working only when the API,
management API, web, and management web images that contain this header ship in one
promotion. Bump `?ref=` and the image tags together in:

- `apps/podverse-alpha/api/kustomization.yaml`
- `apps/podverse-alpha/management-api/kustomization.yaml`
- `apps/podverse-alpha/web/kustomization.yaml`
- `apps/podverse-alpha/management-web/kustomization.yaml`

Do not roll the API ahead of web. An old cached page fails its cookie write until
refresh. The two internal users do not need a forced logout or a migration. Existing
sessions stay valid. CORS origins in `apps/podverse-alpha/api/source/api.env` and
`apps/podverse-alpha/management-api/source/management-api.env` already name the alpha
hosts. Do not add a host unless a preflight test shows the new header is stripped.

## Files

- `packages/helpers/src/lib/` a small module for the header name and value, plus its test
- `packages/http-request-core/src/request.ts`
- `packages/http-request-core/src/request.test.ts`
- `apps/api/src/lib/auth/index.ts` or the middleware that already knows the token source
  is `cookie`
- `apps/management-api/src/lib/auth/index.ts` the same way
- API and management API integration tests next to the existing auth tests
- Any raw `fetch` in `apps/web` or `apps/management-web` that sends a cookie on an unsafe
  method. The shared client covers `withCredentials: true` call sites. Search before
  assuming there are none.

## Tests

- `@podverse/http-request-core`: an unsafe method with `withCredentials: true` sends the
  header. A GET does not have to. A request without credentials does not.
- API integration: cookie `POST` without the header is 403 and does not apply the write.
  The same `POST` with the header succeeds. A bearer `POST` without the header succeeds.
- The same three cases on the management API if it authenticates writes with a cookie.
- No Playwright spec unless a raw browser fetch was updated and has no unit seam. Prefer
  the integration test.

## Release scratchpad

Append:

```markdown
## Cookie writes send a same-origin header

- Surfaces: api, management-api, web, management-web
- Change: a state-changing request authenticated by the session cookie must send
  `X-Podverse-Request-Intent: same-origin`. Bearer and API key calls are unchanged.
- Who notices: a web client that posts with only the cookie is rejected until it sends
  the header. Deploy the API, management API, web, and management web together.
- Operator steps: bump those four alpha overlays in k.podcastdj.com in one promotion.
  No new env key. No logout.
```

## Work

`readRequestToken` in `apps/api/src/lib/auth/sessionTokens.ts` already distinguishes
`cookie` from `bearer` and `api_key`. Put the check where that source is known, before
the route handler runs. Mirror it on the management API. Do not require the header on
routes that are public.

In `packages/http-request-core/src/request.ts`, when the caller set credentials and the
method is unsafe, set the header. Do not override a caller who already set it.

Confirm the CORS preflight still allows the header. The API uses the `cors` package with
an origin list and `credentials: true`. If `allowedHeaders` is unset, a preflight that
names this header must still succeed. Add a test if the current config would strip it.

Do not add a token stored in a second cookie. This header is the control.

## Ticket reply

Save as `proposed-reply.md`. Do not post it. After the change is on `develop`, post it
and close issue 420.

```text
A state-changing request that is signed in through the session cookie now has to send
the X-Podverse-Request-Intent header. Browser form posts from another site do not send
that header. Sign-in with a bearer token or an API key is unchanged, and mobile is
unchanged. Deploy the API and the web app together so cookie writes keep working.
```

## Done

Search issue 420 again before the first edit. Do not run tests. Do not commit. Do not
comment on or close the issue. Append the scratchpad entry. Write `proposed-reply.md`,
move this directory to `.llm/plans/completed/420-cookie-write-header/`, and give the
operator the verification commands from COPY-PASTA plus fish-safe git commands. The
close recommendation is only for after `develop`.
