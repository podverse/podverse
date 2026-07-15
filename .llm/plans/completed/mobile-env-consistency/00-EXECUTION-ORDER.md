# Mobile env consistency — execution order

Run COPY-PASTA prompts **sequentially**. Each chunk builds on the previous.

| Order | Plan file | Focus | Depends on | Model |
| ----- | --------- | ----- | ---------- | ----- |
| 1 | `01-shared-validation-core.md` | Extract value-based validators into `@podverse/helpers`; `helpers-config` delegates | — | Codex 5.3 |
| 2 | `02-mobile-env-source-of-truth.md` | Base URL as single source of truth + mobile validator (uses core) + `.env.example` | 1 | Codex 5.3 |
| 3 | `03-local-env-setup-mobile.md` | Wire `apps/mobile/.env` into `make local_env_setup` / clean / setup.sh | 2 | Codex 5.3 |
| 4 | `04-abcmemory-env-conventions.md` | abcmemory: env-vars-via-local-env for all apps; mobile specifics | 1-3 | Auto |

After the last prompt: archive this set to `.llm/plans/completed/mobile-env-consistency/` and give cumulative operator verification commands.

## Notes

- Chunk 1 must keep `@podverse/helpers-config` unit tests green (signatures unchanged).
- Chunk 2 depends on chunk 1 so the mobile validator uses the shared core (no throwaway local logic).
- Do not run tests during agent work; end each response with operator verification commands.
