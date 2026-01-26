# Fix Management-Web server.js Path

## Problem

The `management-web` container fails to start with:
```
Error: Cannot find module '/opt/app/server.js'
```

## Root Cause

The Dockerfile copies the Next.js standalone build to `/opt/app/`, but the `CMD` is trying to run `server.js` from the root. However, based on the `web` app's Dockerfile pattern, Next.js standalone builds in a monorepo structure place `server.js` at `apps/{app-name}/server.js` within the standalone output.

The `web` Dockerfile uses `CMD ["node", "apps/web/server.js"]`, so `management-web` should use `CMD ["node", "apps/management-web/server.js"]`.

## Solution

Update the `CMD` in `apps/management-web/Dockerfile` to use the correct path for the standalone build structure.

## Files to Modify

1. **`apps/management-web/Dockerfile`** - Update CMD from `["node", "server.js"]` to `["node", "apps/management-web/server.js"]`

## Implementation

Change line 48 in `apps/management-web/Dockerfile`:
```dockerfile
CMD ["node", "apps/management-web/server.js"]
```

This matches the pattern used in `apps/web/Dockerfile` and aligns with Next.js standalone output structure in a monorepo.
