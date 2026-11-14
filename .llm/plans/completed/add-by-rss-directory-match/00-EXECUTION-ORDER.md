# Add by RSS directory match — execution order

Request: [00-REQUEST.md](00-REQUEST.md). Ledger and settled decisions: [00-SUMMARY.md](00-SUMMARY.md).
Prompts and models: [COPY-PASTA.md](COPY-PASTA.md).

The set runs in this checkout, on the current branch. Six plans, one per phase, in order. Every
prompt runs alone, so each one writes its own scratchpad entry.

## Rules for every prompt

- Read and execute your plan. `00-SUMMARY.md` § Settled decisions is decided; do not reopen it.
  When the code disagrees with a path or line number in the plan, trust the code, follow the
  plan's intent, and say what differed in your final message.
- Do not run tests. Add or update the tests your plan's `## Tests` names. You may type-check or
  lint only the workspaces you edited.
- Never run `git commit`, `git push`, `gh`, `npm publish`, or release scripts.
- Append your plan's `## Release scratchpad` entry to the end of `release-notes/scratchpad.md`.
  Do not edit any other entry.
- Comments follow **comments-future-forward**: no plan numbers and no `.llm/plans/` paths in code.
- UI copy follows **ui-copy-casing**; catalog strings follow **i18n-user-facing-strings**
  (no empty strings in `originals/`).
- No `any`, no `==`, minimal `as`, `import type` for types, named exports.
- If you stop for a product question the plan does not answer, end with
  `RUNNER-STATUS: BLOCKED — <question>`.

## Phases

| Phase | Prompt | Model · reasoning | Why it waits |
| --- | --- | --- | --- |
| 1 | 01 match route | Cursor Grok 4.7 · high | nothing |
| 2 | 02 account conversion | Cursor Grok 4.7 · extra high | 01 (ORM match, DTOs) |
| 3 | 03 mobile signed out | Cursor Grok 4.7 · extra high | 01 (route client, URL helper, fixture) |
| 4 | 04 mobile signed in | Cursor Grok 4.7 · extra high | 02 (convert route), 03 (`addByRssPromotion`, `syncJobs.ts`) |
| 5 | 05 web | Cursor Grok 4.7 · high | 02 (follow response, convert route) |
| 6 | 06 docs and close | Cursor Grok 4.7 · medium | 01–05 |

03 and 05 edit disjoint files and could share a phase. They are kept apart so every prompt
writes the scratchpad itself.

## Relation to other active plans

- `v4-flagged-feed-block` 02 edits `accountFollowingAddByRSSChannel.ts`. Whichever lands second
  keeps the blocked-feed check before the directory match.
- `account-add-by-rss-cap-100`: a matched add is not an Add by RSS feed and does not count.
- `account-follow-cap-500`: when it ships, a conversion at the follow limit keeps the Add by
  RSS follow and returns `converted: false` with reason `follow_limit`; that plan owns the change.
- `v4-signed-out-carryover` runs after this set and reuses `POST /channel/add-by-rss-match`,
  `getForFeedUrls`, and `addByRssPromotion`.

## Cumulative verification

The operator runs this once, after prompt 06.

**Root** tab:

```bash
npm run build:packages
npm run test -w packages/helpers-validation
npm run test -w packages/orm -- src/services/account/accountAddByRSSDirectoryConversion.test.ts
npm run test -w apps/api -- src/test/channel-add-by-rss-match.integration.test.ts src/test/account-add-by-rss-convert.integration.test.ts src/test/api-key-routes-account-subscriptions-add-by-rss.integration.test.ts
npm run test -w apps/web -- src/utils/addByRSS/directoryPromotion.test.ts src/utils/addByRSS/actions.test.ts
npm --prefix apps/mobile run test -- src/lib/addByRss/directoryMatch.test.ts src/data/addByRssPromotionRemap.test.ts
npm run type-check:mobile
npm run lint
make e2e_test_web_report_spec SPEC=e2e/add-by-rss-directory-match.spec.ts
open .artifacts/e2e-reports/latest/index.html
```

**Mobile Maestro** tab (with **Mobile E2E Metro**, **Mobile E2E iOS**, and **Mobile E2E API**
already running):

```bash
npm run mobile:e2e:test -- add-by-rss-directory-match-anonymous
npm run mobile:e2e:test -- add-by-rss-directory-match-signed-in
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
```
