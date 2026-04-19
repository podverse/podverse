# Podverse Boost Messages - Execution Order

## Critical Rules

- Phases are sequential. Complete each phase before starting the next.
- Within a phase, run steps in listed order unless explicitly marked parallel.
- Do not start Podverse UI implementation until Metaboost public contract changes are complete.

## Phase 1 (Foundation, Sequential)

1. Execute `01-metaboost-public-contract-and-breadcrumb-metadata.md`

Why first:
- Podverse depends on stable public payload shape.
- PII safety (`sender_guid` removal) and breadcrumb metadata must be defined before client rendering.

## Phase 2 (Podverse Shared Layer, Sequential)

2. Execute `02-podverse-shared-boost-messages-data-and-ui.md`

Why second:
- Establishes reusable component/data model for all downstream pages.

## Phase 3 (Page Integrations, Sequential)

3. Execute `03-podverse-donate-mb-v1-messages-section.md`
4. Execute `04-podverse-channel-item-boosts-tabs-and-breadcrumb-links.md`

Why this order:
- Donate path is a simpler first integration of the shared component.
- Channel/item tab routing and breadcrumb links have more moving parts.

## Phase 4 (Polish + Verification, Sequential)

5. Execute `05-polish-copy-i18n-manual-verification.md`

## Done Criteria

- Donate page shows paginated async messages section with spinner and required error message.
- Channel/item pages show `Boosts` tab only for metaboost-enabled channels.
- Message list supports breadcrumb display for subbucket messages.
- Breadcrumb links navigate to correct Podverse channel/item page when resolvable.
- Public standards list endpoints do not expose `sender_guid`/`senderGuid`.
