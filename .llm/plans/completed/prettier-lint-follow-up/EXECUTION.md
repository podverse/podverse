# Prettier Lint Follow-Up – Execution Guide

## Order

1. **01-fix-docker-compose-yml.md** – Fix duplicate `environment` keys, remove from `.prettierignore`, format the file, verify.
2. **02-optional-shell-and-precommit.md** – Optional. Do **A** (prettier-plugin-sh) and/or **B** (lint-staged) only if you want them.

## TL;DR

```bash
# 01 (required):
# - Edit infra/docker/ci/docker-compose.yml: merge environment blocks
# - Remove infra/docker/ci/docker-compose.yml from .prettierignore
npx prettier --write infra/docker/ci/docker-compose.yml
npm run prettier:check && npm run lint

# 02A (optional – shell formatting):
npm i -D prettier-plugin-sh
# Add "plugins": ["prettier-plugin-sh"] to .prettierrc.json
npm run prettier:write && npm run lint

# 02B (optional – format on commit):
npm i -D lint-staged
# Add "lint-staged" to package.json, wire to pre-commit (e.g. husky)
```

## Agent Assignment

- **01**: Execute first. Single agent.
- **02**: Execute only if you want shell formatting and/or format-on-commit. Can be done by the same agent after 01.
