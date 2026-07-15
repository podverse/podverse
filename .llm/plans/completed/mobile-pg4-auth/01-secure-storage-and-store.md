# 01 — Secure storage + auth store

Implement master steps **6.1–6.2**.

## Detail docs

- [200-secure-storage-dependency](/docs/proposals/mobile/_master-plan_/details/200-secure-storage-dependency.md)
- [201-auth-store](/docs/proposals/mobile/_master-plan_/details/201-auth-store.md)

## Tasks

1. Add `expo-secure-store` to `apps/mobile` (Expo install / mobile lockfile).
2. Add `apps/mobile/src/auth/secureTokenStorage.ts` (get/set/delete for access + refresh).
3. Add auth session store (Zustand or context) with status + tokens + clear/hydrate.
4. Document briefly in `APPS-MOBILE.md`.
5. Mark steps **6.1–6.2** and details **200–201** `done` when finished.

Do not implement screens or API client yet. Do not run tests during agent work.
