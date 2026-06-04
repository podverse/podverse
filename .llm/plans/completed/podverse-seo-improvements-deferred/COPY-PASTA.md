# Podverse SEO improvements — copy-pasta

Execute one block at a time. Mark complete when the phase is merged.

## CRITICAL: execution rules

**SEQUENTIAL PHASES** — each phase must **COMPLETE** before the next starts:

```text
Phase 1 → WAIT → Phase 2 (2 agents in parallel) → WAIT → Phase 3 → WAIT → Phase 4 → WAIT → Phase 5
```

**DO NOT** run phases simultaneously.  
**DO** run Agent 2A and Agent 2B in parallel only after Phase 1 finishes.

---

- [x] **Phase 1 — metadata foundation**

  Read and execute
  [`.llm/plans/active/podverse-seo-improvements-deferred/01-metadata-foundation-and-route-classification.md`](./01-metadata-foundation-and-route-classification.md).

  Core rule: shared `apps/web/src/lib/seo/` module + root layout `metadataBase` and title
  template; route classification map is source of truth.

---

- [x] **Phase 2A — RSS public content metadata** (parallel with 2B after Phase 1)

  Read and execute
  [`.llm/plans/active/podverse-seo-improvements-deferred/02-public-rss-content-metadata-rules.md`](./02-public-rss-content-metadata-rules.md).

  Core rule: podcast/episode/artist/album/track/livestream descriptions come from RSS
  DTO fields (`channel_description` / `item_description`), not curated marketing copy.

---

- [x] **Phase 2B — product/listing curated SEO** (parallel with 2A after Phase 1)

  Read and execute
  [`.llm/plans/active/podverse-seo-improvements-deferred/03-product-and-listing-page-curated-seo-copy.md`](./03-product-and-listing-page-curated-seo-copy.md).

  Core rule: home and listing pages (`/`, `/podcasts`, `/episodes`, etc.) use Podverse
  i18n SEO copy, never feed descriptions.

---

- [x] **Phase 3 — crawl/index policy**

  Read and execute
  [`.llm/plans/active/podverse-seo-improvements-deferred/04-crawl-index-policy-robots-sitemap-noindex.md`](./04-crawl-index-policy-robots-sitemap-noindex.md).

  Core rule: public content indexable; auth/settings/search/admin noindex; add
  `robots.ts` + baseline `sitemap.ts`.

  **Wait for both Phase 2A and 2B to complete before starting Phase 3.**

---

- [x] **Phase 4 — async/SSR SEO hardening**

  Read and execute
  [`.llm/plans/active/podverse-seo-improvements-deferred/05-async-rendering-and-ssr-seo-hardening.md`](./05-async-rendering-and-ssr-seo-hardening.md).

  Core rule: conditional robots for profile/playlist visibility; search stays noindex;
  use cached fetchers to avoid double API calls.

---

- [x] **Phase 5 — SEO regression tests**

  Read and execute
  [`.llm/plans/active/podverse-seo-improvements-deferred/06-seo-regression-e2e-and-helper-tests.md`](./06-seo-regression-e2e-and-helper-tests.md).

  Core rule: assert SSR HTML head tags via `request.get`, not hydrated DOM only.

---

- [x] **Plan archival (this plan-set)**

  All phases complete — move plan set to
  `.llm/plans/completed/podverse-seo-improvements-deferred/` per **plan-completion**
  skill. Run cumulative verification:

```bash
./scripts/nix/with-env npm run lint
./scripts/nix/with-env npm run build:packages
./scripts/nix/with-env npm run build -w apps/web
./scripts/nix/with-env npm run build -w apps/management-web
./scripts/nix/with-env npm run test:unit
make e2e_test_web_report_spec SPEC=e2e/seo-public-content-metadata.spec.ts,e2e/seo-static-pages-metadata.spec.ts,e2e/seo-noindex-routes.spec.ts,e2e/seo-robots-and-sitemap.spec.ts,e2e/seo-canonical.spec.ts,e2e/seo-profile-sharable-status.spec.ts
make e2e_test_management_web_report_spec SPEC=e2e/seo-noindex.spec.ts
```

---

## Quick reference

| Phase | Agents | File |
| --- | --- | --- |
| 1 | 1 sequential | `01-metadata-foundation-and-route-classification.md` |
| 2 | 2 parallel | `02-…` + `03-…` |
| 3 | 1 sequential | `04-crawl-index-policy-robots-sitemap-noindex.md` |
| 4 | 1 sequential | `05-async-rendering-and-ssr-seo-hardening.md` |
| 5 | 1 sequential | `06-seo-regression-e2e-and-helper-tests.md` |

Full audit inventory: [`00-SUMMARY.md`](./00-SUMMARY.md)  
Execution order: [`00-EXECUTION-ORDER.md`](./00-EXECUTION-ORDER.md)
