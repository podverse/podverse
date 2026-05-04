---
name: trust-foundation-schema-only
description: Add trust/entitlement schema foundations without enabling runtime gating. Use when creating trust-tier and per-account override tables, entities, and types before feature rollout.
---

# Trust Foundation (Schema-Only)

Use this skill when you need to lay trust/entitlement data groundwork but must not change
feature behavior yet.

## Goals

- Add DB schema for trust tiers and per-account overrides.
- Add ORM/entity and helper type constants.
- Keep API/web runtime behavior unchanged.

## Required shape

- Trust tier integer with explicit enum semantics (for example `1=untrusted`, `2=trusted`).
- Per-account nullable override fields for feature-level booleans/limits.
- Numeric overrides constrained to non-negative values.
- Backfill existing accounts with default trust tier rows.

## Do

- Add a forward-only linear migration.
- Register the migration in ops/kustomize migration bundles.
- Update expected migration filename markers/readiness checks.
- Add ORM entities/relations and helper exports for future use.

## Do not

- Do not modify auth middleware to enforce trust.
- Do not add gating checks in controllers/routes.
- Do not change API responses to expose trust fields yet.

## Verification checklist

- Migration file included in ops ConfigMap migration list.
- App expected migration filename updated.
- Build/lint passes with no runtime behavior changes.
