# Embed Chapter/Clip/Soundbite Info — Execution Order

## Phase 1

1. Execute `01-segment-info-bar.md`.

## Phase 2

1. Execute `02-clip-playback-parity.md`.

## Phase 3

1. Execute `03-clip-list-builder.md`.

## Phase 4

1. Execute `04-seed-clip-chapter-showcases.md`.

## Phase 5

1. Confirm video top title stays item-only (`preferItemTitle`); no code change expected if already correct.

## Notes

- Apply migration `0037_embed_demo_showcase_play_resource.sql` via `make local_db_init` before seed.
- Phases are sequential.
