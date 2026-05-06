# 01b — Status mapping and transition spec

## Goal

Define exact migration semantics before implementation so behavior is deterministic and verifiable.

## Required outputs

- Canonical mapping document in code comments/docs that specifies:
  - old status meaning
  - new lifecycle state
  - active condition keys
  - expected `feed_policy` outputs
  - required operator note/reason behavior
- Enforced lifecycle transition matrix used by domain service validation.

## Mapping specification (must be implemented exactly)

- `active`:
  - lifecycle: `active`
  - conditions: none required
  - policy: parse/public/add allowed = true unless other conditions/overrides active
- `always_parse`:
  - lifecycle: `active`
  - conditions: no blocking conditions
  - policy: parse allowed must remain true (subject to explicit override model)
- `spam`:
  - lifecycle: `active`
  - conditions: `spam_detected` active
  - policy: parse/public/add blocked unless explicit override rules apply
- `spam_permitted`:
  - lifecycle: `active`
  - conditions: `spam_detected` active plus `spam_permitted` operator condition
  - policy: parse allowed true, public/add follow policy rules for permitted spam feeds
- `pending_archive`:
  - lifecycle: `pending_archive`
  - conditions: optional operator-origin archival marker
  - policy: parse/public/add blocked
- `archived`:
  - lifecycle: `archived`
  - conditions: optional archival marker
  - policy: parse/public/add blocked
- `takedown`:
  - lifecycle: `takedown`
  - conditions: `takedown_active` active
  - policy: parse/public/add blocked, `primary_block_reason=takedown_active`

## Lifecycle transition matrix

- Allowed:
  - `active -> pending_archive`
  - `pending_archive -> archived`
  - `active -> takedown`
  - `pending_archive -> takedown`
  - `archived -> takedown`
  - `takedown -> active` only via explicit operator un-takedown path
- Not allowed without explicit override:
  - `archived -> active`
  - `takedown -> pending_archive`
- Every transition must record source (`parser`, `archiver`, `admin`, `system`) and note.

## Ownership rules

- Parser can set condition keys and recompute policy; parser does not set archived state directly.
- Archiver owns `pending_archive -> archived` transitions.
- Management feed-operations owns operator-driven lifecycle and override updates.

## Completion criteria

- Mapping spec is referenced by migration/service code comments and tests.
- Transition validation is implemented in one central service and covered by unit tests.
