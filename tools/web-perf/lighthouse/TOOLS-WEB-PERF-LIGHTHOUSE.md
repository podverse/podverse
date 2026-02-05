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
- **Playwright browsers**: Run `npx playwright install` (from `tools/web-perf/lighthouse` or monorepo root) before running `npm run lighthouse`. Playwright uses its own browser binaries; without this step, the tool will fail with an "Executable doesn't exist" error.
- The web app will be started automatically on `http://localhost:3111` during tests
- Test fixtures seeded in the database (see Database Setup)

## Installation

```bash
cd tools/web-perf/lighthouse
npm install
npx playwright install

cd ../../test-assets
npm install
npm run build
```

Run `npx playwright install` before your first `npm run lighthouse`; it is required for browser automation.

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

    Keep `.env.api` and `.env.web` aligned with those validators.

    When Lighthouse starts the API, it skips loading `apps/api/.env` so the
    Lighthouse `.env.api` values are always used.

2.  **Lighthouse Docker Services**: The test suite manages its own Docker services
    (database, message queue, key-value DB) with Lighthouse-specific container names
    and ports to avoid collisions with local dev services:
    - Database container: `podverse_lighthouse_test_db` (port 5111)
    - Message queue: `podverse_lighthouse_mq` (AMQP on port 5673)
    - Key-value DB: `podverse_lighthouse_keyvaldb` (Valkey on port 6381)
    - Before each test run, Lighthouse tears down any existing Lighthouse services,
      then starts fresh containers, resets the database schema, and seeds fixtures.
    - You can manually manage the services using the Lighthouse compose file:

      ```bash
      docker compose -f tools/web-perf/lighthouse/docker/docker-compose.yml up -d
      cat ../../infra/database/combined/init_database.sql | \
        docker exec -i podverse_lighthouse_test_db psql -U postgres -d postgres
      docker exec -i podverse_lighthouse_test_db psql -U postgres -d postgres \
        -f /opt/database/seed-scripts/local-lighthouse-test-fixtures.sql
      ```

    - The test suite will automatically ensure the Lighthouse services are up and reset
      before running tests
    - Environment variable details for these services are documented in
      `tools/web-perf/lighthouse/docker/env/ENV.md`

3.  **Test Assets**: Test assets (images, media files, and RSS feeds) are located in
    `tools/test-assets/assets/`. The tool automatically generates missing image and media
    files when you run `npm run lighthouse`. RSS feed files are source controlled. Assets
    are served via a local HTTP server on `localhost:2111/lighthouse/`. See
    `tools/test-assets/TOOLS-TEST-ASSETS.md` for details.

4.  **Podcast Index API Override**: The `@podverse/external-services` package needs to be updated to include the Podcast Index API override logic. This ensures that test `podcast_index_id` values and feed URLs return mock data instead of querying the real API. This override is only active in non-production environments (`NODE_ENV !== 'production'`).

**Note**: The system automatically creates a temporary test user for each test run and deletes it afterward. This ensures consistent, clean user state for each test iteration. The test user is created with a unique email address each time.

## Usage

Run the Lighthouse performance tool (from `tools/web-perf/lighthouse`):

```bash
npm run lighthouse
```

The CLI will prompt you to:

1. Optionally compare against an existing report (if any exist)
2. Select a base report from existing reports (if comparison desired)
3. Enter a name for the new test report (any identifier, e.g., "v1.0", "before-optimization", etc.)
4. Confirm if overwriting an existing report with the same name

### Test Flow

The system comprehensively tests all media types and user states:

**Logged-Out Tests:**

1. Homepage load
2. Podcast channel page load (`/podcast/lhtest-chan-1`)
3. Video channel page load (`/podcast/lhtest-chan-2`)
4. Music album page load (`/album/lhtest-chan-3`)
5. Podcast episode page load (`/episode/lhtest-item-1`)
6. Video episode page load (`/episode/lhtest-item-2`)
7. Music track page load (`/track/lhtest-item-3`)
8. Podcast episode play behavior
9. Podcast episode reload (tests history-based loading)
10. Video episode play behavior
11. Video episode reload (tests history-based loading)
12. Music track play behavior
13. Music track reload (tests history-based loading)

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

Each report has the following structure:

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "baseReport": "v1.0",
  "newReport": "v1.1",
  "testChannelIds": ["lhtest-chan-1"],
  "testItemIds": [],
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
Potential scenarios to restore later:
- Logged out: podcast episode, podcast after play, podcast after reload
- Logged out: video channel, music album, video episode, music track
- Logged out: video/music after play, video/music after reload
- Logged in: homepage, podcast/video/music channel, podcast/video/music episode,
  podcast/video/music after play, podcast/video/music after reload
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

### Database

The test suite uses a **separate test database** (port 5111) that is isolated from the development database (port 5432). This ensures:

- Clean, consistent test conditions
- No interference with development data
- Automatic reset before each test run

The test database is managed via Docker compose in
`tools/web-perf/lighthouse/docker`. The test suite automatically handles database
setup, but you can also manage it manually if needed.

## Test Fixtures

The system expects test fixtures to be available:

- Channel: `lhtest-chan-1` (Podcast)
- Episode: `lhtest-item-1` (Podcast episode)

These should be seeded in the database using the seed script (see Database Setup).

## Database Setup

Test fixtures must be seeded in the local database. The seed script should create:

- Test feeds with podcast_index_id values 2147483640-2147483642
- Test channels (Podcast, Video, Music)
- Test items (one per channel)

The test database is automatically initialized from
`infra/database/seeds/local-lighthouse-test-fixtures.sql`, which is mounted into the
container at `/opt/database/seed-scripts/local-lighthouse-test-fixtures.sql`.

## Docker Sync Note

If you update infra Docker images, commands, or env files for DB/MQ/KeyvalDB, make
sure to update the Lighthouse Docker files under `tools/web-perf/lighthouse/docker`
to keep the tool aligned with infra changes.

## Troubleshooting

**Tests fail with "Page not found":**

- Ensure test fixtures are seeded in the database
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
- The reset step runs `/opt/database/init-scripts/01-create-users.sh` to ensure
  `read`/`read_write` users exist with the Lighthouse DB passwords.
- Check Postgres readiness and logs:
  `docker logs podverse_lighthouse_test_db`
- If schema creation fails, Lighthouse now verifies `category` exists after reset.
  A failure usually means the combined schema SQL was not applied.
- If automatic setup fails, manually run:

  ```bash
  docker compose -f tools/web-perf/lighthouse/docker/docker-compose.yml up -d
  cat ../../infra/database/combined/init_database.sql | \
    docker exec -i podverse_lighthouse_test_db psql -U postgres -d postgres
  docker exec -i podverse_lighthouse_test_db psql -U postgres -d postgres \
    -f /opt/database/seed-scripts/local-lighthouse-test-fixtures.sql
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
- `tools/test-assets/src/asset-generator.ts`: Test asset generation (images, media)
- `tools/test-assets/src/asset-server.ts`: Local HTTP server for test assets
- `index.ts`: Main CLI interface
