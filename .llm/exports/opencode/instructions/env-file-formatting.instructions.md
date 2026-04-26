---
description: "Formatting rules for .env and .env.example files"
applyTo:
  - "**/.env"
  - "**/.env.*"
  - "**/*.env"
---

# Environment File Formatting

This rule applies to **all** env var files in the repo: app `.env.example` files, `infra/config/env-templates/*.env.example`, and `dev/env-overrides/local/*.env.example`. Scripts that write env content (e.g. `scripts/local-env/setup.sh`) must follow the same pattern.

## Formatting Rules

1. **Non-empty values** must be surrounded with double quotation marks
2. **Empty/unset values** should have no value after the `=` sign (no quotes, no empty string)

**Correct:**
```
DATABASE_HOST="localhost"
API_KEY="abc123"
EMPTY_VALUE=
URL_WITH_SPECIAL_CHARS="http://example.com?foo=bar&baz=qux"
```

**Incorrect:**
```
DATABASE_HOST=localhost
API_KEY=abc123
EMPTY_VALUE=""
URL_WITH_SPECIAL_CHARS=http://example.com?foo=bar&baz=qux
```

## Rationale

- Quotation marks ensure consistent parsing across different tools (dotenv, dotenvx, shell scripts)
- Quotation marks prevent issues with special characters (spaces, `&`, `=`, `#`, etc.)
- Empty values without quotes clearly indicate "not set" vs an intentional empty string
- Follows the convention established in this monorepo
