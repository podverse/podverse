**Cursor model:** Opus 5.5 · **Reasoning:** high

# 33 — Background refresh by sign-in, lapse, and renewal

The `add-by-rss-refresh` sync job keeps Add by RSS feeds current. Signed out, every followed feed
refreshes on the phone, one job per feed. Signed in, the job behaves as it does today: members
refresh through the server's parse-all, and free or lapsed accounts refresh nothing. Feeds the
signed-out user kept are never refreshed while someone is signed in.

## Rows

R2, R5, R7, R21, R22, R23, R25, R40

## Runs after

31

## Files

apps/mobile/src/sync/syncJobPlan.ts
apps/mobile/src/sync/syncQueue.test.ts
apps/mobile/src/sync/syncJobs.ts
apps/mobile/src/data/repositories/addByRssRepository.ts
release-notes/scratchpad.md

## Answers from the code

- **Today:** `createAddByRssRefreshJob` (`syncJobs.ts`) returns when the account snapshot is null
  or `add_by_rss_refresh` is denied, and `planSyncRun` (`syncJobPlan.ts`) never schedules it for
  a signed-out device or for the Add by RSS pull while signed out.
- **Lapse and renewal stay as they are.** A lapsed or free account is denied
  `add_by_rss_refresh`, so the job returns before any request. Stored feeds stay readable and
  playable. When the membership is valid again, the next run passes the same check and parse-all
  resumes. Nothing is saved for later and nothing is moved to the device in between. This plan
  keeps that code path unchanged and only adds the signed-out branch.
- **Signed in means a token, not a snapshot.** Inside a job, `deps.getAuthContext().accessToken`
  is read when the job runs. A non-null token with no snapshot yet is a sign-in still loading,
  and the job returns as it does today. The device branch runs only with no token, so a
  signed-in user never parses on the phone (plan 30).
- **Hidden rows are never device entries.** `listDeviceRefreshEntries` (plan 30) reads
  `listFeeds()`, which leaves out the signed-out user's rows while signed in. The device branch
  runs only signed out, where nothing is hidden. The server branch covers server follows only.
- **Terms:** `SyncProvider.requestSync` plans as signed out while `termsBlocksAccountSync()` is
  true, so once a signed-out plan includes this job, the job can run with a token while terms
  block account sync. That case must neither use the account nor parse on the device.
- **Queue dedupe** (`syncQueue.ts`) only compares against *queued* jobs, so a refresh requested
  while another runs is queued again rather than dropped.

## 1. `apps/mobile/src/sync/syncJobPlan.ts`

- `'add-by-rss-pull-to-refresh'`: return `[{ kind: 'add-by-rss-refresh', priority: 'user' }]`
  whatever `isAuthenticated` is (delete the signed-out early return).
- In the `if (!isAuthenticated)` branch, push `{ kind: 'add-by-rss-refresh', priority }` before
  `return planned;`.
- The signed-in `add-by-rss-refresh` push stays where it is (after `queue-hydrate`). Replace its
  "Membership-tier and checked when the job runs…" comment with: signed in, refreshing is
  membership-tier and checked when the job runs, so a lapsed member keeps their feeds without
  the device asking for work the server would refuse. Above the new signed-out push: a signed-out
  device refreshes the Add by RSS feeds it follows itself, on the phone.
- `'add-by-rss-listed-feeds'` is unchanged (area D owns the listed-feed work).
- Update `planSyncRun`'s doc comment where it says only episodes run signed out: a signed-out
  device also keeps its own Add by RSS feeds current.

## 2. `listDeviceRefreshFeedUrls` — `addByRssRepository.ts`

Add after `listDeviceRefreshEntries` (plan 30):

```ts
listDeviceRefreshFeedUrls: async (params: {
  nowMs: number;
  priority: SyncJobPriority;
}): Promise<string[]> =>
  selectDeviceRefreshFeedUrls({
    entries: await addByRssRepository.listDeviceRefreshEntries(),
    ...params,
  }),
```

`import type { SyncJobPriority } from '../../sync/syncQueue';` on its own line, and
`selectDeviceRefreshFeedUrls` from `'./addByRssDevicePath'`. `requestRefreshAll` is not changed.

## 3. Jobs — `apps/mobile/src/sync/syncJobs.ts`

### Device parse job (new)

Next to `createAddByRssParseJob`, with `const ADD_BY_RSS_DEVICE_PARSE_TIMEOUT_MS = 60000;` beside
`ADD_BY_RSS_LISTED_FEEDS_TIMEOUT_MS`. Its comment: a phone fetches and parses the whole feed
itself, which takes longer than polling a server result; the ceiling keeps one slow host from
holding the serial queue.

