# 208-anonymous-mode

**Master step:** 6.9
**Model (author + implement):** Opus 4.8
**Status:** done (shell completion 2026-07 — anonymous mounts the same tab navigator)

## Scope

- Anonymous = no access/refresh tokens; status `anonymous`.
- App is usable for limited browsing/playback stubs that do not require account endpoints.
- Gate authenticated-only actions (playlists sync, library private endpoints) behind auth — show
  login prompt when unauthenticated user hits them.
- Anonymous playback snapshot placeholder OK until Track 10 (document stub).
- Default launch path when no tokens: anonymous **or** login screen — pick **anonymous-first with
  login CTA** (matches typical podcast apps; avoids blocking hello-world / locale smoke).

## Architecture notes

- Anonymous and authenticated share the **same** `MobileTabNavigator` shell (`App.tsx`). Login and
  sign-up are optional full-screen overlays with Cancel (`auth-dismiss`) back to tabs. More shows
  Login / Sign up (`anonymous-login-cta` / `anonymous-signup-cta`) when anonymous, Logout when
  authenticated. Track 5 smoke UI lives under More → Smoke (`more-nav-smoke` → `HelloWorldScreen`).
- Maestro hello-world / locale / api-health remain green without logging in (via More → Smoke).

## Edge cases

- Logout → anonymous tab shell (not forced blank / not HelloWorld-only)
- Failed bootstrap → anonymous + optional banner
- Switching anonymous → authenticated must not leave stale private cache (clear later in Track 10)

## Acceptance criteria

- UI-only Maestro flows pass without credentials
- Authenticated-only affordances redirect/prompt to login
- Status enum includes `anonymous`
- Cold start with no tokens shows the tab shell (Home), not a login wall

## Web parity references

- Web guest browsing vs logged-in capabilities (capability flags where applicable)
- [API-CLIENT-BOUNDARIES.md](/docs/development/API-CLIENT-BOUNDARIES.md)

## Verification

```bash
npm run mobile:e2e:test -- hello-world,api-health,auth-logout,home
```

## Depends on

- 6.1–6.8 auth store / screens
