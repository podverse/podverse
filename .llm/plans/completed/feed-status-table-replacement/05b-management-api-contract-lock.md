# 05b — Management API contract lock

## Goal

Finalize feed-operations API contract before implementation to prevent cross-layer rework.

## Endpoint strategy

- Replace status-specific route naming with future-focused naming:
  - `GET /feed-operations/options` remains but returns lifecycle/condition/options.
  - `POST /feed-operations/update-policy-state` (or equivalent finalized name) as write endpoint.
- Keep lookup endpoint behavior but return new typed shape.

## Request contract (write endpoint)

- Required:
  - `feed_id: number`
- Optional with explicit validation:
  - `lifecycle_state_key: 'active' | 'pending_archive' | 'archived' | 'takedown'`
  - `active_condition_keys: string[]` (must be allowlisted known condition keys)
  - `condition_note: string | null`
  - `spam_item_limit_override: number | null`
  - `max_response_body_bytes_override: number | null`
  - `policy_overrides` object:
    - `parse_allowed_override: boolean | null`
    - `public_visible_override: boolean | null`
    - `add_allowed_override: boolean | null`
  - `transition_note: string | null`

## Response contract

- `feed`:
  - identity fields (`id`, `url`, `podcast_index_id`)
  - lifecycle (`lifecycle_state_key`, `lifecycle_reason`, `updated_source`)
  - active conditions (`active_condition_keys`)
  - effective policy (`parse_allowed`, `public_visible`, `add_allowed`, `primary_block_reason`)
  - override fields (if present)
  - override numeric limits

## Validation rules to lock

- `takedown` lifecycle requires `takedown_active` condition unless operator explicitly marks
  temporary transitional mode.
- `archived` lifecycle disallows parse/public/add effective policy true.
- Unknown condition keys are rejected with 400.
- Transition validation must enforce matrix from `01b`.

## Audit requirements

- Store before/after snapshots at feed row + lifecycle + conditions resolution level.
- Persist request ID and admin account ID.
- Do not log raw secrets or irrelevant large payload blobs.

## Completion criteria

- Joi schemas and integration tests exactly reflect this contract.
- Management-web request client types align one-to-one with contract.
