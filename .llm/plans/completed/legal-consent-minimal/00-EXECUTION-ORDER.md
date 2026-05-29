# Execution order

Execute numbered phases **in order**. Each phase is self-contained;
later phases assume earlier ones are merged.

| # | Phase | File |
| --- | --- | --- |
| 1 | Env vars + runtime config + k8s | [`01-env-config.md`](./01-env-config.md) |
| 2 | DB migrations + ORM + DTOs | [`02-db-orm.md`](./02-db-orm.md) |
| 3 | API: signup, accept-terms, stats gate | [`03-api-legal.md`](./03-api-legal.md) |
| 4 | Terms i18n + `/terms` page | [`04-terms-i18n.md`](./04-terms-i18n.md) |
| 5 | Cookie banner + analytics gating | [`05-cookie-banner.md`](./05-cookie-banner.md) |
| 6 | Signup, terms modal, settings toggle | [`06-ux-signup-settings.md`](./06-ux-signup-settings.md) |
| 7 | Workers stats retention env | [`07-workers-retention.md`](./07-workers-retention.md) |
| 8 | E2E + final verification | [`08-e2e-tests.md`](./08-e2e-tests.md) |

Use [`COPY-PASTA.md`](./COPY-PASTA.md) for one-block-at-a-time agent prompts.

After phase 2 SQL changes: run `make db_regen_linear_baseline` and commit
`0003a_` / `0003b_` gz baselines.
