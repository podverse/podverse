# Local Parser Worker Feed Test Flow

This guide gives one end-to-end local flow to:

- create local test feeds,
- parse them through workers,
- mutate feeds and parse updates,
- force reparse existing feeds,
- compare transaction-enabled vs non-transaction parsing behavior.

All commands are run from the monorepo root.

## 1) One-time setup for this session

Make sure worker dependencies are built and your workers env file exists (`apps/workers/.env`).

```bash
npm run build:packages
npm run build -w apps/workers
```

## 2) Start the local test-assets feed server

Run this in a dedicated terminal and keep it running:

```bash
npm run dev:test-assets
```

## 3) Create local feeds and seed the DB (Podcast Index bypass)

Run in another terminal. This generates local RSS/media assets and parses them into the DB using parser `testAssetsMode` (mock Podcast Index service, no Podcast Index API requirement for these generated feeds).

```bash
npm run generate_and_parse -w podverse-test-assets -- 2 --items 5 --force-rss
```

## 4) Baseline parser worker run over all feeds in DB

Enqueue all feeds, then run the parser worker:

```bash
npm run mq_rss_add_all -w apps/workers -- -q rss-normal
npm run mq_rss_run_parser -w apps/workers -- -q rss-normal
```

Stop the parser worker with `Ctrl+C` after the queue is drained.

## 5) Mutate feeds, then parse updates (updated-feed test)

This is the key updated-feed flow. First rewrite RSS files with changed feed shape/content, then force reparse them.

```bash
npm run generate -w podverse-test-assets -- 2 --items 8 --force-rss
npm run mq_rss_add_all -w apps/workers -- -q rss-normal -f
npm run mq_rss_run_parser -w apps/workers -- -q rss-normal
```

Optional: include value tag changes in the mutation pass (interactive confirmation prompt):

```bash
npm run generate -w podverse-test-assets -- 2 --items 8 --force-rss --add-fake-value-tags
```

## 6) Reparse existing feeds without changing feed files

Use this to validate reparse behavior on already-seen feeds:

```bash
npm run mq_rss_add_all -w apps/workers -- -q rss-normal -f
npm run mq_rss_run_parser -w apps/workers -- -q rss-normal
```

## 7) Transaction mode comparison (A/B)

Current parser behavior is tied to `LOG_TIMER`:

- `LOG_TIMER=false` (or unset) -> transaction-enabled channel/item parsing path.
- `LOG_TIMER=true` -> non-transaction parsing path used for detailed timing logs.

Run both passes against the same queue/feed set and compare parse errors.

### A) Transaction-enabled pass

```bash
npm run mq_rss_add_all -w apps/workers -- -q rss-normal -f
LOG_TIMER=false npm run mq_rss_run_parser -w apps/workers -- -q rss-normal
```

### B) Non-transaction pass

```bash
npm run mq_rss_add_all -w apps/workers -- -q rss-normal -f
LOG_TIMER=true npm run mq_rss_run_parser -w apps/workers -- -q rss-normal
```

Stop each parser run with `Ctrl+C` once processing finishes.

## 8) What to compare between runs

- Worker parse error logs and stack traces.
- Any feed/channel/item update failures.
- Differences in feed completion behavior after forced reparse.
- Throughput and stability differences between transaction-enabled and non-transaction runs.
