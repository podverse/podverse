# Autoplay Next (Add-by-RSS)

## Session 1 - 2025-02-07

#### Prompt (Developer)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself. To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- 4a (next from queue when row is add-by-RSS) and 4b (list context + next from list) were implemented in prior session; this session completed 4b by wiring listContext from list nodes into rows.
- List nodes pass `listContext={{ feedIdText, itemIdTexts, currentIndex }}` and `indexItem` where needed: AddByRSSEpisodesListNodes, AddByRSSEpisodeNodes, AddByRSSTrackNodes, AddByRSSLivestreamNodes.

#### Files Modified

- apps/web/src/components/AddByRSS/Podcast/Episode/AddByRSSEpisodesListNodes.tsx (listContext + indexItem for rows)
- apps/web/src/components/AddByRSS/Podcast/Episode/AddByRSSEpisodeNodes.tsx (listContext for rows)
- apps/web/src/components/AddByRSS/Artist/Album/Track/AddByRSSTrackNodes.tsx (listContext for rows)
- apps/web/src/components/AddByRSS/Livestream/AddByRSSLivestreamNodes.tsx (listContext for rows)
