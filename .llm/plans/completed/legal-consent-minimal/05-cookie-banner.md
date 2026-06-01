# Phase 5 — Cookie consent banner + analytics gating

## Goal

Device-level cookie consent (env-gated, default off). Gate Cloudflare Web
Analytics on **Accept all** only.

## localSettings extension

In `apps/web/src/utils/localSettings/localSettings.ts`:

```typescript
export type CookieConsentChoice = 'all' | 'features' | 'essential';

export type CookieConsentState = {
  choice: CookieConsentChoice;
  at: string; // ISO timestamp
};

// LocalSettingsState:
cc?: CookieConsentState;
```

- Update `isValidLocalSettings` to allow optional `cc` with valid shape
- Add `setCookieConsent(choice)` helper via `handleLocalSettingsUpdate`
- Expose in `LocalSettings` context (`contexts/LocalSettings.tsx`)

## CookieConsentBanner component

New files:

- `apps/web/src/components/Banner/CookieConsentBanner.tsx`
- `apps/web/src/styles/components/Banner/CookieConsentBanner.module.scss`

Behavior:

- Render only when `config.public.cookieConsent.bannerEnabled === true`
  AND `localSettings.cc` is undefined
- Fixed bottom bar (does not block page scroll entirely; z-index above content)
- Three buttons with help text from `cookie_consent` i18n namespace
- Link to `ROUTES.TERMS`
- On click: persist choice, hide banner

**Essential only behavior (v1):**

- Do not load Cloudflare beacon
- Avoid writing new non-essential preference cookies after choice (document
  limitation: existing `local-settings` may already exist — acceptable v1)

**Features only:**

- No analytics; allow existing feature cookie behavior unchanged

**Accept all:**

- Allow Cloudflare + feature cookies

## Consent-gated integrations

1. Remove from `apps/web/src/app/layout.tsx` `<head>`:

```tsx
<IntegrationsWebScripts integrations={runtimeConfig.integrations} />
```

2. Add `apps/web/src/components/Integrations/ConsentGatedIntegrations.tsx`:

- Client component
- `useLocalSettings()` + `useConfig()`
- If banner disabled OR `cc.choice === 'all'`: render
  `<IntegrationsWebScripts integrations={...} />`
- If banner enabled and no choice yet: render nothing (wait for banner)
- If `features` or `essential`: render nothing

Mount inside `Providers` body (not SSR head) so consent is readable.

## Layout mount

In `layout.tsx` inside `PageWrapper`, after `MembershipExpiredBanner`:

```tsx
<CookieConsentBanner />
```

## Exit criteria

- Banner hidden when env off (default)
- Banner shows three options when env `"true"` and no prior choice
- Cloudflare beacon only loads after Accept all (when integration enabled)
- Existing `cloudflare-web-analytics-disabled` E2E still passes unchanged

## Verification

```bash
./scripts/nix/with-env npm run lint -w apps/web
```

Manual with `NEXT_PUBLIC_COOKIE_CONSENT_BANNER_ENABLED="true"` and
`CLOUDFLARE_WEB_ANALYTICS_ENABLED="true"`: confirm beacon element count.
