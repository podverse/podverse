# Fix Management-API Database Connection

## Problem

The `management-api` container fails to start with:

```
Error: connect ECONNREFUSED 172.28.0.6:5999
```

The container is trying to connect to port `5999`, but this is the **host-mapped port**, not the **internal Docker network port**.

## Root Cause

The `infra/config/local/management-api.env` file has:

```
DB_HOST="podverse_local_management_db"
DB_PORT="5999"
```

However, in Docker Compose:

- The database container exposes port `5432` internally (PostgreSQL default)
- Port `5999` is only for **host access** (mapping `5999:5432`)
- Containers on the same Docker network should use the **internal port** `5432`, not the host-mapped port `5999`

## Solution

Update `DB_PORT` in the management-api environment file to use `5432` (the internal Docker port) instead of `5999` (the host-mapped port).

## Files to Modify

1. **`infra/config/local/management-api.env`** - Change `DB_PORT` from `"5999"` to `"5432"`

## Implementation

Change line 39 in `infra/config/local/management-api.env`:

```bash
DB_PORT="5432" # Changed from "5999" - use internal Docker port, not host-mapped port
```

## Notes

- The main API uses the same pattern (likely `DB_PORT="5432"` for the main database)
- Host-mapped ports (like `5999:5432`) are only for accessing services from outside Docker
- Internal container-to-container communication uses the service's native port (5432 for PostgreSQL)
