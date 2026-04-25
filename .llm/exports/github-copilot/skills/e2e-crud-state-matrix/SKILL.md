---
name: e2e-crud-state-matrix
description: Enforces a strict CRUD and UI-state matrix for Playwright tests. Use when adding or reviewing E2E specs for create/read/update/delete, validation, show/hide, enable/disable, and empty/loading/error branches.
version: 1.0.0
---


# E2E CRUD State Matrix

Use this skill before marking E2E work complete. Current E2E bar: **Confident**.

## Required matrix per surface

For each tested page/component surface, explicitly track:

- Create
- Read
- Update
- Delete
- Show/hide controls by state
- Enable/disable transitions (including submit loading state)
- Validation (required fields, invalid input, server error text)
- Empty/loading/error states

## Quality bar

- Prefer deterministic assertions over broad fallback assertions.
- Do not accept "route loads" as sufficient for edit/delete flows.
- For update/delete, assert both action result and post-action persistence.
- For forms, assert button/input state transitions before and after submit.

## Minimum assertion patterns

- **Create**: submit valid form -> redirect/result -> row/detail visible.
- **Update**: edit field -> save -> revisit -> updated value visible.
- **Delete**: confirm dialog path -> row removed; cancel path -> row unchanged.
- **Validation**: empty/invalid submit -> remains on form -> validation visible.

## Podverse-specific CRUD surfaces

The web app is primarily a content consumption app. CRUD applies to user-generated content:

- **Playlists**: create, read, update (edit name/description), delete, add/remove items.
- **Clips**: create, read, delete.
- **Queue**: add, remove, reorder.
- **Following**: follow/unfollow podcasts, channels, accounts.

The management-web app may have full CRUD for administrative resources (user management, podcast management) in the future.

## Membership-gated surfaces

For features gated by membership state (premium-only features, trial restrictions), also apply **e2e-membership-state-matrix**. This ensures CRUD operations are tested across membership states where behavior differs.

## Completion checklist

- [ ] Every modified surface has CRUD row status (`covered` or `deferred`).
- [ ] Deferred rows include rationale.
- [ ] Membership-gated CRUD operations tested across relevant membership states.
- [ ] Changed specs pass targeted runs.
