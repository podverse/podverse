# Plan 05 — Master plan + CI + checklist

## Work

1. Mark steps 5.14–5.16 and details 073–075 done in master plan + Appendix C.
2. Update `.github/workflows/mobile-e2e-stub.yml` to boot E2E iOS name.
3. Update `MOBILE-PG3-VERIFICATION-CHECKLIST.md` and flow header comments for dual matrix.
4. Note in TBD E2E details (where they only cite `"iPhone 17 Pro"`) that Maestro Make uses E2E slots — prefer patching `062` / operator docs rather than every future TBD unless they hardcode make targets incorrectly.

## Done when

```bash
rg -n '5\.1[456]|073-e2e|074-e2e|075-e2e' docs/proposals/mobile/_master-plan_/001-MASTER-PLAN.md
rg -n 'iPhone 17 Pro E2E' .github/workflows/mobile-e2e-stub.yml
```
