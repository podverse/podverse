# Taxonomy follow-ups — COPY-PASTA prompts

**Plan set:** `.llm/plans/completed/integrations-taxonomy-followups/`

After each completed prompt: mark ✅ below; move completed plan file to `.llm/plans/completed/integrations-taxonomy-followups/` per plan-completion skill.

---

## Phase 1 — Next.js observability shutdown

### Step 1.1 ✅

```
Read and execute .llm/plans/active/integrations-taxonomy-followups/01-nextjs-observability-shutdown-handlers.md

Verify:
./scripts/nix/with-env npm run build -w apps/web
./scripts/nix/with-env npm run build -w apps/management-web
./scripts/nix/with-env npm run test -w @podverse/observability
```

---

## Phase 2 — Test parity (optional)

### Step 2.1 ✅

```
Read and execute .llm/plans/active/integrations-taxonomy-followups/02-test-parity-and-e2e-dx.md

Verify:
./scripts/nix/with-env npm run test:unit
```

---

## Completion checklist

- [x] 01-nextjs-observability-shutdown-handlers.md
- [x] 02-test-parity-and-e2e-dx.md (optional)

Plan set complete — directory lives under `.llm/plans/completed/integrations-taxonomy-followups/`.
