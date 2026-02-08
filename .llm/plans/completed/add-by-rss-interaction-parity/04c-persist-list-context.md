# Subplan 4c (Optional): Persist List Context Across Navigation

## Goal

If list context is stored in React state only, it is lost on full navigation
(e.g. user plays from add-by-RSS episode list, then navigates to another page).
If we want "next" to still use that list when playback ends after navigation,
persist list context (e.g. sessionStorage or a durable context that survives
route changes).

## Scope

- **Optional**: Implement only if product requirement is that add-by-RSS
  list-based autoplay-next should survive navigation.
- If list context is in React state and we do **not** persist, playback-end
  will fall back to queue (4a) after navigation, which may be acceptable.

## Implementation options

1. **sessionStorage**
   - On set: write list context (feedIdText, itemIdTexts, currentIndex) to
     sessionStorage (e.g. key `addByRSSListContext`).
   - On init: read from sessionStorage into context/state.
   - Clear sessionStorage when list context is cleared (core play or new list).

2. **Durable React context + persistence**
   - Same shape as 4b; context provider reads/writes to sessionStorage (or
     similar) so that remounts (e.g. after navigation) restore the last list
     context until it is explicitly cleared.

3. **Re-derive from IndexedDB on playback end**
   - Do not persist list context; when playback ends and current is add-by-RSS
     but no list context (e.g. lost on navigation), optionally re-derive "list"
     from IndexedDB (e.g. same feed’s episodes by pub date) using current idText
     to find index and then index+1. More work and may not match user’s
     original list order.

## Recommendation

- For first iteration, 4b (React state only) is enough; add 4c only if we need
  list context to survive navigation.
- If adding 4c: use sessionStorage in the same place where list context is
  set/cleared (e.g. in AddByRSSListContext provider), and document in 04
  that list context can persist across navigation.

## Deliverables (if implemented)

- [ ] List context read/write to sessionStorage (or equivalent) when set/cleared.
- [ ] On provider init, restore from sessionStorage so list context survives
  navigation.
- [ ] Short note in 04-autoplay-next.md that list context may persist across
  navigation (when 4c is done).

## Files reference

| Area                    | Path |
| ----------------------- | ---- |
| List context provider   | e.g. `apps/web/src/contexts/AddByRSSListContext.tsx` |
