# COPY-PASTA — mobile-env-consistency

Use one prompt per agent. Run **in order** from `00-EXECUTION-ORDER.md`. Pasting a prompt = execute it immediately.

After each prompt: tick `[x]` here and move the completed numbered file to `.llm/plans/completed/mobile-env-consistency/`. Agents do not run tests — operator verifies.

## Step 1 — Shared value-based validation core

- [x] done

**Cursor model:** Codex 5.3

```text
Read and execute .llm/plans/active/mobile-env-consistency/01-shared-validation-core.md
Extract value-based validators + ValidationResult/ValidationSummary types into @podverse/helpers
and make @podverse/helpers-config's process.env-reading functions thin wrappers that delegate.
Keep all @podverse/helpers-config public signatures and unit tests unchanged.
Do not run tests during agent work; end with operator verification commands.
```

## Step 2 — Mobile base URL source of truth + validator

- [x] done

**Cursor model:** Codex 5.3

```text
Read and execute .llm/plans/active/mobile-env-consistency/02-mobile-env-source-of-truth.md
Fold prefix/version into EXPO_PUBLIC_MOBILE_API_BASE_URL[_IOS|_ANDROID] (with /api/v2), reframe
code constants as fallback, add apps/mobile/src/config/validateMobileEnv.ts using the shared core
from @podverse/helpers, add apps/mobile/.env.example, and update scripts/mobile/dev-e2e.sh URLs.
Do not run tests during agent work; end with operator verification commands (Mobile Maestro:
hello-world,auth-login,auth-logout,tab-switch-playback).
```

## Step 3 — Wire mobile into make local_env_setup

- [x] done

**Cursor model:** Codex 5.3

```text
Read and execute .llm/plans/active/mobile-env-consistency/03-local-env-setup-mobile.md
Add apps/mobile/.env to makefiles/local/Makefile.local.env.mk (prereq + copy rule + clean list)
and scripts/local-env/setup.sh (MOBILE_APP_ENV). Define the shared local API endpoint ONCE in a
home override (local_env_prepare/local_env_link) and derive both web sidecar vars and the two
mobile URLs (iOS localhost, Android 10.0.2.2, each with /api/v2) via apply_override. Update
apps/mobile TEST-ENV.md / APPS-MOBILE.md briefly.
Do not run tests during agent work; end with operator verification commands (make local_env_setup).
```

## Step 4 — abcmemory env conventions (final)

- [x] done

**Cursor model:** Auto

```text
Read and execute .llm/plans/active/mobile-env-consistency/04-abcmemory-env-conventions.md
Add the repo-wide "prefer env vars via make local_env_setup for all apps incl mobile" principle,
update .cursor/rules/mobile-react-native.mdc (EXPO_PUBLIC literal access, prefix/version contract,
source-of-truth, shared validation core) and .cursor/skills/mobile-expo-monorepo/SKILL.md.
This is the last step: archive .llm/plans/active/mobile-env-consistency/ to completed/ and provide
ALL cumulative operator verification commands for the whole set in one bash block.
```
