# Plan 03 — long-lived mobile E2E API

Read and implement detail
[078-e2e-api-lifecycle](/docs/proposals/mobile/_master-plan_/details/078-e2e-api-lifecycle.md).

## Work

1. Add script(s) under `scripts/mobile/` (and root npm / Make wrappers) to:
   - Build helpers-config + api if required
   - Start API with `buildPodverseApiTestEnv({ profile: 'apiMobileE2e' })` +
     `PODVERSE_SKIP_DOTENV=true` on port **4230**
   - Optional: stop / PID / health check (TCP or HTTP)
2. Prefer a dedicated npm script (e.g. `mobile:e2e:api`) and/or Make `mobile_e2e_api` that does
   **not** run automatically from `mobile:e2e:test`.
3. Fail clearly if port 4230 is busy; never silently fall back to 4030.
4. Document the API terminal in HOW-TO-RUN / TEST-ENV (fifth process alongside Metro/devices/test).

## Done when

```bash
rg -n '4230|apiMobileE2e|mobile:e2e:api|mobile_e2e_api' scripts/mobile/ package.json makefiles/local/ apps/mobile/e2e/
```

Mark master-plan step **5.19** and Appendix C **078** → `done`; detail header → `done`.

Instruct the operator (do not run tests as the agent) to smoke-check after `make mobile_e2e_deps`:

```bash
make mobile_e2e_deps
# then start API via the new target/script and curl health on :4230
```
