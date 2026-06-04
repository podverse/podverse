# Phase 1 — Metadata foundation and route classification

## Goal

Create shared SEO utilities and global metadata foundation so later phases can add
route-specific `generateMetadata` without duplicating logic.

## New module: `apps/web/src/lib/seo/`

Create these files (Tier B — extensionless relative imports within `apps/web/src`):

### `routeSeoPolicy.ts`

Export a typed route policy map used by metadata builders and tests:

```typescript
export type SeoRouteClass =
  | 'rss_public_content'
  | 'product_listing'
  | 'conditional_public'
  | 'noindex';

export type SeoRoutePolicy = {
  class: SeoRouteClass;
  pathPattern: string;
};
```

Include entries for all routes listed in [`00-SUMMARY.md`](./00-SUMMARY.md) sections
A–E. This file is the **single classification source** for tests in phase 6.

### `truncateMetaDescription.ts`

- Input: plain text (already stripped).
- Default max length: **160** characters; break on word boundary when possible.
- Export `truncateMetaDescription(text: string, maxLength?: number): string`.

### `toSeoPlainText.ts`

- Wrap `stripAndDecodeHtml` from `@podverse/helpers`.
- Collapse whitespace runs to single spaces.
- Return empty string for missing input (callers apply fallbacks).

### `buildAbsoluteWebUrl.ts`

- Use `getWebOrigin()` from `apps/web/src/config/index.ts`.
- Join origin + pathname (normalize leading slash, no duplicate slashes).

### `buildOpenGraphImage.ts`

- Accept optional image URL string from DTO helpers.
- Return absolute URL when relative; fall back to brand default from config/assets
  when missing.

### `buildContentMetadata.ts`

Build Next.js `Metadata` for RSS-backed pages:

```typescript
type BuildContentMetadataInput = {
  title: string;
  descriptionPlain: string;
  pathname: string;
  imageUrl?: string;
  type?: 'website' | 'article';
};

export function buildContentMetadata(input: BuildContentMetadataInput): Metadata;
```

Include: `title`, `description`, `alternates.canonical`, `openGraph`, `twitter`
(`summary_large_image` when image present).

### `buildStaticPageMetadata.ts`

Same shape but for curated product/listing pages — no feed fields.

### `buildNoindexMetadata.ts`

Return `Metadata` with `robots: { index: false, follow: false }` plus optional title.

### `index.ts`

Re-export public API.

## Unit tests

Add `apps/web/src/lib/seo/truncateMetaDescription.test.ts` and
`toSeoPlainText.test.ts` (Vitest). Keep tests in phase 1 minimal; phase 6 expands.

## Root layout changes

File: `apps/web/src/app/layout.tsx`

1. Add `export const metadata: Metadata` (or `generateMetadata` if locale-dependent):
   - `metadataBase: new URL(getWebOrigin())`
   - `title: { default: brandName, template: '%s | ' + brandName }`
   - `openGraph.siteName: brandName`
   - Default OG image (brand logo from existing assets/constants)
2. **Remove** manual `<title>{config.public.brand.name}</title>` from `<head>` once
   Metadata API owns title (keep `RuntimeConfigScript`, `FontPreloads`, `FavIcons`).
3. Import `Metadata` from `next` and `getWebOrigin` / `getConfig`.

Do **not** add per-route metadata in layout — only site defaults.

## Fetch deduplication pattern (for phases 2–3)

Document and use in later plans:

```typescript
import { cache } from 'react';

export const getChannelForPage = cache(async (idOrIdText: string) => {
  const { ssrApiRequestService } = await getSSRAuthService();
  return ssrApiRequestService.reqChannelGetByIdOrIdText(idOrIdText);
});
```

Place shared cached fetchers in `apps/web/src/lib/seo/fetchers.ts` as needed in phase 2.

## Exit criteria

- `apps/web/src/lib/seo/` exists with builders and route policy map.
- Root layout exports site-wide `metadata` with `metadataBase` and title template.
- Manual duplicate `<title>` removed from layout.
- Unit tests pass for truncation and plain-text conversion.

## Verification

```bash
./scripts/nix/with-env npm run lint
./scripts/nix/with-env npm run test:unit
```

Manual: load `/` in dev; view source — `<title>` should still show brand (via Metadata API).
