/**
 * VARCHAR lengths for feed lifecycle columns (`feed_lifecycle_state_type`,
 * `feed_lifecycle_state`, `feed_lifecycle_event`).
 *
 * Keep in sync with
 * `infra/k8s/base/ops/source/database/linear-migrations/app/0025_feed_lifecycle_state_replacement.sql`
 * (and later migrations if column widths change). Migrations stay the DDL source of truth;
 * these values are shared across ORM entities and API validation in TypeScript.
 */
export const FEED_LIFECYCLE_REASON_KEY_MAX_LENGTH = 64;

export const FEED_LIFECYCLE_STATE_KEY_MAX_LENGTH = 64;

export const FEED_LIFECYCLE_UPDATE_SOURCE_MAX_LENGTH = 16;
