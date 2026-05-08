# dev-no-lint-prep

## Started

2026-05-07

---

### Session 1 - 2026-05-07

#### Prompt (Developer)

i also want you to skip the lint commands in the dev commands. lint should be separate

#### Key Decisions

- Root `dev:all` and `dev:all:watch` previously ran `npm run build:packages` and `npm run build` for api/management-api, which chain `npm run lint` in those workspaces.
- Prep now uses `npm run build:packages:prod` (packages already expose `build:prod` without lint) plus new `build:dev` (`tsc && tsc-alias`) on `apps/api` and `apps/management-api` so local compile matches normal dev/tsconfig without eslint.
- Full `npm run build` / `npm run build:packages` and root `npm run lint` remain unchanged for CI and explicit checks.

#### Files Created/Modified

- apps/api/package.json
- apps/management-api/package.json
- package.json
- .llm/history/active/dev-no-lint-prep/dev-no-lint-prep-part-01.md
