---
name: home-subscriptions-ux-pattern
overview: Update home page subscriptions UX (ListCombinedChannels and related) to follow Common/Core/AddByRSS/Page patterns after other resource plans are completed.
todos:
  - id: inventory-combined
    content: Review ListCombinedChannels usage and structure
    status: pending
  - id: common-core-combined
    content: Create Common/Core combined channels list components
    status: pending
  - id: refactor-home-combined
    content: Update home subscriptions UX to Core components
    status: pending
isProject: false
---

# Home Subscriptions UX Plan (Post-Resource)

## Goal

Bring the home page subscriptions UX (`ListCombinedChannels` and related components) in line with the Common/Core/AddByRSS/Page patterns after the resource-specific list/header refactors are complete.

## Order

Run **after** all other resource plans (episodes, artists, albums, tracks, livestreams — list + header plans).

## Steps

1. **Inventory current subscriptions UX**
  - Review `[apps/web/src/components/List/ListCombinedChannels/](apps/web/src/components/List/ListCombinedChannels/)` and any home/subscriptions page usage.
2. **Define Common/Core structure**
  - Identify shared list row/grid/node patterns and extract to `components/Common/List/CombinedChannels/`.
  - Create Core components in `components/Core/List/CombinedChannels/` using Common components.
3. **Refactor home/subscriptions usage**
  - Update home page list(s) to use Core components.
4. **Optional AddByRSS integration (if applicable)**
  - If there is an AddByRSS view for combined subscriptions, move it to `components/AddByRSS` and wire to Common.

## Expected Files

- `apps/web/src/components/List/ListCombinedChannels/*` (refactor or relocate)
- `apps/web/src/components/Common/List/CombinedChannels/*` (new)
- `apps/web/src/components/Core/List/CombinedChannels/*` (new)
- Home/subscriptions page(s) using the combined list
