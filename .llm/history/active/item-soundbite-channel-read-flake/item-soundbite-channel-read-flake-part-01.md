## Started

2026-05-01

## Author

Cursor Agent

## Context

API integration test flake / timeout debugging.

### Session 1 - 2026-05-01

#### Prompt (Developer)

@/Users/mitcheldowney/.cursor/projects/Users-mitcheldowney-repos-pv-podverse-ansible/terminals/14.txt:1047-1427 debug

#### Key Decisions

- Registered static `item-soundbite` paths (`/channel/:channel_id_text`, `/item/:item_id_text`)
  before the parametric `/:item_soundbite_id_text` route so routing matches the `item` router
  pattern and avoids any ambiguous matching across Express versions.
- Raised the per-test timeout for `GET /item-soundbite/channel/:channel_id_text returns 200` to
  15s to absorb intermittent slowness (e.g. DB / CI variance) when the handler runs against real
  services in noisy environments.

#### Files Created/Modified

- apps/api/src/routes/itemSoundbite.ts
- apps/api/src/test/category-channel-item-read.test.ts
- .llm/history/active/item-soundbite-channel-read-flake/item-soundbite-channel-read-flake-part-01.md
