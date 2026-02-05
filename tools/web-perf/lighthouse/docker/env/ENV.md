# Lighthouse Docker Environment Variables

Lighthouse Docker services use env files in this directory:

- `db.env`
- `mq.env`
- `keyvaldb.env`

## Source of Truth

These env files mirror the infra definitions. When infra env files change, update
the Lighthouse copies accordingly:

- Database: `infra/config/env-templates/db.env.example`
- Message queue: `infra/config/local/mq.env`
- Key-value DB: `infra/config/local/keyvaldb.env`

## Notes

- Lighthouse keeps its own copies to avoid coupling to infra/test files.
- Values here are for local test usage only (no secrets).
