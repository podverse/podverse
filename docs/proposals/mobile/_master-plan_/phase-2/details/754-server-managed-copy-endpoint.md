# 754-server-managed-copy-endpoint

**Master step:** P2.1.12
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

An API endpoint that serves product copy as markdown, and the first two documents on it: the clip
FAQ and the Make Clip how-to.

### Why the API and not the i18n catalog

Most copy belongs in `packages/i18n-catalog` — it ships with the app, it is translated with
everything else, and it costs nothing to read. Some copy cannot live there. An FAQ answer, a how-to,
the terms of service, and the popularity-tracking agreement all describe **how the service behaves**,
which is a server-side fact that can change while an installed app stays on the version the user
downloaded months ago. Copy in the catalog is frozen at build time, and mobile release cycles run
through two app stores; a policy correction cannot wait for that.

So the test is: **would this text need to change when the server changes, without an app release?**
If yes, it is served. If no, it is a catalog key. The popularity-tracking agreement already works
this way; this generalizes the mechanism instead of building a second one. The policy becomes
abcmemory in [755](755-mobile-faq-and-clip-how-to.md) so the next author does not have to rediscover
it.

### The endpoint

`GET {prefix}{version}/managed-copy/:slug` — public, unauthenticated, with a slug allowlist:

| Slug          | Content                    |
| ------------- | -------------------------- |
| `faq`         | Frequently asked questions |
| `clip-how-to` | How to make a clip         |

One endpoint with an allowlist rather than a route per document, so the next document is a markdown
file and an entry in a list. The allowlist is the point: a slug parameter that reaches the filesystem
without one is a path-traversal invitation. The slug type is exported from `@podverse/helpers` so
clients cannot ask for a document that does not exist.

Unauthenticated because an FAQ has to answer questions for someone who has not signed up yet. The
popularity-tracking endpoint requires auth because the agreement is bound to an account's locale
setting; these documents resolve locale from the request instead.

Response is `DTOManagedCopy`:

```typescript
export type DTOManagedCopy = {
  slug: ManagedCopySlug;
  locale: string;
  updated_at: string;
  markdown: string;
};
```

`updated_at` is a per-slug constant in the loader, bumped by whoever edits the markdown. A file mtime
would be wrong inside a container image, and an env var per document does not scale past two.

### Content files

`apps/api/managed-copy/<slug>/<locale>.md` for `en-US`, `es`, `fr`, and `el-GR`, mirroring
`apps/api/legal/popularity-tracking/`. Directory resolution mirrors
[popularityTrackingContent.ts](/apps/api/src/lib/legal/popularityTrackingContent.ts): an optional env
override, then the path bundled beside the compiled module, then the repo path. `{brand_name}` is
interpolated from config, so a rebranded deployment does not ship someone else's product name in its
FAQ.

`apps/api/Dockerfile` copies `apps/api/legal/` into the runtime image on line 69; the new directory
needs the same line, or the endpoint returns an error in every deployed environment while working
locally.

### The FAQ ships clip content only

The previous generation's FAQ answered three questions: why clips start at the wrong time, what open
source means, and why Podverse is open source. Only the first is carried over. The other two describe
AGPLv3 and the project's licensing rationale — still true, but that is About-page material, and
whether nextgen wants it in an FAQ is a product decision nobody has made. Deciding the rest of the
FAQ is future work, not a gap in this step.

The clip answer is the one that has to exist, because it explains a behavior users will otherwise read
as a bug: clips from podcasts with dynamic ads drift, since rotating advertisements change the
episode's length and every timestamp after them.

## Acceptance criteria

- `GET /managed-copy/faq` and `GET /managed-copy/clip-how-to` return markdown with no credentials.
- An unknown slug returns 404 and never touches the filesystem with the requested value.
- A requested locale with a file is served; anything else gets the default locale.
- `{brand_name}` is interpolated from config in every served document.
- `updated_at` is stable across restarts and reflects the last content edit.
- `reqManagedCopyGet` exists in `@podverse/helpers-requests` with a typed slug, and on the
  `ApiRequestService` instance.
- `apps/api/openapi.yml` describes the route and response
  ([`openapi-sync`](/.cursor/rules/openapi-sync.mdc)).
- The runtime Docker image contains the content directory.
- Integration tests cover both slugs, the unknown slug, and the unauthenticated case.

## Web parity references

- The pattern being generalized: `apps/api/src/controllers/legal/popularityTracking.ts`,
  `apps/api/src/lib/legal/popularityTrackingContent.ts`,
  `packages/helpers-requests/src/api/legal/popularityTracking.ts`
- Existing static copy that stays in the catalog: `apps/web/src/app/terms/page.tsx`,
  `apps/web/src/app/about/page.tsx`

## Verification

```bash
npm run test -w apps/api
```
