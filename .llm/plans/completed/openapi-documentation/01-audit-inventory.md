# 01: Audit and Inventory Overview

This overview anchors the endpoint census stage before documentation drafting.

## Detailed Subplans
- `01a-audit-api-route-matrix.md` — Public API route and risk matrix.
- `01b-audit-management-route-matrix.md` — Management API route and permission matrix.

## Stage Outputs
1. Complete route-to-operation mapping for both APIs.
2. OpenAPI coverage status (`missing`, `partial`, `complete`) per operation.
3. Prioritized gap list by risk.

## Exit Criteria
- No route module remains unmapped.
- High-risk undocumented operations are identified and queued first.
