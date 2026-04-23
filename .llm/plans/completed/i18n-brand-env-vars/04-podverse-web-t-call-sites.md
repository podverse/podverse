# Plan 04: Wire `brand_name` and `brand_domain` into Podverse web component t() calls

## Scope

After the i18n originals are updated (plans 02, 03) and the env var is added (plan 01), every component that calls `t()` with one of the modified keys must pass `{ brand_name: config.public.brand.name }` and/or `{ brand_domain: config.public.brand.domain }` as interpolation parameters.

## How brand_name/brand_domain is accessed

In Podverse web, the brand name is available via:

```typescript
import { getConfig } from '../config';
const config = getConfig();
config.public.brand.name   // the brand name
config.public.brand.domain // the brand domain (new, from plan 01)
```

## Existing pattern (already in codebase)

```typescript
// Already works this way for donate keys:
tDonate('app_donation_notice', { brand_name: config.public.brand.name })
```

## Keys that need wiring

### Keys using `{brand_name}` (from plan 02)

| i18n key | Namespace | t() call needs `{ brand_name }` |
|----------|-----------|--------------------------------|
| `boost_messages.login_required_to_send_boosts` | likely `boost_messages` or top-level | yes |
| `metaboost.page_signup` | `metaboost` | yes |
| `metaboost.page_open_standard` | `metaboost` | yes |
| `about.intro_text` | `about` | yes |
| `about.licensing_text` | `about` | yes |
| `terms.never_sell_data` | `terms` | yes |

### Keys using `{brand_domain}` (from plan 03)

| i18n key | Namespace | t() call needs `{ brand_domain }` |
|----------|-----------|-----------------------------------|
| `terms.audio_video_hosting` | `terms` | yes |
| `terms.clips_crowdsourced` | `terms` | yes |

## Steps

### 1. Find all call sites

Search `apps/web/src/` for each key name to find the component(s) that call `t()` with it. For each:

- If the component already imports `getConfig`, use `config.public.brand.name` / `config.public.brand.domain`
- If not, add the import and config access

### 2. Update each t() call

For keys using only `{brand_name}`:
```typescript
t('key', { brand_name: config.public.brand.name })
```

For keys using only `{brand_domain}`:
```typescript
t('key', { brand_domain: config.public.brand.domain })
```

For keys using both (none in this case, but pattern):
```typescript
t('key', { brand_name: config.public.brand.name, brand_domain: config.public.brand.domain })
```

### 3. Verify each component

After updating, confirm:
- The component imports `getConfig` (or receives config via props/context)
- The `t()` call includes the correct interpolation params
- TypeScript compiles without errors

## Key Files (to be discovered)

Search for each key in:
- `apps/web/src/app/**/*.tsx`
- `apps/web/src/components/**/*.tsx`

Common locations:
- `boost_messages.*` → likely in boost-related components
- `metaboost.*` → likely in metaboost page components
- `about.*` → likely in about page
- `terms.*` → likely in terms page

## Verification

- `grep -r 'login_required_to_send_boosts' apps/web/src/` — confirm t() call has `{ brand_name }`
- `grep -r 'page_signup' apps/web/src/` — confirm t() call has `{ brand_name }`
- `grep -r 'intro_text' apps/web/src/` — confirm t() call has `{ brand_name }`
- `grep -r 'audio_video_hosting' apps/web/src/` — confirm t() call has `{ brand_domain }`
- `grep -r 'clips_crowdsourced' apps/web/src/` — confirm t() call has `{ brand_domain }`
- TypeScript compilation succeeds
