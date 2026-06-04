# Phase 5 — SEO regression E2E and helper tests

## Goal

Add automated tests so SEO metadata, crawl policy, and feed-vs-product description
rules do not regress.

## Unit tests — `apps/web/src/lib/seo/`

Expand coverage from phase 1:

| File | Cases |
| --- | --- |
| `truncateMetaDescription.test.ts` | max length, word boundary, empty input |
| `toSeoPlainText.test.ts` | HTML strip, entity decode, whitespace |
| `buildContentMetadata.test.ts` | title, description, canonical, OG/Twitter shape |
| `buildStaticPageMetadata.test.ts` | curated page metadata |
| `buildNoindexMetadata.test.ts` | robots index/follow false |
| `routeSeoPolicy.test.ts` | every major route pattern maps to expected class |

Run via root `npm run test:unit`.

## E2E helper — SSR HTML assertions

Add `apps/web/e2e/helpers/seoHtml.ts`:

```typescript
export async function fetchSsrHtml(
  request: APIRequestContext,
  path: string
): Promise<string> {
  const response = await request.get(path);
  expect(response.ok()).toBeTruthy();
  return response.text();
}

export function expectMetaDescriptionContains(html: string, fragment: string): void;
export function expectRobotsNoindex(html: string): void;
export function expectCanonical(html: string, url: string): void;
```

Use **initial HTML** from `request.get`, not post-hydration `page.content()`, for
metadata contracts.

## Web E2E specs

Add under `apps/web/e2e/`:

### `seo-public-content-metadata.spec.ts`

- Unauthenticated requests to seeded public routes:
  - `/podcast/{seedChannelIdText}`
  - `/episode/{seedItemIdText}`
  - `/track/{seedTrackIdText}` (if seed exists)
- Assert:
  - `<title>` contains entity title (not brand-only).
  - `meta[name="description"]` content matches feed-derived plain text **prefix**
    (use known seed description snippet from E2E seed data — avoid full string if long).
  - No `noindex` in robots meta.

Document seed IDs in spec constants or shared seed helper.

### `seo-static-pages-metadata.spec.ts`

- `/`, `/podcasts`, `/episodes`
- Assert description meta contains curated i18n substring (en-US test locale).
- Assert description does **not** equal a known podcast channel description from seed.

### `seo-noindex-routes.spec.ts`

- `/settings`, `/search`, `/sign-up`, `/queues`, `/history`
- Assert `noindex` in SSR HTML via helper.
- Guest `/my-profile` redirect or noindex — assert policy documented in spec.

### `seo-robots-and-sitemap.spec.ts`

- `GET /robots.txt` — status 200, contains `Disallow: /settings`, `Sitemap:`
- `GET /sitemap.xml` — status 200, contains `/podcasts` and `/`

### `seo-canonical.spec.ts`

- Public detail URL with query params, e.g. `/podcast/{id}?page=2&type=episodes`
- Assert canonical link points to `/podcast/{id}` without query string.

### `seo-profile-sharable-status.spec.ts`

- Public profile seed → indexable (no noindex).
- Private profile seed → noindex or redirect (match phase 4 behavior).

Use E2E seed accounts; align with **e2e-authz-matrix** patterns.

## management-web E2E

Add `apps/management-web/e2e/seo-noindex.spec.ts`:

- `GET /` (or login page) SSR HTML contains `noindex`.
- Optional: entire app layout robots meta.

## Update smoke spec (minimal)

File: `apps/web/e2e/smoke.spec.ts`

- Keep existing home title check.
- Optional one-liner: `request.get('/robots.txt')` status 200.

## e2e-report-order

Register new spec files in E2E report order per **e2e-report-order** skill if repo
maintains ordered full-report list.

## Exit criteria

- Unit tests cover SEO helpers and route policy map.
- Five web SEO E2E specs pass against seeded data.
- management-web noindex spec passes.
- Tests fail if metadata regresses to brand-only title on public detail pages.

## Verification

```bash
./scripts/nix/with-env npm run test:unit
make e2e_test_web_report_spec SPEC=e2e/seo-public-content-metadata.spec.ts,e2e/seo-static-pages-metadata.spec.ts,e2e/seo-noindex-routes.spec.ts,e2e/seo-robots-and-sitemap.spec.ts,e2e/seo-canonical.spec.ts,e2e/seo-profile-sharable-status.spec.ts
make e2e_test_management_web_report_spec SPEC=e2e/seo-noindex.spec.ts
```

Review screenshot reports:

- `.artifacts/e2e-reports/latest/web/index.html`
- `.artifacts/e2e-reports/latest/management-web/index.html`

## Notes for implementers

- Do not run E2E during intermediate phases unless verifying phase 5.
- Use verbose sentence steps per **e2e-readability** skill.
- When seed data lacks description text, extend seed in separate PR or use API setup
  in spec `beforeAll` — prefer deterministic `make e2e_seed` fixtures.
