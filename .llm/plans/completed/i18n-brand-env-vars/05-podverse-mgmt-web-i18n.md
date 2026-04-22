# Plan 05: Replace "Podverse" in Podverse management-web i18n + wire t() calls

## Scope

1. Replace hardcoded "Podverse" with `{brand_name}` in `apps/management-web/i18n/originals/` across all 4 locales
2. Wire the interpolation parameters into the component t() call sites

## Part A: i18n String Replacements

### Keys to update (2 keys x 4 locales = 8 changes)

#### 1. `app.name`

| Locale | Current | New |
|--------|---------|-----|
| en-US | `"Podverse Management"` | `"{brand_name} Management"` |
| es | `"Gestion de Podverse"` | `"Gestion de {brand_name}"` |
| fr | `"Gestion de Podverse"` | `"Gestion de {brand_name}"` |
| el-GR | `"Diacheirish Podverse"` | `"Diacheirish {brand_name}"` |

#### 2. `app.description`

| Locale | Current | New |
|--------|---------|-----|
| en-US | `"Administrative management interface for Podverse"` | `"Administrative management interface for {brand_name}"` |
| es | `"Interfaz de gestion administrativa para Podverse"` | `"Interfaz de gestion administrativa para {brand_name}"` |
| fr | `"Interface de gestion administrative pour Podverse"` | `"Interface de gestion administrative pour {brand_name}"` |
| el-GR | `"Diacheiristiko periballon gia to Podverse"` | `"Diacheiristiko periballon gia to {brand_name}"` |

### Files

- `apps/management-web/i18n/originals/en-US.json`
- `apps/management-web/i18n/originals/es.json`
- `apps/management-web/i18n/originals/fr.json`
- `apps/management-web/i18n/originals/el-GR.json`

## Part B: Wire t() Call Sites

### How brand_name is accessed in management-web

In Podverse management-web, the brand name is available via `NEXT_PUBLIC_BRAND_NAME` from runtime config. Check how the management-web config exposes it (may be similar to web with `getConfig()` or a different pattern).

### Steps

1. Find all call sites that use `app.name` or `app.description` keys
2. For each, add `{ brand_name }` interpolation param using the config value
3. If the component doesn't currently access the config, add the necessary import

### Verification

- Grep `apps/management-web/i18n/originals/` for "Podverse" — should return zero matches
- Grep `apps/management-web/src/` for `app.name` and `app.description` usage — confirm t() calls have `{ brand_name }`
- TypeScript compilation succeeds
