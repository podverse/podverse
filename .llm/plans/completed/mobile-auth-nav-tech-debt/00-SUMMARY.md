# Mobile auth/nav tech debt (post Track 6–7 scaffold)

**Status:** completed (moved from active/)
**Trigger:** Pre-commit review of uncommitted Track 6 auth + Track 7 nav + env-consistency work
on `feature/mobile-app-init-3`. E2E (web + mobile) reported green; follow-ups are intentional debt,
not blockers for the scaffold commit.

## Goal

Close the medium-risk consistency and hygiene gaps left by the auth/nav scaffold so later tracks
do not invent bugs on top of split session state or stale docs.

## Context (already true)

- Bearer mobile auth (`expo-secure-store`, `/auth/mobile/*`, no cookie login) ships in scaffold.
- E2E SecureStore reset is gated `__DEV__ && EXPO_PUBLIC_MOBILE_E2E===1`.
- Bootstrap `/auth/me` has an 8s abort budget so UI never sticks on `status === 'unknown'`.
- Env base URLs include `/api/<version>`; `make local_env_setup` wires `apps/mobile/.env`.
- Tab navigator + Maestro `auth-*` / `tab-switch-playback` flows exist.

## Locked decisions

| Item | Decision |
| ---- | -------- |
| Bootstrap failure | Must not leave `status === 'anonymous'` while access/refresh tokens remain in state **and** SecureStore. Choose one consistent policy (see plan 01). |
| Post-login | After successful `setTokens` / login, load `account` via bearer `/auth/me` (same path as hydrate). |
| Docs | HOW-TO-RUN E2E host examples must include `/api/v2`, matching `mobile:dev:e2e`. |
| Env ports | Document that `local_env_setup` derives day-to-day ports (default 3000 from shared LOCAL_API_*) while E2E Metro overrides use **4230** via `mobile:dev:e2e` — do not silently conflate the two. |
| Entry hygiene | Add React Navigation `gesture-handler` entry import; prefer `import type` from a helpers subpath/DTO module over the package barrel when practical. |
| Signup / health | Signup surfaces real copy (i18n or plain English, not raw keys); health smoke may keep raw `fetch` **or** move to helpers — decide in plan 04, keep scope small. |

## Out of scope

- Splitting or committing the hitchhiking web media-player E2E queue-clear diffs (operator
  commit hygiene, not a code plan).
- Full account/profile UI, password reset, social login.
- Migrating every `withCredentials: true` helpers-requests method to bearer-aware mobile wrappers
  (Track follow-up when consuming those endpoints).
- Changing E2E device matrix or tablet mini-player assertions.

## Source review notes

From the pre-commit passthrough:

1. Bootstrap non-401 → anonymous + leftover tokens (medium).
2. Login never loads `/auth/me` → `account` stays null (medium).
3. Stale HOW-TO URL without `/api/v2` (docs).
4. `local_env` port 3000 vs `.env.example` 4230 confusion (docs/clarity).
5. No `import 'react-native-gesture-handler'` in entry (nit; E2E green).
6. `DTOAccount` type import from `@podverse/helpers` barrel (type-only OK; prefer subpath).
7. Signup raw keys; HelloWorld raw `fetch` for `/health` (nits).
