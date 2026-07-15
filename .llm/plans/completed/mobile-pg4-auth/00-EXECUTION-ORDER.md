# PG-4 auth — execution order

Run COPY-PASTA prompts **sequentially**. Do not start E2E prompts until screens + store exist.

| Order | Plan file | Steps | Detail IDs | Model |
| ----- | --------- | ----- | ---------- | ----- |
| 1 | `01-secure-storage-and-store.md` | 6.1–6.2 | 200–201 | Codex 5.3 |
| 2 | `02-api-client-token-no-cookie.md` | 6.3, 6.10 | 202, 209 | Codex 5.3 |
| 3 | `03-refresh-and-logout.md` | 6.4–6.5 | 203–204 | Opus 4.8 |
| 4 | `04-login-signup-screens.md` | 6.6–6.7 | 205–206 | Codex 5.3 |
| 5 | `05-bootstrap-and-anonymous.md` | 6.8–6.9 | 207–208 | Opus 4.8 |
| 6 | `06-e2e-login-logout.md` | 6.11–6.12 | 210–211 | Codex 5.3 |

After all prompts: archive this set to `.llm/plans/completed/mobile-pg4-auth/`.
