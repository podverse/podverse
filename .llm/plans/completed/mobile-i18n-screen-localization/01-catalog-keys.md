# 01 — Catalog keys (reuse first + mobile overlay)

## Scope

Add any **missing** en-US keys required for auth + nav product UI. Prefer existing
`consumer` / `shared` keys. Put mobile-only chrome in the currently empty
`packages/i18n-catalog/mobile/originals/en-US.json`. Run `npm run i18n:compile` so Metro can
import compiled JSON.

Do **not** wire screens in this plan (that is 02 / 03).

## Reuse inventory (do not re-add these)

| Key | Typical mobile use |
| --- | ------------------ |
| `authentication.login` | Login title / CTA |
| `authentication.logout` | Log out |
| `authentication.sign_up` | Sign up title / CTA |
| `authentication.email` | Email label |
| `authentication.password` | Password label |
| `authentication.confirm_password` | Confirm password |
| `authentication.invalid_email_or_password` | Login 401 |
| `authentication.invalid_email` | Signup validation |
| `authentication.invalid_password` | Signup validation |
| `authentication.password_mismatch` | Signup validation |
| `authentication.account_created_message` | Signup success |
| `misc.loading` | Submit button loading |
| `misc.submit` | Login submit |
| `misc.close` | Full player close (if titled) |
| `features.search.search` | Search tab/stack |
| `features.my_library` | My Library |
| `features.add_by_rss.label` | Add by RSS |
| `features.queue.queue` | Queue |
| `features.history.history` | History |
| `features.playlist.playlists` | Playlists |
| `features.profile` | Profile |
| `info.about` / consumer about keys | About — pick the existing product key used by web |
| `membership.membership` | Membership |
| `settings.settings` | Settings |
| `media.podcast.podcast` | Podcast |
| `media.podcast.episode` | Episode |
| `features.clip.clip` | Clip |

Confirm exact paths in `packages/i18n-catalog/consumer/originals/en-US.json` and
`shared/originals/en-US.json` before inventing new ones. CI rejects duplicate leaf paths across
layers.

## Keys to add (if missing after audit)

### Consumer (`consumer/originals/en-US.json`) — shared auth copy

Add only when web should share the same string. Suggested names (adjust to match catalog style;
snake_case under `authentication`):

| Suggested key | en-US (preserve intent of current mobile stubs) |
| ------------- | ----------------------------------------------- |
| `authentication.need_an_account_sign_up` | Need an account? Sign up |
| `authentication.already_have_an_account_log_in` | Already have an account? Log in |
| `authentication.create_account` | Create account |
| `authentication.could_not_sign_in` | Could not sign in. Please try again. |
| `authentication.session_expired` | Session expired. Please log in again. |
| `authentication.signed_in_account_load_failed` | Signed in, but could not load account details. |
| `authentication.mobile_api_not_configured` | Mobile API is not configured. |

If a near-duplicate already exists, reuse it instead of adding.

### Mobile overlay (`mobile/originals/en-US.json`) — RN chrome only

Example shape (flat under `nav` — final nesting is implementer’s call if a clear pattern exists):

```json
{
  "nav": {
    "tab": {
      "home": "Home",
      "more": "More",
      "rss": "RSS",
      "downloads": "Downloads"
    },
    "stack": {
      "home": "Home",
      "search_result": "Search Result",
      "rss_feeds": "RSS Feeds"
    }
  }
}
```

Only add keys that are not already expressible via consumer `features.*` / etc.

Also mirror empty/structure-safe stubs into other locale `originals` only if existing mobile
`es`/`fr`/`el-GR` files require parity for validate — prefer `npm run i18n:compile` override sync
+ leave non–en-US translation to `i18n:all` / CI. Do not invent empty `originals` strings
(overrides use `""`).

## Steps

1. Audit LoginScreen, SignUpScreen, HelloWorld auth CTAs, and navigation titles against
   consumer/shared.
2. Add missing keys to the correct layer’s `originals/en-US.json` only.
3. From monorepo root: `npm run i18n:compile` (and `npm run i18n:validate` if consumer keys
   changed enough to risk duplicates).
4. Do not commit generated `compiled/` (gitignored).

## Acceptance criteria

- Every product string planned for 02/03 has a catalog key.
- No duplicate leaf path across `shared` / `consumer` / `mobile`.
- `npm run i18n:compile` succeeds; mobile Metro can resolve `apps/mobile/i18n/compiled/*.json`.

## Verification (operator)

```bash
npm run i18n:compile
npm run i18n:validate
```
