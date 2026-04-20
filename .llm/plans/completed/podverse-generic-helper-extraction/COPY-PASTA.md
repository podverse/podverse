# Podverse Generic Helper Extraction - Copy-Pasta Prompts

## Critical Execution Rules
- Phases are sequential.
- Do not start the next phase until the previous phase fully completes.
- Agents within Phase 2 run in parallel.
- Wait for all parallel agents to finish before Phase 3.

## How To Use
1. Run Phase 1 prompt in one agent and wait for completion.
2. Run all Phase 2 prompts in parallel agents and wait for all to complete.
3. Run Phase 3 prompt in one agent and wait for completion.
4. Run final verification commands from repo root.

---

## Phase 1 - Sequential

### Agent 1 - Foundation
```text
Read and execute .llm/plans/completed/podverse-generic-helper-extraction/01-foundation-shared-primitives.md

Goal: Introduce canonical shared helper primitives and exports for helpers, helpers-validation, helpers-backend, and helpers-browser.

Do not modify tests/scripts/tools. Runtime code only.
```

---

## Phase 2 - Parallel (Run All)

### Agent 2A - V4V Metaboost
```text
Read and execute .llm/plans/completed/podverse-generic-helper-extraction/02-v4v-metaboost-helper-extractions.md

Goal: Replace local generic parse/URL helpers with shared helper imports while preserving behavior.

Runtime code only.
```

### Agent 2B - API and Workers Backend
```text
Read and execute .llm/plans/completed/podverse-generic-helper-extraction/03-api-workers-backend-helper-extractions.md

Goal: Centralize backend param and cache-key helpers into @podverse/helpers-backend.

Keep cache key format byte-identical.
```

### Agent 2C - Web Browser Helpers
```text
Read and execute .llm/plans/completed/podverse-generic-helper-extraction/04-web-management-web-browser-helper-extractions.md

Goal: Move duplicated browser helpers (runtime config script + web push base64 conversion) into @podverse/helpers-browser.

Preserve runtime script escaping behavior.
```

### Agent 2D - Parser Mapping ORM
```text
Read and execute .llm/plans/completed/podverse-generic-helper-extraction/05-parser-parser-mapping-orm-helper-extractions.md

Goal: Move only high-confidence generic helpers and keep domain-heavy helpers local.

Prefer no move over risky generalization.
```

---

## Phase 3 - Sequential

### Agent 3 - Cleanup
```text
Read and execute .llm/plans/completed/podverse-generic-helper-extraction/06-cleanup-exports-imports-and-docs.md

Goal: Remove duplicates, normalize imports/exports, and finalize package-boundary hygiene.

Do not broaden scope beyond runtime helper extraction.
```

---

## Final Verification Commands

```bash
npm run lint
```

```bash
npm run type-check
```

```bash
npm run build:packages
```
