# Follow limit — execution order

Request: [00-REQUEST.md](00-REQUEST.md). The specification:
[01-enforce-follow-tier.md](01-enforce-follow-tier.md). Prompts: [COPY-PASTA.md](COPY-PASTA.md).

One plan. Runs in this checkout after `account-add-by-rss-cap-100`. That set, and
`v4-signed-out-carryover` prompt 03, must already be complete: this plan edits the same
management screen and the v4 library copy, and it counts the directory follows that prompt 03
creates from matching Add by RSS URLs.

## Rules

- Read and execute the plan. Doc 07's migration rule wins where this plan and the code disagree:
  the smallest tier that covers the count, never Unlimited, and a count past 10000 is
  `needs_operator`.
- The library copy still copies every follow. This plan adds the matched Add by RSS addresses
  to the tier count. It does not drop follows during the copy.
- At the tier, a conversion keeps the Add by RSS follow and returns `converted: false` with
  reason `follow_limit`. Clients treat that like `no_match`.
- Do not run tests. Append the plan's scratchpad entry. Do not commit.
- This prompt is last: move the set to `.llm/plans/completed/account-follow-cap-500/`.

## Cumulative verification

The operator runs this once, after the prompt, from the **Root** tab. Use the test files the
prompt's final message names; these commands cover the workspaces the plan edits:

```bash
npm run build:packages
npm run test -w packages/helpers
npm run test -w packages/orm -- src/services/account
npm run test -w apps/api
npm run test -w apps/workers -- src/commands/orm/v4Library
npm run test -w apps/web
npm --prefix apps/mobile run test
npm run lint
```
