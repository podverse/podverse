# 05b: Security and Authorization Documentation Model

## Goal
Normalize security semantics so every operation has explicit and consistent authz documentation.

## Security Modes
- `public` (`security: []`)
- `cookieAuth`
- `bearerAuth`
- multiple accepted modes where supported

## Authorization Notes
For management routes, operation descriptions must include:
- whether superuser is required
- whether granular CRUD permission is required
- expected forbidden behavior when permission is missing

## Standard Error Semantics
- `401`: unauthenticated
- `403`: authenticated but unauthorized

## Exit Criteria
- no operation missing a security block
- privileged operations include explicit authorization notes
