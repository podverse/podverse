---
name: Image Shrinking Service - Master Plan
overview: End-to-end plan for DO Spaces-based image shrinking, web list usage, and
  deployment docs.
todos: []
isProject: false
---

# Image Shrinking Service - Master Plan

## Goal

Deliver an end-to-end image shrinking pipeline that keeps RSS parsing fast, stores
resized images in DO Spaces, prefers resized images in web list views, and includes
deployment/setup documentation.

## Plan Files

- [00-architecture.md](./00-architecture.md)
- [01-do-package.md](./01-do-package.md)
- [02-worker-and-db.md](./02-worker-and-db.md)

## End-to-End Flow (Summary)

1. Parser stores original RSS image URLs as today.
2. Parser emits MQ hints for recently changed images (skip Add-by-RSS).
3. Worker runs an hourly batch resize cron that prioritizes hinted images
   within a 24-hour freshness window.
4. Worker downloads, resizes to a single width (`IMAGE_SHRINK_WIDTH_PX`), and uploads
   to DO Spaces CDN.
5. Worker writes `is_resized = true` image rows pointing at CDN URLs.
6. API/web list views prefer `is_resized = true` URLs for lists only; header/full-size
   images remain on original URLs.
7. Deletion of `is_resized` rows triggers CDN object deletion, with optional periodic
   cleanup for orphaned objects.

## Implementation-Ready Additions

- Deterministic CDN key format for reliable delete operations.
- Batch job for existing images is the only population path.
- Parser provides MQ hints to prioritize which images the batch job processes first.
- Concrete web list components to update and helper functions to adjust.
- Env template and k8s/ArgoCD updates for workers deployment.
- Web-only list selector helper (API unchanged).
- Rollout gates (DO setup → env wiring → worker deploy → cron run → web switch).
- Helper signature and batch defaults specified for direct implementation.
- Explicit helper precedence rules and env overrides for batch tuning.

## Deployment Documentation Deliverable

- Create `docs/IMAGE-SHRINKING-SERVICE.md` with:
  - DO Spaces setup, CDN enablement, and CORS guidance.
  - Required env vars (including `IMAGE_SHRINK_WIDTH_PX`).
  - Batch tuning env vars (`IMAGE_SHRINK_*`) and defaults.
  - Rollout steps and validation checklist.
  - Troubleshooting notes.
