# Feature: add-by-rss-dedupe

## Sessions

### Session 1 - 2026-02-05

#### Prompt (Developer)

the Check for Updates button works the first time i press it, but when i press it a second time right after within the first minute, the check for updates just continues to loading spinner without ever stopping. the reason is apparently because a completed signal or something never gets sent since the mq dedupe causes a message to silently fail to be sent. how to handle this case where 1 or many or all of the feeds sent with check for updates hits this dedupe mq issue?

execute the plan

#### Key Decisions

- Added a keyvaldb dedupe cache for add-by-RSS parse-all to avoid queueing within the MQ dedupe window.
- Returned dedupe metadata from the parse-all API so the UI can stop polling immediately.
- Used a loading/success/error toast lifecycle around Check for Updates and showed a retry wait toast when deduped.

#### Files Modified

- apps/api/src/lib/addByRSSParseDedupeCache.ts
- apps/api/src/controllers/account/accountAddByRSSParse.ts
- apps/web/src/utils/addByRSS/api.ts
- apps/web/src/utils/addByRSS/parseAll.ts
- apps/web/src/components/AddByRSS/List/AddByRSSListClient.tsx
- apps/web/src/app/add-by-rss/episodes/AddByRSSEpisodesPageClient.tsx
- apps/web/src/app/add-by-rss/artists/AddByRSSArtistsPageClient.tsx

### Session 2 - 2026-02-05

#### Prompt (Developer)

when i press check for updates twice within the span of 1 minute, two of these display

the "done" should not display if the wait 1 minute displays

and the wait 1 minute should display a warning icon, not a success icon. ideally the toast is a warning color as well

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Replaced the loading/success toast lifecycle to suppress success when dedupe wait is shown.
- Rendered dedupe wait messages as warning toasts (icon/color).

#### Files Modified

- apps/web/src/components/Toast/ToastImpl.tsx
- apps/web/src/components/AddByRSS/List/AddByRSSListClient.tsx
- apps/web/src/app/add-by-rss/episodes/AddByRSSEpisodesPageClient.tsx
- apps/web/src/app/add-by-rss/artists/AddByRSSArtistsPageClient.tsx
