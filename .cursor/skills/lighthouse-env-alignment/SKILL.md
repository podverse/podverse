---
name: lighthouse-env-alignment
description: Keeps Lighthouse env handling aligned with apps/api and apps/web startup validation. Use when changing Lighthouse env loading, .env.api/.env.web examples, or app validation requirements.
---

# Lighthouse Env Alignment

## Purpose

Lighthouse runs the API and web apps for testing. Its env files must stay aligned with
app startup validation:

- `apps/api/src/lib/startup/validation.ts`
- `apps/web/scripts/validate-env.ts`

## Rules

- **No defaults in Lighthouse managers**: `ApiManager` and `WebAppManager` must pass
  `process.env` through without hardcoded defaults.
- **Env files are split**: `.env.api` for API, `.env.web` for web.
- **API env sectioning**: match [`apps/api/.env.example`](../../../apps/api/.env.example)
  (Web/brand and web origin, Mailer, Legal entity, etc.) in
  `tools/web-perf/lighthouse/.env.api.example` and the checked-in `.env.api`.
- **App validation is authoritative**: if app validation changes, update
  `.env.api.example` / `.env.web.example` and docs.

## Files to Update When Validation Changes

- `tools/web-perf/lighthouse/.env.api.example`
- `tools/web-perf/lighthouse/.env.web.example`
- `tools/web-perf/lighthouse/TOOLS-WEB-PERF-LIGHTHOUSE.md`
- `tools/web-perf/lighthouse/.env.lighthouse.example`

## Notes

- Keep `.env` formatting consistent (double quotes for non-empty values).
- Use Lighthouse docker env values from `tools/web-perf/lighthouse/docker/env/db.env`.
- When app/env validation changes in `apps/api` or `apps/web`, update the Lighthouse
  examples and re-check the Lighthouse startup flow.
