# Log directory (LOG_DIR) — monorepo rules

## No default in any app

No monorepo app sets a default value for log directory. Config must use `process.env.LOG_DIR ?? ''` (or equivalent) so that when unset, the value is empty.

## Empty or unset = console-only

When `LOG_DIR` is empty or unset, logs are console-only. No file transport is added; this avoids bulky log files inside containers when no external volume is mounted.

## When set (e.g. in Docker)

When you want file logging (e.g. in Docker with a volume), set `LOG_DIR` to the **container path** that matches the external volume mount. For example:

- **Workers** (local compose): volume `logs/workers:/opt/logs` → set `LOG_DIR=/opt/logs`.
- API or management-api: if a log volume is added to compose, set `LOG_DIR` to the container path (e.g. `/opt/logs`).

Do not default to `./logs` or `/app/logs` in app code; that causes file logging inside containers without a volume and can become bulky.

## References

- [apps/workers/ENV.md](../apps/workers/ENV.md) — workers LOG_DIR docs
- [packages/helpers-backend](../packages/helpers-backend/src/logger.ts) — LoggerService adds file transport only when `logDir` is non-empty
- [infra/docker/local/workers/docker-compose.yml](../infra/docker/local/workers/docker-compose.yml) — workers log volume and path
