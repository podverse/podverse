# Execution order — mobile-e2e-green

Execute the numbered plans in this order. After each, move the plan file from
`active/` to the mirrored `completed/` path and tick its box in `COPY-PASTA.md`.

1. **01-deep-link-push-routing.md** — Root-cause + fix the Android
   `podverse-next://podcast/<id>` foreground routing regression. Re-run `deep-link` and
   `push` until both pass on Android (and iOS, given step 2).
2. **02-ios-connect-flakiness.md** — Restart Metro + cold-boot a fresh `iPhone 17 Pro E2E`;
   re-run `deep-link`, `push`, `opml` in isolation on iOS. If still flaky, bump the iOS
   `TIMEOUT_SLOWEST` and/or `launch-and-connect` `maxRetries`.
3. **03-tablet-flow.md** — Create/boot tablet E2E devices, install, run `tablet`.
4. **Final confirm** — Re-run `deep-link`, `push`, `opml`, `tablet`; optionally a full
   `npm run mobile:e2e:test:all` for the phone matrix. Then archive the whole set to
   `.llm/plans/completed/phase-1/mobile-e2e-green/` and end with cumulative verification commands
   (see COPY-PASTA.md).

## Preconditions (leave-running before any flow)

- Mobile Metro: `npm run mobile:dev:e2e`
- Mobile E2E API: `npm run mobile:e2e:api` (`:4230`, `fixturesEnabled:true`)
- Mobile E2E test-assets: `npm run mobile:e2e:test-assets` (`:2111`)
- Phones installed: `npm run mobile:e2e:ios`, `npm run mobile:e2e:android`
