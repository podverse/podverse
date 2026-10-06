# 06 — Device and Maestro pass

**Cursor model:** Opus 5.5 · **Reasoning:** high

## Goal

Prove the SDK 57 build with Maestro. For this plan set the agent **starts,
uses, and stops** the E2E leave-running stack in background shells — no
operator VS Code tabs required.

## Preconditions

- Prompts 04 and 05 complete; both platforms built after `mobile:reset`.

## Agent-owned E2E stack (required)

Do **not** wait for the operator to open **Mobile E2E Metro** / **API** /
**test-assets** tabs. Drive the stack yourself from the monorepo root.

### 1. Clear port conflicts

- Only one Metro may own `:8081`. If a UI-only `mobile:dev` is listening,
  stop it (find the pid on 8081 and kill it, or ask the operator only if
  kill is unsafe). Prefer freeing the port over stopping.
- If managed E2E API / test-assets are already up from a prior run, reuse
  them after health checks (or `stop` then restart if stale).

### 2. Start leave-running services

```bash
npm run mobile:e2e:api:bg
npm run mobile:e2e:test-assets:bg
```

Start E2E Metro in a **background** shell (`block_until_ms: 0` or equivalent)
so it keeps running:

```bash
npm run mobile:dev:e2e
```

Wait until Metro is accepting on `:8081` (poll / log “Metro waiting”).

### 3. Health + install E2E apps

```bash
npm run mobile:e2e:api:health
npm run mobile:e2e:test-assets:health
npm run mobile:e2e:ios
npm run mobile:e2e:android
```

Installs must happen **after** Prompt 05’s native reset so binaries match
SDK 57.

### 4. Maestro

```bash
npm run mobile:e2e:test:all
```

On failures, fix the minimum, then re-run focused:

```bash
npm run mobile:e2e:test -- membership-checkout
npm run mobile:e2e:test -- player-screen
npm run mobile:e2e:test -- library-downloads
```

### 5. Tear down leave-running (end of prompt)

```bash
npm run mobile:e2e:api:stop
npm run mobile:e2e:test-assets:stop
```

Stop the background Metro process you started (pid from the background
shell / port 8081). Do not leave orphan Metros if this prompt owns them.

If a step fails hard (SDK, signing, no simulator), **stop** with the log —
do not invent Maestro failures.

## Deferred to morning (not agent-blocking)

- CarPlay / Android Auto checklists under
  `modules/podverse-media-engine/*-CHECKLIST.md`
- USB Play checkout (`docs/billing/BILLING-GOOGLE-PLAY-DEVICE.md`) — needs
  Prompt 08 Play rollout first
- Manual UI smoke beyond what Maestro covers

## Fix scope

Allowed: plugins, modules, insets, babel, billing clients, JS, Maestro flows.  
Not allowed: FOSS PayPal, expo-updates, publishing `com.podverse`, reverting to SDK 52.

## Done when

- E2E stack was started by the agent (or healthy reuse), apps installed,
  Maestro full or focused critical paths green
- Leave-running processes this prompt started are stopped
- Morning-only items listed explicitly

## Agent verify summary

Report: stack start method, health results, Maestro commands, pass/fail,
tear-down done, deferred morning items.
