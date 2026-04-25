---
description: "Give terminal/npm commands relative to monorepo root"
applyTo: "**"
---

# Commands From Monorepo Root

**Always give runnable commands relative to the root of the Podverse monorepo.** Do not instruct users to `cd` into `apps/workers`, `apps/api`, or other workspaces first.

**Copy button:** Always put runnable commands inside a **fenced code block** (e.g. ` ```bash ` … ` ``` `) so the IDE shows a copy button next to them. Never give only inline commands when the user might want to run them.

**Verification commands:** When your response includes steps the user should run (e.g. to verify a change, smoke-test, or apply something), always end the response with a fenced code block containing the exact, copy-pasteable command(s). Do not omit this block or describe commands only in prose.

## Do

- Put every runnable command in a fenced code block so a copy button appears.
- When you change flake, env, or scripts and the user will want to run something to verify, end with a fenced code block containing the exact command(s) to run.
- When giving verification or run instructions (smoke test, apply, confirm), always provide a final fenced code block with one command per line so the user can copy-paste.
- From repo root: `npm run <script> -w apps/workers -- <args>`
- From repo root: `npm run build:packages` then `npm run build -w apps/workers`
- From repo root: `node apps/workers/dist/index.js devPiBulkFeedsAddFromFile -startId 1 -endId 10 -q rss-slow` (uses hardcoded path `infra/data/dev/podcast-index-feeds` relative to monorepo root)
- From repo root: `npm run workers:parse_trending_feeds --` (optionally with `-max N` after `--`; run after `npm run build -w apps/workers`); same as `devParserRSSParseTrendingFeeds`

## Don't

- Don't say: "cd apps/workers" then "npm run dev_pi_bulk_feeds_add_from_file -- ..."
- Don't give app-specific commands that assume the user is already inside an app directory

## Examples

**Workers (devPiBulkFeedsAddFromFile):**

```bash
npm run dev_pi_bulk_feeds_add_from_file -w apps/workers -- -startId 1 -endId 10 -q rss-slow
```

**Building a single app:**

```bash
npm run build -w apps/workers
```

**Running any workspace script from root:**

```bash
npm run <script-name> -w <workspace> -- [args]
```

This keeps instructions copy-pasteable from repo root and avoids confusion about where `.env` and default paths resolve. Using fenced code blocks ensures the UI shows a copy button for each command.
