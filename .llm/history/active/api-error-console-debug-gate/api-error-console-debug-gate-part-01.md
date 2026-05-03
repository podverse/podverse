# api-error-console-debug-gate

**Started:** 2026-05-03  
**Author:** Agent  
**Context:** Gate Express `console.error` in error paths on `LOG_LEVEL=debug`.

---

### Session 1 - 2026-05-03

#### Prompt (Developer)

@podverse/apps/management-api/src/app.ts:80-86 look in each of the apis and mgmt apis. if log level = debug, then the console.error should happen. it should not happen if log level is below debug

#### Key Decisions

- Podverse management-api: `isDebugLogLevel()` from `config.log.level` (trim + lowercase `=== 'debug'`); gates router error handler and `startApp` catch `console.error`.
- Podverse main API `app.ts`: unchanged — errors use `loggerService.logError` (Winston) only; no `console.error` in the error middleware.
- Metaboost API + management-api: same env check as Valkey helpers (`process.env.LOG_LEVEL` trim + lowercase `=== 'debug'`); management-api error middleware now logs to stderr only when debug (was silent before).

#### Files Created/Modified

- apps/management-api/src/app.ts
