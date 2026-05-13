# 04c: Management API Products and Pricing Subplan

## Scope
- `/products/membership`
- `/products/pricing/*`

## Documentation Focus
- membership settings read/update behavior
- pricing lifecycle (`active`, `schedule`, `activate`, `deprecate`)
- validation constraints and audit side effects
- permission gates (`superuser`, `requireCrud`)

## Required Response Coverage
- success and creation responses
- validation failures (`400`)
- auth/permission failures (`401`, `403`)
- missing resources (`404`, where relevant)

## High-Risk Notes
- scheduling operations change temporal validity and may close active rows
- updates write audit entries; this side effect must be documented

## Exit Criteria
- Pricing lifecycle operations are end-to-end documented.
- Membership settings constraints and side effects are explicit.
