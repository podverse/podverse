# Stats — account (`tracked_account_id`)

## Trigger

Logged-in user views another user’s profile (`/profile/[id_text]`).

## Implementation anchor

[`apps/web/src/app/profile/[id_text]/ProfilePageClient.tsx`](../../../apps/web/src/app/profile/[id_text]/ProfilePageClient.tsx): `useEffect` when `loggedInAccount` exists and `loggedInAccount.id !== ssrAccount.id`.

## API

`POST` body `{ account_id_text }` → [`apps/api/src/controllers/stats/statsTrackEventAccount.ts`](../../../apps/api/src/controllers/stats/statsTrackEventAccount.ts).

## Optional backend hardening

Skip `_create` when JWT user id equals target account id (server-side defense); not required if client never calls for self.
