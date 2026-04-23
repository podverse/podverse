# Plan 02: Replace "Podverse" with `{brand_name}` in Podverse web i18n

## Scope

Replace all hardcoded "Podverse" brand name references with `{brand_name}` interpolation in `apps/web/i18n/originals/` across all 4 locales (en-US, es, fr, el-GR).

## Keys to Update (6 keys x 4 locales = 24 changes)

### 1. `boost_messages.login_required_to_send_boosts`

| Locale | Current | New |
|--------|---------|-----|
| en-US | `"Log in to Podverse to send boosts."` | `"Log in to {brand_name} to send boosts."` |
| es | `"Inicia sesion en Podverse para enviar boosts."` | `"Inicia sesion en {brand_name} para enviar boosts."` |
| fr | `"Connectez-vous a Podverse pour envoyer des boosts."` | `"Connectez-vous a {brand_name} pour envoyer des boosts."` |
| el-GR | `"Sunetheite sto Podverse gia na steilete boosts."` | `"Sunetheite sto {brand_name} gia na steilete boosts."` |

### 2. `metaboost.page_signup` (contains 2 occurrences of "Podverse")

| Locale | Replace both occurrences |
|--------|--------------------------|
| en-US | `"...in Podverse..."` → `"...in {brand_name}..."` AND `"...maintained by Podverse."` → `"...maintained by {brand_name}."` |
| es | Same pattern |
| fr | Same pattern |
| el-GR | Same pattern |

### 3. `metaboost.page_open_standard`

| Locale | Current | New |
|--------|---------|-----|
| en-US | `"...not just Podverse..."` | `"...not just {brand_name}..."` |
| es | Same pattern |
| fr | Same pattern |
| el-GR | Same pattern |

### 4. `about.intro_text`

| Locale | Current | New |
|--------|---------|-----|
| en-US | `"Podverse is a FOSS podcast manager..."` | `"{brand_name} is a FOSS podcast manager..."` |
| es | `"Podverse es un gestor..."` | `"{brand_name} es un gestor..."` |
| fr | `"Podverse est un gestionnaire..."` | `"{brand_name} est un gestionnaire..."` |
| el-GR | `"H Podverse einai..."` | `"H {brand_name} einai..."` |

### 5. `about.licensing_text`

| Locale | Current | New |
|--------|---------|-----|
| en-US | `"All Podverse software..."` | `"All {brand_name} software..."` |
| es | `"Todo el software de Podverse..."` | `"Todo el software de {brand_name}..."` |
| fr | `"Tous les logiciels Podverse..."` | `"Tous les logiciels {brand_name}..."` |
| el-GR | `"Olo to logismiko Podverse..."` | `"Olo to logismiko {brand_name}..."` |

### 6. `terms.never_sell_data`

| Locale | Current | New |
|--------|---------|-----|
| en-US | `"Podverse will never sell..."` | `"{brand_name} will never sell..."` |
| es | `"Podverse nunca vendera..."` | `"{brand_name} nunca vendera..."` |
| fr | `"Podverse ne vendra..."` | `"{brand_name} ne vendra..."` |
| el-GR | `"H Podverse den tha poulhsei..."` | `"H {brand_name} den tha poulhsei..."` |

## Files

- `apps/web/i18n/originals/en-US.json`
- `apps/web/i18n/originals/es.json`
- `apps/web/i18n/originals/fr.json`
- `apps/web/i18n/originals/el-GR.json`

## Verification

- Grep each file for remaining "Podverse" (case-sensitive) — only the already-interpolated keys (`send_to.app`, `app_donation_notice`, `app_not_configured`, `success_message`) should use `{brand_name}`, plus any `podverse.fm` domain references (handled in plan 03)
- No plain "Podverse" word should remain in values (excluding already-correct `{brand_name}` usages)
