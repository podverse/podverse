# Podverse Boost Messages - Summary

## Goal

Implement a reusable Boost messages experience in Podverse that supports:
- Donate page section (under the form) with async paginated messages from MetaBoost.
- Channel and item `Boosts` tabs using the same reusable component.
- Optional per-message breadcrumb labels (when message belongs to a subbucket), with clickable navigation to the corresponding Podverse page.
- Public API safety: `sender_guid` must never appear in public standards list responses.

## Scope Split (Cross-Repo)

- **Repo A (Metaboost):** public standards list response contract and breadcrumb-ready metadata.
- **Repo B (Podverse):** reusable UI/data client, donate integration, channel/item tab integration, breadcrumb links.

## Required Standards Behavior

- Donate page reads **`mb-v1`** messages.
- Channel page and item page read **`mbrss-v1`** messages.
- `mbrss-v1` list endpoints must support page queries by:
  - `bucketShortId + podcastGuid` (channel context)
  - `bucketShortId + podcastGuid + itemGuid` (item context; item endpoint currently bucket + itemGuid path, with podcast linkage validated server-side where needed).

## Breadcrumb Requirement (New)

Public list responses must include enough metadata to render message-level breadcrumbs in Podverse when the message is in a subbucket (child of current context). Breadcrumb labels should be clickable links that route to the corresponding page in Podverse.

### Locked public breadcrumb contract (must be identical in OpenAPI + implementation)

Each `messages[]` row should include:
- `senderName: string | null`
- `appName: string`
- `body: string | null`
- `createdAt: string` (ISO datetime)
- `breadcrumbContext: null | {`
  - `level: 'channel' | 'item'`
  - `podcastGuid: string | null`
  - `podcastLabel: string | null`
  - `itemGuid: string | null`
  - `itemLabel: string | null`
  - `isSubBucket: boolean`
  - `}`

Notes:
- `senderGuid` is never present in public responses.
- `breadcrumbContext` is `null` when no subbucket breadcrumb should be shown.
- `isSubBucket` is the server hint used by Podverse to avoid showing breadcrumb on current-page context.

### Minimal breadcrumb metadata needed per message

- `bucketContextType` (for example: `channel` or `item`).
- `podcastGuid` and display label when available.
- `itemGuid` and display label when available.
- Optional source bucket short id / hierarchy depth if needed by UI logic.

Podverse can then resolve navigation targets by:
- Finding channel/item records in Podverse using known channel/item GUID relationships.
- Building links to the existing page routes (`/podcast/[channel_id]`, `/episode/[item_id]`) after lookup.

### Locked route-resolution strategy

Podverse breadcrumb link resolver should:
1. Resolve `podcastGuid`/`itemGuid` to Podverse channel/item IDs using existing Podverse API lookup endpoints (add minimal API lookup endpoint only if no current endpoint exists).
2. Cache GUID→ID results in-memory for the session to avoid repeated lookups in paginated lists.
3. Render plain text (no link) when lookup misses or API errors.
4. Never block message rendering on breadcrumb link resolution (lazy/parallel resolve).

## Plan Files

- `00-EXECUTION-ORDER.md`
- `01-metaboost-public-contract-and-breadcrumb-metadata.md`
- `02-podverse-shared-boost-messages-data-and-ui.md`
- `03-podverse-donate-mb-v1-messages-section.md`
- `04-podverse-channel-item-boosts-tabs-and-breadcrumb-links.md`
- `05-polish-copy-i18n-manual-verification.md`
- `COPY-PASTA.md`

## Key Risks and Mitigations

- **Risk:** public schema changes break existing consumers.
  - **Mitigation:** additive breadcrumb fields, explicit OpenAPI update, integration test assertions for both old-required and new-required fields.
- **Risk:** breadcrumb links cannot resolve to Podverse entities by GUID in some cases.
  - **Mitigation:** graceful non-link labels/fallback text if lookup misses.
- **Risk:** cross-repo sequencing mistakes.
  - **Mitigation:** execution order requires Metaboost contract phase before Podverse integration phases.
