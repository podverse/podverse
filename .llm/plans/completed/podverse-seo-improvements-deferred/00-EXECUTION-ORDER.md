# Execution order — Podverse SEO improvements

Execute numbered phases **in order**. Within a phase, parallel steps may run
simultaneously only when marked.

| # | Phase | File | Depends on |
| --- | --- | --- | --- |
| 1 | Metadata foundation + route classification | [`01-metadata-foundation-and-route-classification.md`](./01-metadata-foundation-and-route-classification.md) | — |
| 2a | Public RSS content metadata | [`02-public-rss-content-metadata-rules.md`](./02-public-rss-content-metadata-rules.md) | 1 |
| 2b | Product/listing curated SEO copy | [`03-product-and-listing-page-curated-seo-copy.md`](./03-product-and-listing-page-curated-seo-copy.md) | 1 |
| 3 | Crawl/index policy (robots, sitemap, noindex) | [`04-crawl-index-policy-robots-sitemap-noindex.md`](./04-crawl-index-policy-robots-sitemap-noindex.md) | 1, 2a, 2b |
| 4 | Async rendering + SSR SEO hardening | [`05-async-rendering-and-ssr-seo-hardening.md`](./05-async-rendering-and-ssr-seo-hardening.md) | 1, 3 |
| 5 | Regression tests (unit + E2E) | [`06-seo-regression-e2e-and-helper-tests.md`](./06-seo-regression-e2e-and-helper-tests.md) | 1–4 |

## Phase sequencing

```text
Phase 1 (sequential)
  └── 01 foundation

Phase 2 (parallel — wait for Phase 1)
  ├── 02 RSS content metadata
  └── 03 product/listing metadata

Phase 3 (sequential — wait for Phase 2)
  └── 04 crawl policy

Phase 4 (sequential — wait for Phase 3)
  └── 05 async/SSR hardening

Phase 5 (sequential — wait for Phase 4)
  └── 06 tests
```

## COPY-PASTA usage

Use [`COPY-PASTA.md`](./COPY-PASTA.md) for one-block-at-a-time agent prompts.

**Do not** start Phase 2 until Phase 1 is complete.  
**Do not** start Phase 3 until **both** 2a and 2b are complete.

## Verification (cumulative, after Phase 5)

```bash
./scripts/nix/with-env npm run lint
./scripts/nix/with-env npm run build:packages
./scripts/nix/with-env npm run build -w apps/web
./scripts/nix/with-env npm run test:unit
make e2e_test_web_report_spec SPEC=e2e/seo-public-content-metadata.spec.ts,e2e/seo-static-pages-metadata.spec.ts,e2e/seo-noindex-routes.spec.ts,e2e/seo-robots-and-sitemap.spec.ts,e2e/seo-canonical.spec.ts
make e2e_test_management_web_report_spec SPEC=e2e/seo-noindex.spec.ts
```

Open reports under `.artifacts/e2e-reports/latest/web/index.html` and
`…/management-web/index.html`.

## Plan archival

When all phases complete, move this directory to
`.llm/plans/completed/podverse-seo-improvements-deferred/` per **plan-completion**
skill. Mark each COPY-PASTA block complete as you go.
