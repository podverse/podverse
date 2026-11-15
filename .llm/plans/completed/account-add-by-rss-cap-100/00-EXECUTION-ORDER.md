# Add by RSS limit — execution order

Request: [00-REQUEST.md](00-REQUEST.md). The specification:
[01-enforce-add-by-rss-tier.md](01-enforce-add-by-rss-tier.md). Prompts:
[COPY-PASTA.md](COPY-PASTA.md).

One plan. Runs in this checkout after `add-by-rss-directory-match`, `v4-flagged-feed-block`, and
`v4-signed-out-carryover` prompt 03. Those edit the Add by RSS follow controller and the v4
library copy this plan also edits.

`account-follow-cap-500` runs after this set. It owns the directory-follow limit.

## Rules

- Read and execute the plan. Doc 07's migration rule wins where this plan and the code disagree:
  the smallest tier that covers the count, never Unlimited, and a library past 10000 is
  `needs_operator`.
- A URL that matches a directory channel is not an Add by RSS feed and does not count. Keep that
  match ahead of the cap check.
- Do not run tests. Append the plan's scratchpad entry. Do not commit.
- This prompt is last: move the set to `.llm/plans/completed/account-add-by-rss-cap-100/`.

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
