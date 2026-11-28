# Won't do

The operator closed https://github.com/podverse/podverse/issues/415 with no product change.
Do not implement this plan. Rate-limit counters stay in process memory. The API and the
web app each run as one pod, so a shared Valkey store does not change the limit. The API
still trusts one proxy hop in production. The image proxy still reads the first
X-Forwarded-For value.

# HTTP rate limits share one counter

**Cursor model:** Opus 5.5 · **Reasoning:** high

## Status

Won't do. Closed on 2026-11-27 as not planned. Do not implement.

## Issue

https://github.com/podverse/podverse/issues/415

## Rows

- **R1** Rate-limit counters are shared across processes and keyed on the address the trusted proxy appended.

## Runs after

none

Finish 420 first if both are in progress. They both edit API middleware.

## Operator questions

Ask these in the chat and stop the turn before any product edit. If this step is under
plan-runner, report `RUNNER-STATUS: BLOCKED` with the same questions. Do not guess a hop
count. The production code today sets `trust proxy` to `1` with an open note. That is
not an answer.

1. In production, how many proxies append to `X-Forwarded-For` in front of the public API?
2. Is the management API behind that same chain? If not, what is its count?
3. Is the web app (image proxy) behind that same chain? If not, what is its count?

A count of zero means nothing in front appends the header, and the socket address is the
client. When the operator answers, store those counts in env. Do not put a default in
`config/index.ts`. Follow **startup-validation-env-order**, **env-file-formatting**, and
**env-defaults-match-code**. Production startup fails when the count is missing. Local
dev does not trust forwarding headers.

Alpha's ingress, as far as `k.podcastdj.com` shows, is one Traefik ingress
(`ingressClassName: traefik` in `apps/podverse-alpha/common/ingress-hosts-patch.yaml`)
for `api-alpha.podcastdj.com`, `alpha.podcastdj.com`, `management-api.alpha.podcastdj.com`,
and `management.alpha.podcastdj.com`. Ask whether anything else appends
`X-Forwarded-For` in front of Traefik. Do not treat "one Traefik" as the answer.

## Alpha GitOps (k.podcastdj.com)

This change does not start on alpha until the env lands in the same promotion as the
image and `?ref=` bump. Missing keys crash the process. No logout and no migration.
Existing sessions stay valid.

Write the hop-count key the code adds into:

- `apps/podverse-alpha/api/source/api.env`
- `apps/podverse-alpha/web/source/web.env`
- `apps/podverse-alpha/management-api/source/management-api.env` only if management API
  starts setting `trust proxy` from that key. It has no rate limiter today. Do not add
  KeyValDB to it just to share a counter that does not exist.

The API already has `KEYVALDB_HOST=podverse-keyvaldb` and mounts
`podverse-keyvaldb-opaque`. Web does not. The image-proxy counter moves to that same
Valkey, so the monorepo web deployment must mount `podverse-keyvaldb-opaque` the way
`infra/k8s/base/api/deployment.yaml` does. The password stays in that secret. Do not copy
it into git. Alpha `web.env` then needs `KEYVALDB_HOST` and `KEYVALDB_PORT` only
(`podverse-keyvaldb` and `6379`, matching the API file).

Name these files in the final message so the k.podcastdj.com edit is a checklist, not
a guess. Do not edit the k.podcastdj.com repo from this plan.

## Files

- `apps/api/src/lib/rateLimiter.ts`
- `apps/api/src/app.ts`
- `apps/api/src/config/index.ts` and `apps/api/src/lib/startup/validation.ts`
- The API env template and the k8s env source that already holds API rate-limit knobs
- `apps/management-api/src/app.ts` only if it starts reading the hop count for `trust proxy`. It has no rate limiter today
- `infra/k8s/base/web/deployment.yaml` to mount `podverse-keyvaldb-opaque`
- `apps/web/src/utils/proxy/rateLimiter.ts`
- `apps/web/src/utils/proxy/clientIpFromProxyHeaders.ts`
- Web env template and validation for the hop count
- Tests beside the rate limiter and the proxy IP helper

Do not retune `windowMs` or `max`. Do not add a new database.

## Tests

- Two limiter instances with one Valkey store share a counter. Use the test Valkey, or a
  fake store that implements the same `Store` methods, if the unit test cannot reach
  Valkey. An integration test is enough if the unit seam is thin.
- A request whose first `X-Forwarded-For` value is an address the caller chose does not
  become the key when the trusted hop is further right.
- With no trusted hop configured (local), the forwarding header is ignored.
- Existing login limit behavior stays: too many attempts from one address still end in
  429. Point the auth test at the shared store so it does not keep a private memory store.

## Release scratchpad

Append, with the hop counts the operator gave:

```markdown
## Rate limits count once across processes

- Surfaces: api, management-api, web, k8s
- Change: HTTP rate limits use Valkey. The client address is the one the trusted proxy
  appended. A forwarding header the client sends does not choose the key.
- Who notices: a client that stayed under the limit on each process separately can now
  receive 429 at the configured maximum.
- Operator steps: in k.podcastdj.com, set the hop-count key on the API and web env files
  in the same promotion as the image bump. Add KeyValDB host and port to web env, and
  mount the existing keyval secret on web. No code default. Production startup fails
  when the hop count is missing. No logout.
```

## Work

`express-rate-limit` in `apps/api/src/lib/rateLimiter.ts` uses its default memory store,
except one address limiter that builds its own `MemoryStore`. The web image proxy uses a
`Map` in `rateLimiter.ts` and `getClientIpFromProxyHeaders`, which returns the first
forwarded address.

Move every one of those counters to the Valkey the API already uses (`ioredis` in
`apps/api/src/lib/keyvaldb/keyvaldb.ts`). Management API and web use that same store if
they already have the connection. If they do not, add the connection through the existing
env names. Do not invent a second cache.

Key the address with `ipKeyGenerator` on the trusted hop only. Express `trust proxy` must
match the count the operator gave, on the API and the management API. Delete the open
note once the count is the operator's number rather than a guess.

The image proxy stops reading a client-supplied first hop. It uses the same hop rule.

Per-route windows and maximums stay. Webhook limiters stay per processor scope. They
share the store. They do not share a budget across processors.

## Ticket reply

Save as `proposed-reply.md`. Do not post it. After the change is on `develop`, post it
and close issue 415.

```text
HTTP rate limits now share one counter across processes, stored in Valkey. The address
they count is the one the trusted proxy appended, not a forwarding header the client
set. The per-route limits are the same numbers as before. A client that was under the
limit on each process separately can now hit that limit for real. Production needs the
trusted hop count set, or the process will not start.
```

## Done

Search issue 415 again before the first product edit, which is after the operator
answers. Do not run tests. Do not commit. Do not comment on or close the issue. Append
the scratchpad entry. Write `proposed-reply.md`, move this directory to
`.llm/plans/completed/415-shared-rate-limits/`, and give the operator the verification
commands from COPY-PASTA plus fish-safe git commands. The close recommendation is only
for after `develop`. Remind them to push the GitOps env change with the app change.
