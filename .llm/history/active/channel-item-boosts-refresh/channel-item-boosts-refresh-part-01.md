### Session 1 - 2026-04-19

#### Prompt (Developer)

Channel/Item Boosts Refresh Plan

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Use a shared refresh trigger in Modals context so modal boost success can re-query Boosts tab lists on channel/item pages.
- Reuse existing `BoostMessagesSection.refreshTrigger` behavior instead of adding duplicate fetch logic.
- Trigger refresh bump from `BoostFormBase` `onBoostSuccess` callback so it applies to modal boosts on both channel and item pages.
- Validate with targeted ESLint on touched files to avoid unrelated workspace-wide lint blockers.

#### Files Modified

- .llm/history/active/channel-item-boosts-refresh/channel-item-boosts-refresh-part-01.md
- apps/web/src/contexts/Modals.tsx
- apps/web/src/components/Boost/BoostFormBase.tsx
- apps/web/src/app/podcast/[channel_id]/PodcastPageList.tsx
- apps/web/src/app/episode/[item_id]/EpisodePageList.tsx
