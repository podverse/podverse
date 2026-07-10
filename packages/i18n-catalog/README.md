# `@podverse/i18n-catalog`

Layered translation **source of truth** for web, management-web, and mobile.

## Layers

| Layer         | Contents                                                                           |
| ------------- | ---------------------------------------------------------------------------------- |
| `shared/`     | Cross-app: `language.*`, shared `errors.*`, shared `misc.*`, `settings.ui_theme.*` |
| `consumer/`   | Web + mobile consumer keys                                                         |
| `management/` | Management-web-only keys                                                           |
| `mobile/`     | Mobile-only overlay keys (may be empty `{}`)                                       |

Each layer has:

- `originals/` — committed source (en-US hand-authored; other locales LLM-generated)
- `overrides/` — committed human corrections (empty string = use originals)
- `compiled/` — generated per layer (gitignored)

## Merge order

Later layers win on conflicts. Duplicate key paths between layers are rejected by
`i18n:validate`.

| App                   | Layers (later wins)              |
| --------------------- | -------------------------------- |
| `apps/web`            | `shared` → `consumer`            |
| `apps/management-web` | `shared` → `management`          |
| `apps/mobile`         | `shared` → `consumer` → `mobile` |

## App runtime outputs (generated, not authoring)

`i18n:compile` writes merged JSON for each app:

- `apps/web/i18n/compiled/*.json`
- `apps/management-web/i18n/compiled/*.json`
- `apps/mobile/i18n/compiled/*.json`

Those directories must only contain **compiled** bundles. Do **not** add
`originals/` or `overrides/` under `apps/*/i18n/`.

## Scripts (from monorepo root)

```bash
npm run i18n:translate
npm run i18n:compile
npm run i18n:validate
```

`i18n:validate` checks:

- Required locales exist per layer (`en-US`, `es`, `fr`, `el-GR`)
- Override structure matches originals
- Key parity and order within each layer
- No duplicate leaf key paths across `shared`+`consumer`, `shared`+`management`, or
  `consumer`+`mobile`
