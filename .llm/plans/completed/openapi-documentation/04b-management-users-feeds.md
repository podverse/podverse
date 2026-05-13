# 04b: Management API Users and Feeds Subplan

## Scope
- `/users/*`
- `/feeds/*`

## Documentation Focus
- paginated user listing and filtering
- user mutation constraints
- feed lookup and policy-state transitions
- moderation/governance semantics

## Required Artifacts
1. Query parameter docs for page/limit/search.
2. User payload schemas with membership-related fields.
3. Feed policy-state update semantics and error conditions.

## Edge Cases
- invalid IDs and malformed inputs
- search with zero results
- policy updates rejected by validation

## Exit Criteria
- User and feed endpoints have complete read/write docs.
- Policy-state operations include permission and transition clarity.
