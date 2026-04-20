### Session 1 - 2026-04-19

#### Prompt (Developer)

Boosts Gating Tightened (mb-v1 + mbrss-v1)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Split eligibility policy so boost action supports both mb-v1 and mbrss-v1, while Boosts tab remains mbrss-v1-scoped.
- Add explicit defer artifact for non-podcast surfaces to document prerequisites for future Boosts-tab support.
- Refactor podcast/episode Boosts tab fetch guards to consume shared eligibility metadata instead of ad hoc meta-boost parsing.
- Validate touched files with targeted eslint run through the Nix wrapper.

#### Files Modified

- .llm/history/active/boosts-gating-tightened-mb-mbrss/boosts-gating-tightened-mb-mbrss-part-01.md
- apps/web/src/utils/value/boostEligibility.ts
- apps/web/src/app/podcast/[channel_id]/PodcastPageList.tsx
- apps/web/src/app/episode/[item_id]/EpisodePageList.tsx
- .llm/plans/active/boosts-gating-tightened-mb-mbrss/90-non-podcast-boosts-tab-defer.md
