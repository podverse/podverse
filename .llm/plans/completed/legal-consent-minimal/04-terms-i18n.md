# Phase 4 — Terms i18n + `/terms` page

## Goal

Minimal, readable Terms of Service with legal entity name and tracking
disclosure. All user-facing copy in i18n.

## i18n namespace `terms` (en-US first)

Restructure `apps/web/i18n/originals/en-US.json`:

### Keep (lightly edit)

Existing bullets: `never_sell_data`, `no_ads_without_permission`,
`audio_video_hosting`, `third_party_feeds`, `clips_crowdsourced`,
`clips_load_full_episode`, `reduced_size_images`.

### Add sections

| Key | Purpose | ICU vars |
| --- | --- | --- |
| `legal_entity_heading` | Prominent legal name line | `{legal_name}` |
| `service_intro` | One sentence who operates the service | `{legal_name}`, `{brand_name}` |
| `data_service_necessary` | Queue/resume/auth — no separate consent | `{brand_name}` |
| `data_listen_stats_heading` | Subheading for popularity tracking | — |
| `data_listen_stats_body` | Pseudonymous GUID, trending, opt-in/out | `{legal_name}`, `{retention_days}` |
| `data_listen_stats_anonymization` | Explain `account_guid` not public identity | — |
| `data_web_analytics` | Cloudflare only with cookie consent | `{brand_name}` |
| `data_retention` | Raw events deleted after N days | `{retention_days}` |
| `data_requests` | Contact for access/delete | `{contact_email}` |
| `cookie_choices_heading` | Explains banner options | — |
| `cookie_choice_all` / `_help` | Accept all | — |
| `cookie_choice_features` / `_help` | Features only | — |
| `cookie_choice_essential` / `_help` | Essential only | — |

Keep copy **short** — one or two sentences per bullet.

### Namespace `cookie_consent` (for banner)

| Key | Purpose |
| --- | --- |
| `banner_message` | One-line intro + link text for terms |
| `accept_all` / `accept_all_help` | Button + subtitle |
| `features_only` / `features_only_help` | Button + subtitle |
| `essential_only` / `essential_only_help` | Button + subtitle |

## Page update

`apps/web/src/app/terms/page.tsx`:

1. Render `legal_entity_heading` first (larger type via existing layout
   or a single `h2` + paragraph — no new design system)
2. Group sections with `<section>` + headings from i18n
3. Pass vars from `getConfig()`:

```typescript
const config = getConfig();
// legal_name, brand_name, brand_domain, retention_days, contact_email
```

## Sync locales

Add keys to `en-US.json` only in this phase; CI i18n workflow generates
`es`, `fr`, `el-GR` on merge to develop (or run `npm run i18n:all` locally).

## Exit criteria

- `/terms` renders all sections with config-driven values
- No hardcoded English in components
- Legal name appears above tracking section

## Verification

```bash
./scripts/nix/with-env npm run i18n:validate
./scripts/nix/with-env npm run lint -w apps/web
```

Manual: visit `/terms` locally with `NEXT_PUBLIC_LEGAL_NAME` set.
