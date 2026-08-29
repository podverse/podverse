# 716-forced-logout-notice

**Master step:** P2.4.7
**Model (author + implement):** Claude Opus 4.5
**Status:** implemented

## Scope

Tell a mobile user, once, when the **server** ended their session — as opposed to when they signed
out themselves. A dismissible dialog with a **Login** button, shown on the next render after the
sign-out and surviving a relaunch.

## Why this is worth interrupting for

A silent forced logout is a data-loss trap, not just a confusing state. A signed-out device still
browses, plays, and subscribes normally, because subscriptions are local-first
([701](/docs/proposals/mobile/_master-plan_/phase-2/details/701-anonymous-subscriptions.md)). But
local subscriptions are pushed to the server **only** at sign-up, and signing back into an existing
account lets the account win — so everything subscribed while unknowingly signed out is dropped at
the next login. The user has to be told before they start accumulating work they will lose.

## What counts as proof

Only an explicit **HTTP 401 from the API** on this device's own credentials:

- `POST /auth/mobile/refresh` returns 401, or the body code is `refresh_token_reuse_detected`.
- Bootstrap `/auth/me` returns 401 while hydrating from stored tokens.

Everything else leaves the session intact, which is what keeps **offline ≠ logged out**:

| Condition                          | Session      | Notice |
| ---------------------------------- | ------------ | ------ |
| 401 on refresh or bootstrap        | ended        | shown  |
| Timeout, network error, 5xx        | kept         | —      |
| Cold start with no network         | kept, cached | —      |
| API base URL not configured        | kept         | —      |
| User taps Logout                   | ended        | —      |
| E2E/fixture reset                  | ended        | —      |

The config-failure row is a behaviour change: `refreshAccessTokenSingleFlight` used to end the
session when `createMobileApiRequestService()` returned `null`. A missing base URL is a build fault
with no server involvement, so it cannot be evidence the credentials are dead; the refresh now fails
like any other unavailable-API error.

## Design

`clearSession(reason)` is the single chokepoint every sign-out passes through, so the reason lives
there and the type makes it unskippable — `SessionEndReason` is a required parameter, and there is
no default that could quietly mean "expired".

| Caller                                     | Reason            |
| ------------------------------------------ | ----------------- |
| `logoutWithMobileRevoke`                   | `user_logout`     |
| `refreshAccessTokenSingleFlight` (401)     | `session_expired` |
| `hydrateFromSecureStorage` (401)           | `session_expired` |
| `shouldResetSessionForE2e`                 | `reset`           |

Only `session_expired` writes the marker (`auth.forced_logout_at`, an ISO timestamp in
AsyncStorage via `prefsStore`). It is **persisted rather than held in memory** because the rejecting
401 usually lands on a background sync, with the app closed or backgrounded and nobody to show a
dialog to.

`setTokens` clears the marker, so holding valid credentials again settles the question whether the
user acted on the notice or logged in without ever seeing it.

`ForcedLogoutNotice` mounts app-wide in `App.tsx` (not per screen) so it cannot be missed by someone
who opens into Search or Library, and reads the marker whenever auth status settles to `anonymous`.

It renders `ConfirmDialog` — the former `PremiumGateModal`, which held no strings and was already
generic; it now takes its test IDs as props so the membership gate keeps
`premium-gate-*` and this keeps `forced-logout-*`.

## Copy

`authentication.forced_logout_*` in the **consumer** catalog, beside the existing auth strings, so
web can reuse it when it picks this up. The body states the consequence rather than reassuring:
subscriptions made while signed out stay on the device and are **not** saved to the account, which
is what 701 actually does.

## Verification

Unit: `src/auth/forcedLogoutNotice.test.ts` — the reason mapping (`user_logout` and `reset` must
stay silent) and the marker lifecycle.

E2E: `auth-logout.yaml` asserts the dialog does **not** appear after a deliberate logout. A false
alarm there would train users to dismiss the one message that matters.

Not covered on device: the positive path. Maestro cannot make the server reject a refresh token, and
`launchApp: clearState` wipes the marker, so a seeded flow would assert nothing. Manual pass:

1. Log in on a device against the local API.
2. Revoke or delete the account's refresh token server-side (or wait out its TTL).
3. Force a refresh — background the app past the access-token TTL, or cold start.
4. The dialog appears once, with **Login**; dismissing it and relaunching does not show it again.
5. Log in; confirm no dialog on the next launch.

## Follow-up

**Web is not covered.** Web has no local-first subscriptions, so the data-loss consequence does not
apply, but a forced logout is still worth surfacing. Whoever picks it up can reuse the
`authentication.forced_logout_*` keys.