```ts
const createAddByRssDeviceParseJob = (
  deps: SyncJobDeps,
  priority: SyncJobPriority,
  feedUrl: string
): SyncJob => {
  const job = buildJob(
    'add-by-rss-device-parse',
    priority,
    `add-by-rss-device-parse:${feedUrl}`,
    async (context) => {
      const authContext = deps.getAuthContext();
      // Queued signed out; someone signed in before it ran, and they never parse on the device.
      if (authContext.accessToken !== null) {
        return;
      }
      await addByRssRepository.refreshFeedOnDevice(authContext, feedUrl, {
        signal: context.abortController.signal,
      });
      // then exactly the tail of createAddByRssParseJob for this feed URL: the listed-feed work
      // check and the auto-download evaluate
    },
    ADD_BY_RSS_DEVICE_PARSE_TIMEOUT_MS
  );
  return { ...job, logDetails: { feed_url: feedUrl } };
};
```

Copy the tail from `createAddByRssParseJob` as it stands when this plan runs (area D may have
changed the listed-feed check); use `feedUrl` where it uses `ticket.feedUrl`.

### Refresh job (rewrite the body of `createAddByRssRefreshJob`)

```ts
const authContext = deps.getAuthContext();
if (authContext.accessToken === null) {
  const feedUrls = await addByRssRepository.listDeviceRefreshFeedUrls({
    nowMs: Date.now(),
    priority,
  });
  context.enqueue(feedUrls.map((feedUrl) => createAddByRssDeviceParseJob(deps, priority, feedUrl)));
  return;
}
if (termsBlocksAccountSync()) {
  return;
}

const account = await accountRepository.getSnapshot();
if (account === null) {
  return;
}

// Local only, and needed whatever the membership: credentials must not sit in a stored URL.
await addByRssRepository.splitStoredUserinfo(account.id_text);

const access = evaluateFeatureAccess('add_by_rss_refresh', deriveMembershipState(account));
if (!access.allowed) {
  return;
}

const tickets = await addByRssRepository.requestRefreshAll(authContext, account.id_text);
context.enqueue(tickets.map((ticket) => createAddByRssParseJob(deps, priority, ticket)));
```

- Everything after the terms check is today's code, with `authContext` read once.
- Import `termsBlocksAccountSync` from `'../terms/termsSyncGate'` (confirm the path against
  `SyncProvider.tsx`, which already imports it).
- Rewrite the job's doc comment as the code stands: signed out, the phone fetches and parses each
  followed feed itself, one job per feed; a background run skips feeds fetched in the last 15
  minutes and a pull checks all of them. Signed in, refreshing is server-side parsing and so
  membership-tier; checking before asking is what makes a lapsed membership degrade rather than
  fail (feeds stay readable and playable, and the device does not collect denials in the error
  log). A signed-in session never parses on the phone.

## Tests

- `apps/mobile/src/sync/syncQueue.test.ts` (`describe('planSyncRun')`):
  - "syncs episodes for a signed-out device…" → rename to "syncs episodes and Add by RSS feeds for
    a signed-out device but nothing that needs an account"; expected kinds
    `['identity-remap', 'channel-items-scan', 'add-by-rss-refresh']`.
  - "plans only add-by-rss-refresh for the Add by RSS pull-to-refresh trigger": also assert the
    signed-out call returns the same single `user` job.
  - The signed-in "adds the account-backed work" test keeps `toContain('add-by-rss-refresh')`.
- No Maestro flow for background refresh: whether a background job fetched a feed is not visible
  on screen in a way a flow can assert reliably (**mobile-test-economics**). Plan 32's
  `add-by-rss-anonymous.yaml` runs this job signed out through its Check for Updates step. The
  signed-in flows (`add-by-rss*.yaml`) keep covering the server branch, which is unchanged.

## Release scratchpad

```markdown
## Mobile refreshes signed-out Add by RSS feeds on the phone

- Surfaces: mobile
- Change: Signed out, Add by RSS feeds now refresh in the background and on pull to refresh by
  fetching and parsing each feed on the phone. Background passes skip feeds the phone fetched in
  the last 15 minutes; pull to refresh checks all of them. Signed in, nothing changes: Trial and
  Premium members refresh through the server, and free or lapsed accounts keep their feeds
  playable without refreshing them. A signed-in session never parses on the phone, and feeds
  followed while signed out are not refreshed while someone is signed in.
- Who notices: signed-out mobile users; feed hosts see requests from phones for signed-out users
- Operator steps: none
```
