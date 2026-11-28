# API reference pages do not load a third-party script

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

## Issue

https://github.com/podverse/podverse/issues/418

## Rows

- **R1** Swagger UI is served from this build, and management docs are not anonymous on a deployed server.

## Runs after

none

## Operator questions

Ask these in the chat and stop the turn before any product edit. If this step is under
plan-runner, report `RUNNER-STATUS: BLOCKED` with the same questions. Do not pick the
answer yourself.

1. Should the public API keep serving `/docs` and `/docs.yaml` with no session? The
   recommendation is yes: the public spec stays anonymous, and only the script source
   changes. Management docs do not stay anonymous.

Wait for the answer. Then implement that answer. If the operator rejects the
recommendation, the public API uses the same session rule as management.

## Alpha GitOps (k.podcastdj.com)

No new env key and no logout. Swagger UI ships inside the API and management API images.
Alpha serves them at `api-alpha.podcastdj.com` and `management-api.alpha.podcastdj.com`
through the existing Traefik ingress. After the image bump, management docs on that host
require a management session. The public spec stays anonymous only if the operator said
so above. No file under `apps/podverse-alpha/` needs an edit.

## Files

- `apps/api/src/lib/docs/registerSwaggerDocs.ts`
- `apps/api/src/lib/docs/registerSwaggerDocs.test.ts`
- `apps/management-api/src/lib/docs/registerSwaggerDocs.ts`
- A management API test beside the existing docs or auth tests
- The `swagger-ui-dist` dependency, if it is not already a direct dependency, and the
  static serving path that replaces `unpkg.com`

Do not add a CDN URL.

## Tests

- The docs HTML contains no `unpkg.com` URL.
- Deployed management API: `/docs` and `/docs.yaml` without a management session are 401.
  With a session they render. "Deployed" means the production config the app already uses
  for other management-only routes. Local dev may keep docs open if that is how other
  management routes work today. Match that split. Do not invent a second environment flag.
- If the operator said the public API spec stays anonymous, the public API test shows
  `/docs.yaml` still returns 200 without a session, and the HTML has no third-party script.
- If the operator said the public API requires a session, mirror the management 401 test.

## Release scratchpad

If the public spec stays anonymous, append:

```markdown
## API reference no longer loads a third-party script

- Surfaces: api, management-api
- Change: Swagger UI is served from this build. Management API docs require a management
  session on a deployed server. The public API spec stays readable without a session.
- Who notices: anyone who opened the management API docs without signing in. Public API
  readers still can.
- Operator steps: none
```

If the public spec requires a session, say that in the entry instead of "stays readable".

## Work

Both apps' `registerSwaggerDocs` functions serve `/docs` and `/docs.yaml` with no auth.
The HTML loads CSS and JS from `https://unpkg.com/swagger-ui-dist@5/`.

Replace those URLs with files from the `swagger-ui-dist` package served by this process.
Keep the page working: it still loads the local OpenAPI document.

Management session check uses the management API's existing session middleware. Do not
build a second login.

The public API behavior is whatever the operator answered.

## Ticket reply

Save as `proposed-reply.md`. Do not post it. After the change is on `develop`, post it
and close issue 418. Use the paragraph that matches the answer.

Public spec stays anonymous:

```text
The API reference pages now load their UI from this build instead of a third-party
script host. Management API docs on a deployed server require a management session.
The public API spec is still readable without signing in.
```

Public spec requires a session:

```text
The API reference pages now load their UI from this build instead of a third-party
script host. On a deployed server, both the public API docs and the management API
docs require a session.
```

## Done

Search issue 418 again before the first product edit, which is after the operator
answers. Do not run tests. Do not commit. Do not comment on or close the issue. Append
the scratchpad entry that matches the answer. Write `proposed-reply.md`, move this
directory to `.llm/plans/completed/418-api-docs-exposure/`, and give the operator the
verification commands from COPY-PASTA plus fish-safe git commands. The close
recommendation is only for after `develop`.
