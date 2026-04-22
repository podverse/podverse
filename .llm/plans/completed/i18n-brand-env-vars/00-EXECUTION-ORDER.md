# Execution Order — i18n Brand Env Vars

## Phase 1: Env Var Infrastructure (Sequential — Podverse first, then Metaboost)

These must complete before any i18n changes because components need the config values available.

1. **`01-podverse-env-brand-domain.md`** — Add `NEXT_PUBLIC_BRAND_DOMAIN` env var to Podverse
2. **`06-metaboost-env-brand-domain.md`** — Add `WEB_BRAND_DOMAIN` env var to Metaboost

## Phase 2: i18n String Replacements (Parallel across repos)

Podverse and Metaboost i18n changes are independent. Within each repo, web and management-web are independent. But t() call-site wiring depends on the i18n strings being updated first.

**Podverse** (run 02, 03, 05 in parallel — they edit different files):
- **`02-podverse-web-i18n-brand-name.md`** — Replace "Podverse" in web i18n originals
- **`03-podverse-web-i18n-brand-domain.md`** — Replace "podverse.fm" in web i18n originals
- **`05-podverse-mgmt-web-i18n.md`** — Replace "Podverse" in management-web i18n originals + wire t() calls

**Metaboost** (run 07, 09 in parallel — they edit different files):
- **`07-metaboost-web-i18n.md`** — Replace "Metaboost" in web i18n originals + remove appTitle
- **`09-metaboost-mgmt-web-i18n.md`** — Replace "MetaBoost" in management-web i18n originals + remove appTitle + wire t() calls

## Phase 3: Component t() Call-Site Wiring (Sequential after Phase 2)

These depend on Phase 1 (env vars) AND Phase 2 (i18n strings updated).

- **`04-podverse-web-t-call-sites.md`** — Wire brand_name/brand_domain into web component t() calls
- **`08-metaboost-web-t-call-sites.md`** — Wire brand_name into web component t() calls

## Phase 4: Compile and Validate (Metaboost only)

- **`10-metaboost-i18n-compile.md`** — Run sync, compile, validate

## Summary

```
Phase 1 (sequential):  01 → 06
Phase 2 (parallel):    02 | 03 | 05 | 07 | 09
Phase 3 (sequential):  04 → 08
Phase 4 (sequential):  10
```
