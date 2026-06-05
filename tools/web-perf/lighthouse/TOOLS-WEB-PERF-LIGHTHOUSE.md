# Lighthouse QA System

A programmatic Lighthouse performance testing system for the Podverse web app that automates testing, tracks performance metrics, and compares results between iterations.

## Overview

This system uses Playwright for browser automation and Lighthouse for performance testing. It runs tests for both logged-out and logged-in user scenarios, generates structured JSON reports, and provides comparison capabilities between test iterations.

## Features

- **Automated Testing**: Uses Playwright to navigate and interact with the web app
- **Performance Analysis**: Runs Lighthouse tests on key pages and user interactions
- **Report Management**: Stores and manages reports as A, B, or C
- **Comparison Engine**: Compares reports and identifies performance changes
- **Multiple Scenarios**: Tests both logged-out and logged-in states

## Prerequisites

- **Node.js** as specified in root `.nvmrc` (currently Node 24)
  - If using nvm: `nvm use` in the monorepo root to switch to the correct version
  - Or ensure your Node.js version matches `.nvmrc`
- **Playwright browsers**: Run `npx playwright install` from the monorepo root (or from `tools/web-perf/lighthouse`) before your first Lighthouse run. Playwright uses its own browser binaries; without this step, the tool will fail with an "Executable doesn't exist" error.
- The web app will be started automatically on `http://localhost:3111` during tests
- Database populated with channel/items from the generated feed (see Database Setup)

## Installation

From the monorepo root (recommended):

```bash
npm install
npm run build -w podverse-test-assets
npx playwright install
```

Or from the tool directories:

```bash
cd tools/web-perf/lighthouse
npm install
npx playwright install

cd ../../test-assets
npm install
npm run build
```

Run `npx playwright install` before your first Lighthouse run; it is required for browser automation.

## Setup

1.  **Configure environment variables**:

    ```bash
    cp .env.api.example .env.api
    cp .env.web.example .env.web
    cp .env.lighthouse.example .env.lighthouse
    ```

    Then edit `.env.api`, `.env.web`, and `.env.lighthouse` with your test settings.
    **Important**: The test database runs on port **5111** (separate from the
    development database on port 5432). The example files are pre-configured for
    the test database.

    Lighthouse does **not** provide its own env validation. It relies on the app
    startup validation in:
    - `apps/api/src/lib/startup/validation.ts`
    - `apps/web/scripts/validate-env.ts`

    Keep `.env.api` and `.env.web` aligned with those validators. For the API, use
    the same **section order and variable grouping** as
    [`apps/api/.env.example`](/apps/api/.env.example) (e.g. **Web Configuration**
    for `BRAND_*` and web origin, **Mailer**, **Legal entity** for `LEGAL_NAME` /
    `LEGAL_ADDRESS` — not a combined “email template” block).

    The web app reads `NEXT_PUBLIC_*` values from the runtime-config sidecar.
    Make sure `.env.web` includes `RUNTIME_CONFIG_URL` and `RUNTIME_CONFIG_PORT`
    so Lighthouse can start the sidecar alongside the web app.

    When Lighthouse starts the API, it skips loading `apps/api/.env` so the
    Lighthouse `.env.api` values are always used.

2.  **Lighthouse Docker Services**: The test suite manages its own Docker services
    (database, message queue, key-value DB) with Lighthouse-specific container names
    and ports to avoid collisions with local dev services:
    - Database container: `podverse_lighthouse_test_db` (port 5111)
    - Message queue: `podverse_lighthouse_mq` (AMQP on port 5673)
    - Key-value DB: `podverse_lighthouse_keyvaldb` (Valkey on port 6381)
    - Before each test run, Lighthouse tears down any existing Lighthouse services,
      then starts fresh containers, resets the database schema, and populates it via the
      parser (test-assets mode) using the generated feed URL.
    - You can manually manage the services using the Lighthouse compose file:

      ```bash
      docker compose -f tools/web-perf/lighthouse/docker/docker-compose.yml up -d
      DB_HOST=127.0.0.1 DB_PORT=5111 DB_APP_OWNER_USER=podverse_app_owner DB_APP_OWNER_PASSWORD=mysecretpw DB_APP_NAME=podverse_app \
        bash scripts/database/run-linear-migrations.sh --database app
      # Then load .env.api and run: npm run generate_and_parse -w podverse-test-assets
      # (or let Lighthouse do the reset + populate when you run npm run lighthouse)
      ```

    - The test suite will automatically ensure the Lighthouse services are up and reset
      before running tests
    - Environment variable details for these services are documented in
      `tools/web-perf/lighthouse/docker/env/ENV.md`

