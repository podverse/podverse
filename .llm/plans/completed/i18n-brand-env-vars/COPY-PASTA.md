# i18n Brand Env Vars — Copy-Pasta Prompts

## Execution Rules

**SEQUENTIAL PHASES** — each phase must COMPLETE before the next:
- Phase 1 -> WAIT -> Phase 2 -> WAIT -> Phase 3 -> WAIT -> Phase 4

**DO NOT** run phases simultaneously.
**DO** run steps within a phase simultaneously where marked "(parallel)".

---

## PHASE 1: Env Var Infrastructure (Sequential)

### Step 1: Podverse env var

```
Read and execute .llm/plans/active/i18n-brand-env-vars/01-podverse-env-brand-domain.md

Add NEXT_PUBLIC_BRAND_DOMAIN env var to the Podverse runtime config pipeline (sidecar .env.example, brand override, setup.sh, config/index.ts, K8s envs, runtime config types).

Verify: grep -r "NEXT_PUBLIC_BRAND_DOMAIN" apps/web/sidecar/.env.example apps/web/src/config/
```

### Step 2: Metaboost env var

```
Read and execute .llm/plans/active/i18n-brand-env-vars/06-metaboost-env-brand-domain.md

Add WEB_BRAND_DOMAIN env var to the Metaboost classification pipeline (base.yaml, runtime config types, config helpers) for both web and management-web.

Verify: grep -r "WEB_BRAND_DOMAIN" infra/env/classification/base.yaml apps/web/src/config/ apps/management-web/src/config/
```

---

## PHASE 2: i18n String Replacements (Parallel — all 5 can run simultaneously)

These edit different files with no overlap.

### Agent 2A: Podverse web brand name

```
Read and execute .llm/plans/active/i18n-brand-env-vars/02-podverse-web-i18n-brand-name.md

Replace hardcoded "Podverse" with {brand_name} in apps/web/i18n/originals/ across all 4 locales (en-US, es, fr, el-GR). 6 keys per locale.

Verify: grep -c "Podverse" apps/web/i18n/originals/en-US.json should show only podverse.fm domain refs and existing {brand_name} usages.
```

### Agent 2B: Podverse web brand domain

```
Read and execute .llm/plans/active/i18n-brand-env-vars/03-podverse-web-i18n-brand-domain.md

Replace hardcoded "podverse.fm" with {brand_domain} in apps/web/i18n/originals/ across all 4 locales. 2 keys per locale.

Verify: grep -c "podverse.fm" apps/web/i18n/originals/en-US.json should return 0.
```

### Agent 2C: Podverse management-web

```
Read and execute .llm/plans/active/i18n-brand-env-vars/05-podverse-mgmt-web-i18n.md

Replace hardcoded "Podverse" with {brand_name} in apps/management-web/i18n/originals/ (4 locales, 2 keys). Also wire t() call sites with brand_name interpolation.

Verify: grep -c "Podverse" apps/management-web/i18n/originals/en-US.json should return 0.
```

### Agent 2D: Metaboost web i18n

```
Read and execute .llm/plans/active/i18n-brand-env-vars/07-metaboost-web-i18n.md

Replace hardcoded "Metaboost"/"MetaBoost" with {brand_name} in apps/web/i18n/originals/ (en-US, es). Remove dead appTitle key from originals and overrides.

Verify: grep -i "Metaboost" apps/web/i18n/originals/en-US.json should only show technical references (podcast:metaBoost XML tags).
```

### Agent 2E: Metaboost management-web i18n

```
Read and execute .llm/plans/active/i18n-brand-env-vars/09-metaboost-mgmt-web-i18n.md

Replace hardcoded "MetaBoost" with {brand_name} in apps/management-web/i18n/originals/ (en-US, es). Remove dead appTitle key. Wire t() call sites.

Verify: grep -c "MetaBoost" apps/management-web/i18n/originals/en-US.json should return 0.
```

---

## PHASE 3: Component t() Call-Site Wiring (Sequential — Podverse first, then Metaboost)

### Step 3A: Podverse web t() calls

```
Read and execute .llm/plans/active/i18n-brand-env-vars/04-podverse-web-t-call-sites.md

Find every component in apps/web/src/ that calls t() with the updated i18n keys and add { brand_name: config.public.brand.name } and/or { brand_domain: config.public.brand.domain } interpolation params.

Core rule: Every t() call that uses a key containing {brand_name} or {brand_domain} must pass those params.

Verify: grep -r "brand_name" apps/web/src/ and grep -r "brand_domain" apps/web/src/ — confirm all call sites are wired.
```

### Step 3B: Metaboost web t() calls

```
Read and execute .llm/plans/active/i18n-brand-env-vars/08-metaboost-web-t-call-sites.md

Find every component in apps/web/src/ that calls t() with the updated i18n keys and add { brand_name } interpolation param. The brand name is available from getWebBrandName() or runtimeConfig.

Core rule: Every t() call that uses a key containing {brand_name} must pass the param.

Verify: grep -r "brand_name" apps/web/src/ — confirm all call sites are wired.
```

---

## PHASE 4: Compile and Validate (Metaboost only)

### Step 4: Sync, compile, validate

```
Read and execute .llm/plans/active/i18n-brand-env-vars/10-metaboost-i18n-compile.md

Run npm run i18n:sync, npm run i18n:compile, npm run i18n:validate in the Metaboost repo. Confirm no errors and all keys are in parity.

Verify: npm run i18n:validate passes.
```
