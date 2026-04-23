---
name: logging
description: Log directory (LOG_DIR) behavior across the monorepo. Use when adding or changing
  log directory behavior, LOG_DIR env, or file logging in any app or package.
version: 1.0.0
---

# Log directory (LOG_DIR) — monorepo rules

## When to use

- Adding or changing log directory behavior, LOG_DIR env, or file logging in any app or package.

## Rules

1. **No default value for log directory** in any monorepo app. Config must use
   `process.env.LOG_DIR ?? ''` (or equivalent) so that when unset, the value is empty.

2. **When LOG_DIR is empty or unset**, logs are console-only (no file transport). This avoids
   bulky log files inside containers when no external volume is mounted.

3. **When LOG_DIR is set** (e.g. in Docker with a volume), use the path that matches the
   external volume mount (e.g. `/opt/logs` in workers local compose).

4. **Do not default to `./logs` or `/app/logs`** in app code; that causes file logging inside
   containers without a volume and can become bulky.

## References

- [apps/workers/ENV.md](../../apps/workers/ENV.md) — workers LOG_DIR docs
- [logs/LOGS.md](../../logs/LOGS.md) — LOG_DIR rules across the monorepo
- [packages/helpers-backend LoggerService](../../packages/helpers-backend/src/logger.ts) — adds
  file transport only when `logDir` is non-empty
- [infra/docker/local/workers/docker-compose.yml](../../infra/docker/local/workers/docker-compose.yml)
  — workers log volume and path (`/opt/logs`)
