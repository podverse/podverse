# 200-secure-storage-dependency

**Master step:** 6.1
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Add `expo-secure-store` (preferred) or `react-native-keychain` to `apps/mobile` via Expo-compatible
  install (`npx expo install` / mobile lockfile — see **mobile-expo-monorepo**).
- Thin wrapper module under `apps/mobile/src/auth/` (e.g. `secureTokenStorage.ts`) with
  `getItem` / `setItem` / `deleteItem` for access + refresh tokens.
- Document Keychain/Keystore intent in `APPS-MOBILE.md` (one short subsection).
- Do **not** store tokens in AsyncStorage / MMKV.

## Acceptance criteria

- Dependency present in `apps/mobile/package.json` / lockfile
- Named export wrapper used only for auth secrets
- Tokens never logged

## Web parity references

- [API-CLIENT-BOUNDARIES.md](/docs/development/API-CLIENT-BOUNDARIES.md) — mobile bearer-first
- Web uses httpOnly cookie `jwt`; mobile uses secure storage instead

## Verification

```bash
test -f apps/mobile/src/auth/secureTokenStorage.ts
grep -q 'expo-secure-store\|react-native-keychain' apps/mobile/package.json
```