3.  **Test Assets**: Assets are served by the **test-assets** HTTP server at
    `http://localhost:2111/` (e.g. `/feeds/feed-podcast-1.rss`, `/images/image-001-300.jpg`).
    You must **start the assets server** before running Lighthouse.
    From the repo root, in a separate terminal: `npm run start -w podverse-test-assets`.
    Or from the tool dir: `cd tools/test-assets && npm run start`. When you run Lighthouse
    the tool first runs the test-assets **generate** step to create one podcast feed and
    media under `tools/test-assets/assets/`; it then checks that the assets server is
    reachable. If the server is not running, Lighthouse exits with instructions to start
    it. See `tools/test-assets/TOOLS-TEST-ASSETS.md`.

4.  **Podcast Index API Override**: The `@podverse/external-services` package needs to be updated to include the Podcast Index API override logic. This ensures that test `podcast_index_id` values and feed URLs return mock data instead of querying the real API. This override is only active in non-production environments (`NODE_ENV !== 'production'`).

**Note**: The system automatically creates a temporary test user for each test run and deletes it afterward. This ensures consistent, clean user state for each test iteration. The test user is created with a unique email address each time.

## Usage

**From the monorepo root** (recommended):

```bash
# One-time: build test-assets so Lighthouse can use feed-1 constants
npm run build -w podverse-test-assets

# In a separate terminal: start the assets server (Lighthouse will prompt if it's not running)
npm run start -w podverse-test-assets

# Run Lighthouse (generate, DB reset+populate, API, web, then audits)
npm run lighthouse -w podverse-lighthouse
```

**From the tool directory:**

```bash
cd tools/web-perf/lighthouse
npm run lighthouse
```

The CLI will prompt you to:

1. Optionally compare against an existing report (if any exist)
2. Select a base report from existing reports (if comparison desired)
3. Enter a name for the new test report (any identifier, e.g., "v1.0", "before-optimization", etc.)
4. Confirm if overwriting an existing report with the same name

### Test Flow

The system tests the default (podcast) feed type and user states:

**Logged-Out Tests:**

1. Homepage load
2. Podcast channel page load (`/podcast/{feed-1 channel id}` — feed-1-based assets)

**Logged-In Tests:**

- Same comprehensive flow as logged-out, but after logging in with a freshly created test user
- A new test user is created before each test run and deleted afterward to ensure clean, consistent state

**Timing:**

- At least 1 second delay between all actions to ensure e2e processes complete
- Focuses on page rendering performance, not media file loading latency (which is variable)

**Report Generation:**

- Generates and saves reports to `reports/report-{identifier}.json`
- Compares with base report (if provided) and displays analysis

## Report Structure

Reports are stored in `tools/web-perf/lighthouse/reports/{app}/report-{identifier}.json` where `{app}` is the application being tested (currently only 'web' is supported) and `{identifier}` is the name you provide. The identifier is sanitized to be filesystem-safe (only alphanumeric characters, hyphens, and underscores allowed). For example:

- `report-v1.0.json`
- `report-before-optimization.json`
- `report-after-changes.json`

Each report has the following structure. `screenshotsEnabled` records whether page screenshots were taken before each audit (they can slightly affect timings, so this helps when comparing reports):

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "baseReport": "v1.0",
  "newReport": "v1.1",
  "testChannelIds": ["1"],
  "testItemIds": ["1"],
  "screenshotsEnabled": false,
  "scenarios": {
    "loggedOut": {
      "homepage": {
        /* lighthouse results */
      },
      "podcastChannelPage": {
        /* lighthouse results */
      }
    }
  }
}
```

<!--
Potential scenarios to restore later: podcast episode, play, reload; logged-in flows.
-->

## Comparison Analysis

The comparison engine analyzes:

- Performance scores
- Core Web Vitals (LCP, FID, CLS)
- Page load times
- Resource counts

It identifies:

- ✅ Improvements (significant positive changes)
- ⚠️ Regressions (significant negative changes)
- ➡️ Neutral (changes within threshold)

Threshold: 5% change is considered significant.

## Configuration

### Base URL

The test suite starts the web app automatically on `http://localhost:3111` (test port). The system reads configuration from `apps/web/env/local.env` when available.

### Consistency Controls

You can tune run determinism with these environment variables:

- `LIGHTHOUSE_MEDIAN_RUNS` (default: `5`): number of runs per scenario; median is used.
- `LIGHTHOUSE_CONTEXT_MODE` (default: `fresh`):
  - `fresh`: new browser context per run (most isolated).
  - `single`: reuse a single context per scenario and clear cache between runs.

### Screenshots

Set `LIGHTHOUSE_SAVE_SCREENSHOTS="true"` in `.env.lighthouse` to save PNG screenshots of each tested page alongside the report in `reports/web/`. This helps confirm that pages loaded correctly with the expected data. When enabled, the runner writes:

