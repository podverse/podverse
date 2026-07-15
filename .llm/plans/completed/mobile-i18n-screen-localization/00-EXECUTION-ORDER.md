# Execution order — mobile-i18n-screen-localization

Phases are **sequential**. Do not start a later phase until the previous phase’s plans are done
(catalog keys must exist before screens call `t()`).

## Phase 1 — Catalog keys

| Order | Plan | Parallel? |
| ----- | ---- | --------- |
| 1 | [01-catalog-keys.md](./01-catalog-keys.md) | Sequential alone |

Edit only catalog `originals/en-US.json` (+ compile). No screen wiring yet.

## Phase 2 — Auth screens + account locale

| Order | Plan | Parallel? |
| ----- | ---- | --------- |
| 2 | [02-auth-screens-i18n.md](./02-auth-screens-i18n.md) | After Phase 1 |

Touches Login/SignUp/HelloWorld CTAs and AuthProvider hydrate (locale override). Do not start
Phase 3 until this lands.

## Phase 3 — Navigation titles

| Order | Plan | Parallel? |
| ----- | ---- | --------- |
| 3 | [03-navigation-i18n.md](./03-navigation-i18n.md) | After Phase 2 |

Tab labels + stack `options.title` only; leave placeholder body copy hardcoded.

## Operator verify (after all pasted prompts)

Agents do **not** run tests. After the set, operator runs focused Maestro auth + tab flows and
`npm run i18n:compile` / `npm run i18n:validate`. See cumulative block in `COPY-PASTA.md`.
