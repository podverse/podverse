# Catalog i18n (no OpenAI translate)

When adding or changing user-facing copy:

1. Edit `packages/i18n-catalog/<layer>/originals/en-US.json`.
2. Add the same keys in that layer's `es.json`, `fr.json`, and `el-GR.json` (real translations; each language's capitalization; keep `{placeholders}` identical).
3. Never edit `packages/i18n-catalog/*/overrides/` — operator-only corrections.
4. Do not add an OpenAI/API translate step. Compile with `npm run i18n:compile`; check with `npm run i18n:validate`.

Layers: `shared` (cross-app), `consumer` (web + mobile), `management` (management-web), `mobile` (RN overlay).

Full policy: **i18n-management**, **i18n-user-facing-strings**, **ui-copy-casing**.
