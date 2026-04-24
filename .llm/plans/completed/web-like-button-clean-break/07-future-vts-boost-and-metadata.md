# Future Work - Value Time Splits, Boost, And Rich Metadata (Placeholder)

## Purpose

This file is a placeholder scope note for a follow-up plan set. The goal is to de-risk the current likes rollout by keeping **likes** and **VTS** concerns cleanly separated, while still capturing the broader VTS work that is adjacent to the player and Boost flows.

## Why This Is Separate

The initial likes plan intentionally limits VTS to a narrow, shippable slice: **if the VTS can resolve a real `Item` in our database, expose a split like control; otherwise hide it** (parent like remains). That keeps likes semantics strict and prevents inventing a second “like identity” model for subcontent that does not exist in our DB.

## Candidate Scope (For Future Detailed Plans)

Split this placeholder into smaller plan files (examples) when you are ready:

- VTS DTO and API completeness
  - Ensure the web player receives the full VTS model needed to resolve active time ranges, titles/art, and (when available) a stable pointer to a canonical `Item`.
- Remote-only / unresolved subcontent
  - Define a consistent “remote content identity” model for **Boost** and UI overlays, without extending likes to that identity unless explicitly re-scoped.
- Player overlay and UX polish
  - Full “chapter-like” experience for VTS, including when metadata should override episode/chapter display vs supplement it.
- Boost override behavior
  - Align Boost recipient selection and metadata priority during an active VTS with external spec expectations, including Podcast Index and cross-repo compatibility notes, without coupling likes to Boost unless required.

## Out Of Scope (Unless Explicitly Re-Opened)

- Liking a subcontent identity that is not a canonical `Item` in our DB
- A third `medium` playlist specifically for “clips as a platform medium” (current decision is: clips live in the AV default-likes playlist, filtered in UI/API)

## Handoff Note

When this placeholder graduates into real plans, keep the same “clean-break, no fallbacks” policy as the likes plan set, but treat Boost/VTS as a distinct deliverable with its own acceptance tests.
