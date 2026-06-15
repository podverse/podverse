# Embed list types, demo ordering, and progress bar fix — Execution Order

Fix the missing embed progress bar, reorder the single demo sections, add an episode-chapters list embed type, expand the `/embed` demo showcase to all eight requested list types, and extend the embed builder to select list content types and sorting.

## Decisions (confirmed with user)

- Episode-chapters list reuses the existing chapters endpoint (`reqItemParseAndGetChapters` -> `GET /item/chapters/{item_id_text}/`), which returns the full list sorted by `start_time ASC`. Chapter "sort" is a client-side ascending/descending toggle (no API sort param).
- Expand the `/embed` demo: reorder singles to the exact 8 specified, add 4 new list demo slots (podcast clips + episode chapters, audio/video). Keep `official-clip` and `playlist` routes fully supported in runtime and builder, but do NOT show them on the `/embed` demo page.
- Seeding must produce real content: parse the chapters for the chapters-list episode, and create multiple public clips for the clips-list channel.
- Audio vs video is a UX layout choice (`presentation` query param), independent of file medium.

## Phases (sequential)

1. `01-progress-bar-fix.md` — restore the video controls progress bar.
2. `02-single-demo-order.md` — reorder single demo sections; trim official-clip/playlist from demo page.
3. `03-episode-chapters-runtime.md` — new episode-chapters list route + fetch + mapper.
4. `04-demo-showcase-slots.md` — new list demo slots + seed real chapters/clips content.
5. `05-builder-content-and-sort.md` — builder list content types + sorting UI.
6. `06-tests-and-docs.md` — unit/E2E coverage + docs.

## Notes

- Phases are sequential. Phase 3 must land before Phase 4 (demo slots reference the new route). Phase 5 depends on Phases 2-4.
- See `COPY-PASTA.md` for ready-to-paste execution prompts.
