# Phase 9: Database Migrations

**Status**: Planned

## Overview

Migrate database schema files from podverse-ops and establish Jenkins-triggered migration workflow.

## Current Structure (podverse-ops)

```
database/
  combined/
    init_database.sql           # All migrations combined
  init-scripts/
    01-create-users.sh          # Docker entrypoint script
  migrations/
    0000_init_helpers.sql
    0001_init_podcasting_20_database.sql
    0002_account.sql
    ...
    0012_account_settings.sql
  scripts/
    combine_all_migrations.sh
  seed-scripts/
    local-dev-account.sql
    local-lighthouse-test-fixtures.sql
  management/
    combined/
      init_management_database.sql
    migrations/
      0000_init_helpers.sql
      0001_init_admin_accounts.sql
    scripts/
      combine_all_migrations.sh
```

## Monorepo Structure

```
infra/
  database/
    main/
      combined/
        init_database.sql
      init-scripts/
        01-create-users.sh
      migrations/
        0000_init_helpers.sql
        0001_init_podcasting_20_database.sql
        ...
      seed-scripts/
        local-dev-account.sql
        local-lighthouse-test-fixtures.sql
    management/
      combined/
        init_management_database.sql
      init-scripts/
        01-create-users.sh
      migrations/
        0000_init_helpers.sql
        0001_init_admin_accounts.sql
scripts/
  database/
    combine-migrations.sh
    apply-migration.sh
pipelines/
  jenkins/
    database/
      apply-migration.jenkinsfile
```

## Migration Naming Convention

```
NNNN_description.sql
```

- `NNNN`: Zero-padded 4-digit sequence number
- `description`: Snake_case description
- Example: `0013_add_podcast_chapters.sql`

## Development Workflow

### Local Development

Use combined init script (all migrations):

```bash
# Start fresh database
make local_db_down
make local_db_up
# Database auto-initializes with init_database.sql
```

### Adding a New Migration

1. Create new migration file:
   ```bash
   touch infra/database/main/migrations/0013_add_podcast_chapters.sql
   ```

2. Write migration SQL:
   ```sql
   -- Migration: 0013_add_podcast_chapters
   -- Description: Add chapters table for podcast episodes
   -- Date: 2026-01-23

   CREATE TABLE IF NOT EXISTS "chapter" (
     "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
     "episodeId" uuid REFERENCES "episode"("id") ON DELETE CASCADE,
     "startTime" integer NOT NULL,
     "title" varchar(255),
     "imageUrl" text,
     "createdAt" timestamp DEFAULT now(),
     "updatedAt" timestamp DEFAULT now()
   );

   CREATE INDEX "IDX_chapter_episodeId" ON "chapter"("episodeId");
   ```

3. Regenerate combined file:
   ```bash
   ./scripts/database/combine-migrations.sh
   ```

4. Test locally:
   ```bash
   make local_db_down
   make local_db_up
   ```

## Combine Migrations Script

**File**: `scripts/database/combine-migrations.sh`

```bash
#!/bin/bash
# Combine all migrations into init_database.sql

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Main database
MAIN_MIGRATIONS="$REPO_ROOT/infra/database/main/migrations"
MAIN_COMBINED="$REPO_ROOT/infra/database/main/combined/init_database.sql"

echo "Combining main database migrations..."
echo "-- Combined migrations generated $(date)" > "$MAIN_COMBINED"
echo "-- DO NOT EDIT - regenerate with scripts/database/combine-migrations.sh" >> "$MAIN_COMBINED"
echo "" >> "$MAIN_COMBINED"

for migration in $(ls "$MAIN_MIGRATIONS"/*.sql | sort); do
  echo "-- Including: $(basename $migration)" >> "$MAIN_COMBINED"
  cat "$migration" >> "$MAIN_COMBINED"
  echo "" >> "$MAIN_COMBINED"
  echo "" >> "$MAIN_COMBINED"
done

echo "✓ Main database combined: $MAIN_COMBINED"

# Management database
MGMT_MIGRATIONS="$REPO_ROOT/infra/database/management/migrations"
MGMT_COMBINED="$REPO_ROOT/infra/database/management/combined/init_management_database.sql"

echo "Combining management database migrations..."
echo "-- Combined migrations generated $(date)" > "$MGMT_COMBINED"
echo "-- DO NOT EDIT - regenerate with scripts/database/combine-migrations.sh" >> "$MGMT_COMBINED"
echo "" >> "$MGMT_COMBINED"

for migration in $(ls "$MGMT_MIGRATIONS"/*.sql | sort); do
  echo "-- Including: $(basename $migration)" >> "$MGMT_COMBINED"
  cat "$migration" >> "$MGMT_COMBINED"
  echo "" >> "$MGMT_COMBINED"
  echo "" >> "$MGMT_COMBINED"
done

echo "✓ Management database combined: $MGMT_COMBINED"
```

