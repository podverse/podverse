# Phase 4 — Card, Alert, loading shells (Shared UI consolidation)

## Preconditions

- Phases 0–3 sufficient for your scope; this phase can ship separately if shells are lower priority.

## Goal

Replace **ad hoc** management-only wrappers (`Card`, `Alert`, `CenterContainer`, `LoadingText`) with
shared `@podverse/ui` components **only where** semantics and visuals align across apps.

## Audit

- Compare management implementations under `apps/management-web/src/components/ui/` with any web
  patterns (panels, callouts, toast-adjacent markup—not identical to `react-hot-toast`).
- Decide unified names: e.g. **`Panel`** vs **`Card`**, **`Callout`** vs **`Alert`**—avoid clashing
  with domain-specific “Alert” behavior.

## Implementation

1. Promote or merge styles into `packages/ui` using tokens/themes only.
2. Export from `packages/ui/src/index.ts`.
3. Update imports in management-web (`page.tsx`, `SettingsPageClient`, `WorkersPageClient`,
   `FlagStatusPageClient`, etc.—confirm with grep).
4. Delete redundant local components when unused.

## Verification

- Lint/build; scoped management-web E2E for pages that use these shells.

```bash
make e2e_test_management_web_report_spec SPEC=e2e/products-hub.spec.ts,e2e/feed-operations-flag-status.spec.ts
```

Tune `SPEC` to touched specs.

## Completion

- Mark Prompt 5 in `COPY-PASTA.md`.
- When **all** prompts in this set are done, move the entire `shared-ui-consolidation` directory from
  `.llm/plans/active/` to `.llm/plans/completed/` per plan lifecycle rules.
