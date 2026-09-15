# 722-popularity-tracking-consent

**Master step:** P2.1.8 / P2.1.10
**Status:** done

## Scope

Account-level, versioned Popularity Tracking consent for consumer web and mobile. Logged-in users
who have never decided, or who previously accepted an older agreement version, are blocked until
they choose Yes or No. A decline is sticky across later version bumps. Tracking is allowed only
when the last decision is accept of the current server version.

Anonymous visitors are never prompted and never tracked as unique listeners.

## Surfaces

- Consumer web: `/popularity-tracking` gate and Account settings (Learn more expands the rest of the agreement on the same screen)
- Mobile: full-screen gate after login and More → Settings → Popularity Tracking
- API: `GET /legal/popularity-tracking` and `PATCH /account-settings/listen-stats` `{ accepted }`

## Out of scope

- Management CMS for the agreement copy
- Changing how aggregated stats are computed
- Prompting signed-out visitors