## Production Migration Strategy

### During Alpha

- Use `init_database.sql` for fresh deploys
- Database can be wiped and rebuilt as needed

### Post-Beta (Production)

- Individual migrations only
- Jenkins-triggered, one at a time
- No automatic migration on deploy

## Jenkins Pipeline

**File**: `pipelines/jenkins/database/apply-migration.jenkinsfile`

```groovy
pipeline {
    agent any

    parameters {
        choice(
            name: 'ENVIRONMENT',
            choices: ['alpha', 'beta', 'prod'],
            description: 'Target environment'
        )
        choice(
            name: 'DATABASE',
            choices: ['main', 'management'],
            description: 'Database to migrate'
        )
        string(
            name: 'MIGRATION_FILE',
            defaultValue: '',
            description: 'Migration file name (e.g., 0013_add_podcast_chapters.sql)'
        )
        booleanParam(
            name: 'DRY_RUN',
            defaultValue: true,
            description: 'Show SQL without executing'
        )
    }

    stages {
        stage('Validate') {
            steps {
                script {
                    if (params.MIGRATION_FILE == '') {
                        error('Migration file is required')
                    }
                }
            }
        }

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Preview Migration') {
            steps {
                script {
                    def migrationPath = "infra/database/${params.DATABASE}/migrations/${params.MIGRATION_FILE}"
                    sh "cat ${migrationPath}"
                }
            }
        }

        stage('Apply Migration') {
            when {
                expression { !params.DRY_RUN }
            }
            steps {
                script {
                    def migrationPath = "infra/database/${params.DATABASE}/migrations/${params.MIGRATION_FILE}"
                    def dbHost = getDbHost(params.ENVIRONMENT, params.DATABASE)
                    def dbCreds = getDbCredentials(params.ENVIRONMENT, params.DATABASE)

                    withCredentials([usernamePassword(
                        credentialsId: dbCreds,
                        usernameVariable: 'DB_USER',
                        passwordVariable: 'DB_PASS'
                    )]) {
                        sh """
                            PGPASSWORD=\$DB_PASS psql -h ${dbHost} -U \$DB_USER -d postgres -f ${migrationPath}
                        """
                    }
                }
            }
        }
    }

    post {
        success {
            echo "Migration ${params.MIGRATION_FILE} applied successfully to ${params.ENVIRONMENT}"
        }
        failure {
            echo "Migration failed! Check logs for details."
        }
    }
}

def getDbHost(environment, database) {
    def hosts = [
        'alpha': [
            'main': 'alpha-db.podverse.internal',
            'management': 'alpha-management-db.podverse.internal'
        ],
        'beta': [
            'main': 'beta-db.podverse.internal',
            'management': 'beta-management-db.podverse.internal'
        ],
        'prod': [
            'main': 'prod-db.podverse.internal',
            'management': 'prod-management-db.podverse.internal'
        ]
    ]
    return hosts[environment][database]
}

def getDbCredentials(environment, database) {
    return "${environment}-${database}-db-credentials"
}
```

## Migration Checklist

When applying a production migration:

- [ ] Migration tested locally
- [ ] Migration tested on alpha
- [ ] Backup taken before applying
- [ ] Dry run reviewed
- [ ] Applied during low-traffic window
- [ ] Application restarted if needed
- [ ] Verified application functionality

## Rollback Considerations

- Each migration should be reversible when possible
- Include rollback SQL as comments:
  ```sql
  -- ROLLBACK:
  -- DROP TABLE IF EXISTS "chapter";
  -- DROP INDEX IF EXISTS "IDX_chapter_episodeId";
  ```
- For destructive migrations, take backup first

## Files to Migrate

| Source | Destination |
|--------|-------------|
| `podverse-ops/database/migrations/` | `infra/database/main/migrations/` |
| `podverse-ops/database/combined/` | `infra/database/main/combined/` |
| `podverse-ops/database/init-scripts/` | `infra/database/main/init-scripts/` |
| `podverse-ops/database/seed-scripts/` | `infra/database/main/seed-scripts/` |
| `podverse-ops/database/management/` | `infra/database/management/` |

## Estimated Effort

~3-4 hours
