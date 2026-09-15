# 01 — Browse podcast host names

**Cursor model:** Codex 5.3
**Reasoning:** medium

Follow detail
[738-browse-podcast-host-names](/docs/proposals/mobile/_master-plan_/phase-2/details/738-browse-podcast-host-names.md)
and locked decisions in [00-SUMMARY.md](00-SUMMARY.md).

## Steps

1. In `apps/mobile/src/screens/home/homeFeedData.ts`, add an options arg to
   `normalizeChannelRows`:

   ```ts
   normalizeChannelRows(items, { includeAuthor?: boolean })
   ```

   Default is today's behavior (no author from `channel_about`). When `includeAuthor` is true, set
   `subtitle` from `channel_about.author`, then top-level `author`. Do **not** use `link` as a host
   stand-in. Keep existing `owner.name` fallback only for the non-author path if it already exists
   for other media types — for the author path, prefer author fields only.

2. In `apps/mobile/src/screens/browse/browseFeedData.ts`, pass `{ includeAuthor: true }` only when
   `mediaType === 'podcasts'` for the channel-list branch. Videos / Artists / Albums stay default.

3. Leave subscribed mappers at `subtitle: null`:
   `mapSubscribedChannelToRow`, `channelToHomeRow`, `fetchUnsubscribedDownloadHomeRows`. Do not
   add `author` to `SubscribedChannel`.

4. In `HomeFeedRow.tsx`, add `testID={`home-feed-row-subtitle-${row.id}`}` on the subtitle /
   channelLabel `Text` so the host line is assertable.

5. Unit tests in `homeFeedData.test.ts`:
   - `includeAuthor: true` + `channel_about.author` → subtitle set
   - default / `includeAuthor: false` + same payload → subtitle still null
   - empty author → omit the line

6. E2E: keep `apps/mobile/e2e/browse.yaml` Podcasts screenshot after the list settles. Assert a
   subtitle only if a seeded channel author is stable; otherwise unit tests own the mapping
   contract and the screenshot is the visual check. Do not change Home E2E to expect host names.

7. Mark detail 738 and the Phase 2 master-plan step `done`. Mark this COPY-PASTA prompt `[x]`.
   Move this plan set to `completed/` when finished (last prompt).

## Do not

- Do not run tests during agent work.
- Do not change web directory rows.
- Do not put host names on Browse Videos / Artists / Albums or Home subscribed rows.

## Operator verification (end of response)

```bash
npm --prefix apps/mobile run test -- src/screens/home/homeFeedData.test.ts
npm run mobile:e2e:test -- browse
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```

Label the Maestro block **Mobile Maestro**. Remind that **Mobile Metro** + **Mobile iOS** /
**Mobile Android** must already be up.
