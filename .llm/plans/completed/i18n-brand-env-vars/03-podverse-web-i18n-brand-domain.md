# Plan 03: Replace "podverse.fm" with `{brand_domain}` in Podverse web i18n

## Scope

Replace hardcoded domain "podverse.fm" with `{brand_domain}` interpolation in `apps/web/i18n/originals/` across all 4 locales.

## Keys to Update (2 keys x 4 locales = 8 changes)

### 1. `terms.audio_video_hosting`

| Locale | Current | New |
|--------|---------|-----|
| en-US | `"...found on podverse.fm load from..."` | `"...found on {brand_domain} load from..."` |
| es | `"...encontrados en podverse.fm se cargan..."` | `"...encontrados en {brand_domain} se cargan..."` |
| fr | `"...trouves sur podverse.fm proviennent..."` | `"...trouves sur {brand_domain} proviennent..."` |
| el-GR | `"...pou vriskontai sto podverse.fm fortwnoun..."` | `"...pou vriskontai sto {brand_domain} fortwnoun..."` |

### 2. `terms.clips_crowdsourced`

| Locale | Current | New |
|--------|---------|-----|
| en-US | `"...hosted on podverse.fm are crowd-sourced..."` | `"...hosted on {brand_domain} are crowd-sourced..."` |
| es | `"...alojados en podverse.fm son obtenidos..."` | `"...alojados en {brand_domain} son obtenidos..."` |
| fr | `"...heberges sur podverse.fm sont collectes..."` | `"...heberges sur {brand_domain} sont collectes..."` |
| el-GR | `"...pou filoksenountai sto podverse.fm einai..."` | `"...pou filoksenountai sto {brand_domain} einai..."` |

## Files

- `apps/web/i18n/originals/en-US.json`
- `apps/web/i18n/originals/es.json`
- `apps/web/i18n/originals/fr.json`
- `apps/web/i18n/originals/el-GR.json`

## Verification

- Grep each file for "podverse.fm" — should return zero matches
- Grep each file for `{brand_domain}` — should find exactly 1 occurrence per locale (2 keys total per locale)
