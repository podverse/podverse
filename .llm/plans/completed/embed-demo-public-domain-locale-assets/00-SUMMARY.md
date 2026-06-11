# Embed demo public-domain locale assets — summary

## Context

Embed demo fixtures under `apps/web/public/embed-demo/` currently use auto-generated tone
files (440 Hz MP3s) and placeholder artwork. This plan replaces them with committed,
trimmed public-domain media per locale (`en-US`, `es`, `fr`, `el-GR`) including synced
alternate enclosures (MP3, OGG, MP4, WebM), locale-aware `/embed` showcase resolution,
and updated seeds/E2E/docs.

## Deliverables

- Locale directories under `apps/web/public/embed-demo/{locale}/`
- `ATTRIBUTION.md` with provenance and clip timecodes
- `embedDemoLocaleCatalog` module (MJS + TS)
- Four parallel DB fixture sets with locale-specific IDs
- Runtime showcase resolution with `en-US` fallback
- i18n keys for showcase slot labels
- Hosted video-primary fixtures (replace stub URLs)

## Verification (cumulative)

```bash
npm run lint
npm run test:unit
make e2e_seed_web
make e2e_test_web_report_spec SPEC=e2e/embed-routes.spec.ts
make e2e_test_web_report_spec SPEC=e2e/embed-demo-index.spec.ts
```

Review `.artifacts/e2e-reports/latest/web/index.html`.
