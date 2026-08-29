# 453-cold-start-deep-link

**Master step:** 15.4
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Handle a deep link that arrives during **cold start**, before auth bootstrap completes. Today
  `AppBody` renders `null` while `status === 'unknown'`, so the `NavigationContainer` (and its
  linking handler) is **unmounted** and an inbound universal link can be dropped.
- Buffer the initial/pending URL and **replay** it after auth resolves (`authenticated` or
  `anonymous`) and the container mounts.
- Route public content (podcast/episode/clip/playlist/profile) for anonymous users; gate
  account-only targets behind login and resume the intended route post-login.

## Acceptance criteria

- Launching the app via a universal link from a cold state navigates to the correct screen after
  the auth gate resolves (no dropped link).
- Anonymous users reach public content; account-gated targets prompt login then continue.
- Warm-start / already-running deep links continue to work unchanged.
- No indefinite `unknown` hang (respect existing 8s `accountRepository.refresh` timeout).

## Architecture notes

- Capture the initial URL at the native/JS boundary (`Linking.getInitialURL()` and the
  `url` event) at app root, independent of the auth-gated subtree.
- Store a pending-URL in a ref/state above the `status` branch in `App.tsx`; after the container
  mounts, dispatch navigation (or set React Navigation `initialState` derived from the URL).
- Coordinate with 452's `getStateFromPath` so buffered URLs use the same mapping.
- Cross-track: notification tap routing (14.4) reuses this replay path.

## Web parity references

- `apps/mobile/App.tsx` (auth gate — `status === 'unknown'` renders null).
- `apps/mobile/src/auth/AuthProvider.tsx` (`hydrateFromSecureStorage`, timeout paths).
- `apps/mobile/src/navigation/index.tsx` (linking config from 452).

## Edge cases

- Malformed / unknown path → fall back to Home, do not crash.
- Link arrives while login screen is showing → queue until authenticated if target is gated.
- Multiple rapid links → last-wins or queue; document choice.

## Verification

```bash
grep -rq "getInitialURL\|pendingUrl\|pending_deep_link" apps/mobile/src apps/mobile/App.tsx
npm run test -w apps/mobile
```