- `{report-id}-homepage.png` — homepage after load
- `{report-id}-podcast-channel.png` — podcast channel page after load

Leave unset or set to any value other than `"true"` to disable.

### Database

The test suite uses a **separate test database** (port 5111) that is isolated from the development database (port 5432). This ensures:

- Clean, consistent test conditions
- No interference with development data
- Automatic reset before each test run

The test database is managed via Docker compose in
`tools/web-perf/lighthouse/docker`. The test suite automatically handles database
setup, but you can also manage it manually if needed.

## Test Fixtures

The system expects one podcast channel and episodes to be present. These are created
automatically: after the database schema is reset, Lighthouse calls the test-assets
parser (in test-assets mode) to parse the generated feed
`http://localhost:2111/feed-podcast-1.rss` and populate the database.
No manual seed script is used.

## Database Setup

The test database is reset (DROP/CREATE schema, then linear migrations for `--database app`,
bootstrap user-role script), then populated by the **parser** in test-assets mode using the
generated feed URL. The parser creates the feed, channel, and items from the RSS feed;
no SQL seed file is used. This happens automatically when you run `npm run lighthouse`.

## Docker Sync Note

If you update infra Docker images, commands, or env files for DB/MQ/KeyvalDB, make
sure to update the Lighthouse Docker files under `tools/web-perf/lighthouse/docker`
to keep the tool aligned with infra changes.

## Troubleshooting

**Tests fail with "Page not found":**

- Ensure the database was populated (Lighthouse runs the parser after schema reset)
- Verify the web app is running on the expected URL

**Lighthouse fails:**

- Ensure Chrome/Chromium is installed
- Check that the web app is accessible from the test environment

**Login fails:**

- Verify database connection is configured correctly in `.env`
- Check that the test database is running: `docker ps | grep podverse_lighthouse_test_db`
- Ensure the test database is on port 5111 (not 5432)
- Check that the database user has permissions to create and delete accounts
- Ensure podverse-orm can connect to the database

**Database connection fails:**

- Verify the test database container is running:
  `docker ps | grep podverse_lighthouse_test_db`
- Check that `.env` has the correct port (5111) and credentials
- The reset step runs `/docker-entrypoint-initdb.d/0001_create_app_db_users.sh` to ensure
  app roles from `tools/web-perf/lighthouse/docker/env/db.env` exist (`POSTGRES_READ_USER` /
  `POSTGRES_READ_WRITE_USER`, e.g. `podverse_app_read` and `podverse_app_read_write`) with
  the Lighthouse DB passwords. If you previously had generic `read` / `read_write` roles
  in this dev database, run `docker compose -f tools/web-perf/lighthouse/docker/docker-compose.yml down -v` once, then bring services back up so the init script can create the prefixed roles.
- Check Postgres readiness and logs:
  `docker logs podverse_lighthouse_test_db`
- If schema creation fails, Lighthouse now verifies `category` exists after reset.
  A failure usually means linear migrations did not apply.
- If automatic setup fails, manually run the migration step, then ensure `.env.api` has
  DB\_\* set and run `npm run generate_and_parse -w podverse-test-assets` from the repo
  root to populate the database from the generated feed:

  ```bash
  docker compose -f tools/web-perf/lighthouse/docker/docker-compose.yml up -d
  DB_HOST=127.0.0.1 DB_PORT=5111 DB_APP_OWNER_USER=podverse_app_owner DB_APP_OWNER_PASSWORD=mysecretpw DB_APP_NAME=podverse_app \
    bash scripts/database/run-linear-migrations.sh --database app
  # Load .env.api, then: npm run generate_and_parse -w podverse-test-assets
  ```

## Consistency Tips

- Run on a quiet machine (close browsers, heavy IDE tasks, video calls).
- Prefer running on AC power with power-saving modes disabled.
- For repeatability, use a consistent CPU load. On macOS, consider running fewer background apps or using `taskpolicy` to reduce interference.

## Development

The system consists of:

- `browser-automation.ts`: Playwright automation logic
- `lighthouse-runner.ts`: Lighthouse test execution
- `report-manager.ts`: Report storage and retrieval
- `comparison.ts`: Report comparison and analysis
- `user-manager.ts`: Test user creation and deletion using @podverse/orm
- `database-setup.ts`: Test database lifecycle management (start, reset, initialize)
- `web-app-manager.ts`: Web app lifecycle (start, stop)
- `api-manager.ts`: API server lifecycle (start, stop)
- `tools/test-assets`: Generates feed and media (`generate` script / `generateFeedAndAssets`), checks assets server
  reachability, and populates the DB from the feed (`populateDatabaseFromFeed`). Also provides
  the HTTP server for test assets (run with `npm run start`; see Test Assets above).
- `index.ts`: Main CLI interface
