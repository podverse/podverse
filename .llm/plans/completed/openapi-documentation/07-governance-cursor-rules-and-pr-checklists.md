# 07: Governance, Cursor Rules, and PR Checklist Subplan

## Goal
Prevent documentation drift after this one-time comprehensive effort.

## Governance Artifacts
- Cursor rule requiring OpenAPI updates for route/payload/auth changes
- optional Cursor skill with examples and conventions
- PR checklist item for endpoint-doc parity

## PR Checklist Requirements
- route changes reflected in relevant `openapi.yml`
- request/response schema updates reflected in docs
- security/authz updates reflected in operation docs
- examples updated if payload shape changed

## Ownership Model
- API spec ownership: API team
- management spec ownership: management API team
- cross-cutting review: shared platform or docs reviewer

## Exit Criteria
- governance artifacts are defined and linked from the plan set
- reviewer checklist is actionable and concise
