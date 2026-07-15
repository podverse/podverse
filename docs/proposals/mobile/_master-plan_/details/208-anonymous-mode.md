# 208-anonymous-mode

**Master step:** 6.9
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Anonymous = no access/refresh tokens; status `anonymous`.
- App is usable for limited browsing/playback stubs that do not require account endpoints.
- Gate authenticated-only actions (playlists sync, library private endpoints) behind auth — show
  login prompt when unauthenticated user hits them.
- Anonymous playback snapshot placeholder OK until Track 10 (document stub).
- Default launch path when no tokens: anonymous **or** login screen — pick **anonymous-first with
  login CTA** (matches typical podcast apps; avoids blocking hello-world / locale smoke).

## Architecture notes

- Keep anonymous and authenticated sharing the same navigation shell when Track 7 arrives.
- Maestro hello-world / locale / api-health must remain green without logging in.

## Edge cases

- Logout → anonymous (not forced blank)
- Failed bootstrap → anonymous + optional banner
- Switching anonymous → authenticated must not leave stale private cache (clear later in Track 10)

## Acceptance criteria

- UI-only Maestro flows pass without credentials
- Authenticated-only affordances redirect/prompt to login
- Status enum includes `anonymous`

## Web parity references

- Web guest browsing vs logged-in capabilities (capability flags where applicable)
- [API-CLIENT-BOUNDARIES.md](/docs/development/API-CLIENT-BOUNDARIES.md)

## Verification

```bash
npm run mobile:e2e:test -- hello-world,api-health
```
