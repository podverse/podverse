# PG-3 execution order

Paste COPY-PASTA prompts **in order**. Track 5 (E2E) and Track 4 (CI) are independent after the
two decision steps — but keep the listed sequence so open decisions land first and shared docs do
not thrash.

| Order | Plan file                              | Steps              | Model     |
| ----- | -------------------------------------- | ------------------ | --------- |
| 1     | `01-e2e-framework-and-layout.md` (done; archived) | 5.1, 5.2, 5.12, 5.13 | Codex 5.3 |
| 2     | `02-e2e-hello-world-screenshots.md` (done; archived) | 5.3–5.5            | Codex 5.3 |
| 3     | `03-e2e-makefile-docs-skill.md` (done; archived) | 5.6, 5.7, 5.11     | Codex 5.3 |
| 4     | `04-e2e-rule-ci-env.md` (done; archived) | 5.8–5.10           | Codex 5.3 |
| 5     | `05-ci-tooling-and-costs.md` (done; archived) | 4.1–4.3            | Opus 4.8  |
| 6     | `06-store-identity-isolation.md` (done; archived) | 4.11–4.13          | Opus 4.8  |
| 7     | `07-mobile-workflows-isolation.md` (done; archived) | 4.4–4.7            | Opus 4.8  |
| 8     | `08-runners-and-signing.md` (done; archived) | 4.8–4.10           | Opus 4.8  |
| 9     | `09-branch-channels-versions.md` (done; archived) | 4.14–4.18          | Codex 5.3 |
| 10    | `10-ota-profiles-metadata.md` (done; archived) | 4.19–4.21          | Codex 5.3 |
| 11    | `11-runbook-artifacts-convergence.md` (done; archived) | 4.22–4.25          | Opus 4.8  |

Mark steps `planned` → `done` only when implementing (this detailing phase leaves them **`planned`**).
