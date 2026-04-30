# Database Users (Brief Purpose)

This is the Podverse green-field role model for both databases: `podverse_app` and `podverse_management`.

## App Database Users

- `DB_APP_OWNER_USER` (`podverse_app_owner`): Bootstrap/object owner role for app DB setup (database ownership, extension setup, schema ownership tasks).
- `DB_APP_MIGRATOR_USER` (`podverse_app_migrator`): Applies linear migrations and owns migration-created objects.
- `DB_APP_READ_WRITE_USER` (`podverse_app_read_write`): Runtime application write role (normal CRUD operations).
- `DB_APP_READ_USER` (`podverse_app_read`): Runtime read-only role.

## Management Database Users

- `DB_MANAGEMENT_OWNER_USER` (`podverse_management_owner`): Bootstrap/object owner role for management DB setup (database ownership, extension setup, schema ownership tasks).
- `DB_MANAGEMENT_MIGRATOR_USER` (`podverse_management_migrator`): Applies linear migrations and owns migration-created objects.
- `DB_MANAGEMENT_READ_WRITE_USER` (`podverse_management_read_write`): Runtime management write role (normal CRUD operations).
- `DB_MANAGEMENT_READ_USER` (`podverse_management_read`): Runtime read-only role.

## Rule of Thumb

- **Owner** = bootstrap ownership tasks only.
- **Migrator** = schema migrations only.
- **Read/Read-Write** = runtime API access only.
- **Role separation** = migrator does not inherit owner role.

## Grants and default privileges

Bootstrap aligns with [`0001_create_app_db_users.sh`](../../infra/k8s/base/db/source/bootstrap/0001_create_app_db_users.sh): the owner connects first for database-level access and `CREATE` on `public` for the migrator; a **second session connects as the migrator** to grant usage on `public` to runtime roles, `GRANT` on existing tables/sequences, and `ALTER DEFAULT PRIVILEGES` so **objects created by the migrator** (baselines and forward linear migrations) grant the read and read-write roles. Management DB [`0002_create_management_db_users.sh`](../../infra/k8s/base/db/source/bootstrap/0002_create_management_db_users.sh) follows the same pattern.
