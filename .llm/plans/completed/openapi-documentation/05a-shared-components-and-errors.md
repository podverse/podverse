# 05a: Shared Components and Error Envelope Subplan

## Goal
Create a consistent component library reused across API and management specs.

## Component Families
- error envelopes (`validation`, `auth`, `forbidden`, `not-found`, `conflict`, `internal`)
- pagination metadata
- account/admin identity fragments
- permission and role structures
- membership/pricing data structures

## Reuse Rules
- use component references by default
- inline schema only for one-off endpoint-specific payloads
- avoid duplicate schemas with different names and identical fields

## Exit Criteria
- common payloads are extracted and reused
- duplicated inline shapes reduced to a minimal acceptable set
