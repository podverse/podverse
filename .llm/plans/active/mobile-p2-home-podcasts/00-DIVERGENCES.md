# Implementation divergences from the locked decisions

Where an implementation had to depart from a decision locked in [00-SUMMARY.md](00-SUMMARY.md), and
why. Recorded as it happens rather than at the end, per prompt 18 step 4. Do not silently diverge
from a locked decision — add an entry here instead.

Recorded as they happen rather than at the end, per prompt 18 step 4.

**Prompt 14 — the whole subscribed list is read into the browser and filtered there, under a
1000-channel ceiling.** Detail 713 offered two resolutions and preferred reading the full list "if
the list size makes that reasonable". It does: the list is walked one page at a time only once a
term is actually typed, cached until sort, range, or account changes, and stopped at
`PAGINATION.MAX_COUNT`. An ordinary visit that never touches the input costs nothing, a typical
account costs one request, and no keystroke costs anything at all. The server-side alternative would
have put a free-text parameter on three subscribed endpoints and a `LIKE` on every keystroke's
request. The ceiling is the visible consequence: an account following more than 1000 channels is
filtered against the first 1000 in its chosen sort order.

**Prompt 14 — pagination over a filtered list counts matches, not subscriptions.** The detail
requires pagination to reflect filtered results. While a term is in force the list pages
client-side over the matches, at the same page size the server would have used, and a page number
past the last one is clamped rather than rendered blank — narrowing while on page 4 is ordinary, and
an empty page would read as the filter having found nothing. Clearing the term returns the user to
the server page they were on, which is why the two page numbers are held separately.

**Prompt 14 — a filtered URL names the list it narrowed; an unfiltered one stays bare.** The detail
asks only that the term round-trip. A URL carrying `filter=` alone is not enough to reconstruct what
was on screen, because the list type, sort, and range otherwise come from the viewer's own saved
defaults — so a shared filtered link would narrow a list the sender never saw. `type`, `sort`, and
`range` are therefore written alongside the term. Without a term the URL is left exactly as it was
found, including on arrival, so a deep link is not rewritten before the user has done anything.

**Prompt 14 — matching is shared code now, and it strips a leading article rather than punctuation.**
The detail describes matching "against both the raw title and a stripped form, so punctuation and
diacritics do not prevent an obvious match". What mobile shipped in prompt 08, and what web now uses,
strips a **leading article** — "The Daily" answers to `daily` — and leaves punctuation and diacritics
in place, because the sortable-title form that removes them also removes the spaces a user is still
typing, so "daily show" would fail against `dailyshow`. Rather than write a second answer to the same
question, `matchesTitleFilter` moved out of `apps/mobile` into `@podverse/helpers` and both surfaces
call it, so which shows a user can find does not depend on the device in their hand. Prompt 07 set a single page limit of 60 for both reading seen state and marking it. Web
cannot use a 60-channel page the way mobile can: mobile pages the whole list during background sync,
but the web list is ordered by the user's chosen sort while the endpoint returns channels ordered by
`id_text`, so a partial read badges an arbitrary subset of the visible page. Reading is an index
probe per follow that stops one row past the display cap, which is cheap enough to raise the page to
500 — enough for one request to serve almost every account. The limits split rather than moved:
`CHANNEL_SEEN_MARK_BATCH_LIMIT` stays 60 because a mark is a real upsert per row. The larger page is
paid for with a per-account rate limit on the two GETs
(`ACCOUNT_CHANNEL_SEEN_READ_MAX_PER_MINUTE`, default 60), which the operator chose over leaving the
bigger read unguarded. Web still pages beyond 500 under a fixed ceiling, so an account following
thousands of channels is correct rather than truncated.

**Prompt 13 — the badge's accessible label names the count, and the row names the channel.** Work
item 6 asks for "an accessible label that names the channel and the count". Putting the channel name
inside the badge would say it twice, because the badge sits inside the row link whose accessible
name already opens with the channel title — a screen reader reads "E2E Podcast Seed Channel, 3 new
episodes" from the composition. The same item's other requirement, that the count be part of the
link's accessible name rather than an orphaned number, is what that composition delivers. `CountBadge`
also gained an `announce` prop for this: a list renders one badge per row, and the `role="status"`
the bell badge uses would turn a page load into a queue of announcements, so list badges are
`role="img"` with a name instead.

**Prompt 13 — E2E serves the count from the test and asserts the write as a request.** Work item 7
asks for a spec covering unseen counts and the count clearing after a channel visit. Those two halves
cannot both run against the database in one suite, because opening a channel while signed in **is**
the write: any other spec that visits the seeded channel moves the number the display test asserts,
and the display test cannot restore it afterwards since seen state only moves forward. The read is
therefore fulfilled by the spec, which lets the three display rules — an exact count, `20+`, and no
badge at all — be asserted as three outcomes on the same seeded row. The write half is asserted for
real, as the mark request the channel page sends and its body. The seed now follows two channels so
the subscribed list has rows at all.

**Prompt 12 — Home's Search button now resets the Search stack, reversing what prompt 08 chose.**
Prompt 08 routed the empty-state button through the tab navigator specifically so Search would keep
whatever the user last had open there. Detail 709 requires that button to land on the Search root
with an empty, focused field, which is the opposite. The detail wins, and the reversal is narrow: it
applies only to that button, via an `autoFocus` param on `SearchRoot`. Tapping the Search tab itself
still restores whatever was there, so the tab-isolation behavior prompt 08 was protecting is intact
for every other way in. The two entrances want different things — one resumes, one starts.

**Prompt 12 — nothing was left to clean up in i18n, and no E2E flow referenced the removed
`testID`s.** Work items 5 and 6 both assumed the chips owned something. They did not:
`filters.sort.a_z` and `filters.sort.recent` are used by Home's sort row and filter/sort screen,
`filters.type.all` and `media.music.music` by web's home dropdown and side bar, and no flow ever
tapped `search-medium-*` or `search-sort-*`. `search.yaml` now asserts those IDs are **absent**
instead, which is the contract worth holding — a chip reappearing is the regression, not a stale
selector.

**Prompt 11 — the view is two checkable rows, not one row whose label flips.** Decision 15 and detail
708 both write the entry as "Grid View / List View", which reads as a single toggling label, as the
previous-generation nav icon was. That cannot satisfy the accessibility requirement in the same
detail — "the view toggle reports which mode is active" — because a flipping label is exactly the
control that cannot say whether it names the mode you are in or the one you would move to. Two rows
with the active one checked state it outright, carry `accessibilityState.selected` natively, and
match the checkmark idiom the Filter/Sort screen in this same set already uses. The menu therefore
has three rows rather than two.

**Prompt 11 — grid columns are counted separately from row columns.** The plan says to keep using
`resolveColumns` "rather than a fixed three". Taken literally that produces a one-tile-wide grid on
every phone, because `resolveColumns` returns 1 below the `md` breakpoint — it counts how many
**rows** fit side by side, and a row carries artwork, a title, a metadata line, and buttons. A tile
is a square of artwork. `resolveGridColumns` sits beside it in the same module, scaling on the same
design-token breakpoints (3 / 4 / 5), so the intent — responsive, not fixed — is kept while the grid
is actually a grid.

**Prompt 11 — the overflow menu is offered on the Podcasts media type only.** The plan says to add it
to "the Home header" without qualifying. Both entries describe the subscribed channel list, so on
Episodes, Clips, Artists, Albums, and Tracks the control would open onto nothing that applies. It is
hidden there, the same way the scope chip and the sort row already are.

**Prompt 11 — E2E cannot assert Mark All As Seen clearing badges, and asserts the disabled state
instead.** The detail asks E2E to cover "marking all as seen clearing badges". No flow can currently
produce an unseen badge: a `null` last-seen reads as nothing unseen by design, so a fresh follow has
none, and the only subscribe path in E2E runs from the podcast detail screen, which marks that
channel seen as it opens. The seeded account follows nothing at all. What is covered is the menu, the
view switch on a real subscription in `subscriptions-anonymous.yaml`, and the disabled Mark All As
Seen declining to act in `home.yaml`. Reaching the clearing path needs a seeded account that follows
a channel with episodes published after a seeded last-seen timestamp — worth adding when the seed
grows follows for other reasons.

**Prompt 11 — the bottom sheet was extracted from `MediaRowActions` rather than rebuilt.** Not a
divergence from a decision, but worth recording as the reason a player component changed in a Home
prompt: the header menu needed the same sheet the row menus already had. It now lives in
`components/primitives/ActionSheet.tsx` and both use it. The extraction also fixed the sheet's
accessibility on the way through — the scrim leaves the accessibility tree, the sheet takes
`accessibilityViewIsModal` so a screen reader stays inside it, and rows carry menu roles.

**Prompt 10 — live status needed a new local store and a new sync job; it could not come from what
was already stored.** Detail 707 says all four row elements read local storage and that a missing
field means extending the local schema rather than fetching per row. Live status could not be
extended into an existing store: live items are filtered out of every regular item query, so
`channel_item` can never contain one, and `DTOChannel` carries no live field. It also could not be
fetched per row without a request per subscription. A `channel_live_status` table now holds it,
filled by a queued `channel-live-status` job calling `/live-item/subscribed/recent` once for the
whole follow list, and by the add-by-RSS parse for feeds that declare their own live items. The
operator chose this over dropping the badge and over a per-row fetch. The consequence is that
directory rows only get the badge while signed in; add-by-RSS rows get it signed out and offline.

**Prompt 10 — a stored live status expires after an hour.** Nothing in the detail bounds how long a
status is believed. A broadcast ends whether or not the device is online to hear about it, so a
stored row is not evidence of anything indefinitely — without the bound, a phone left in a pocket
over a weekend opens on Monday insisting three shows are live. The row is left in place and simply
not trusted, so the next refresh overwrites it rather than needing a sweep.

**Prompt 10 — the downloaded count covers directory channels only.** The `download` table is keyed
by item, and the channel it belongs to comes from `channel_item`. Add-by-RSS episodes are not stored
as channel items and have no download path in the app yet, so they join to nothing and read as zero.
Since zero hides the line, an add-by-RSS row simply does not carry a download count. Revisit when
add-by-RSS downloads exist. Operator-chose this over inventing a second count path.

**Prompt 10 — the unseen badge and the downloaded count are hidden at zero, not shown as `0`.**
The acceptance criteria state the unseen badge is absent at zero but say nothing about the download
count. Both now follow the same rule: the line appears only when there is something to open offline.
Showing `0 downloaded` would put a mark on every caught-up row that says nothing. Operator-confirmed.

**Prompt 10 — E2E asserts row metadata in `subscriptions-anonymous.yaml`, not `home.yaml`.** The
detail asks for assertions "on a seeded subscription". The seeded account deliberately follows
nothing, which is what makes `home.yaml` the right home for the empty state and the wrong one for
row metadata. `subscriptions-anonymous.yaml` is the flow that actually creates a subscription, so
the latest-episode line is asserted there once the episode sync lands. The other three are absent on
that path and asserted absent, which is the correct state rather than a gap: nothing is downloaded,
the live badge needs an account, and a channel never opened has nothing unseen.

**Prompt 09 — sort covers Podcasts and Episodes only, and there is no `All` channel-types chip.**
Detail 706 describes the control without qualifying which media types carry it. The operator scoped
it to the two lists Home reads locally and deferred the rest, because sorting Clips, Artists, Albums,
and Tracks is downstream of deciding whether they show directory content at all — the contradiction
prompt 08 recorded. The row is hidden on those four rather than shown and inert. Deferred work,
including the `All` option covering podcasts, artists, and albums, is written up in
[720-defer-home-media-type-sort-coverage](/docs/proposals/mobile/_master-plan_/phase-2/details/720-defer-home-media-type-sort-coverage.md).
Operator-confirmed.

**Prompt 09 — `recent` on the Episodes list orders the recency window, it does not re-select from
it.** Which episodes appear is always "the newest 60 across subscribed channels"; sort decides the
order they are shown in. Ordering the whole stored corpus by title instead would answer "sort this
list" by replacing it with different episodes, most of them years old. The same applies to the
cold-install fallback: the subscribed-items endpoint ranks by recency only, so an `A-Z` choice
reorders the page it returned rather than asking the server for something it cannot provide.

**Prompt 09 — add-by-RSS recency is a stored column, not derived at read time.** An add-by-RSS feed
keeps its items inside one JSON bundle, so ordering by latest publish date would mean parsing every
followed feed on every sort. `add_by_rss_feed` gains `latest_item_pub_date_ms`, written when a parse
lands, so the list read stays a column comparison. Mobile-only SQLite migration; the re-parse job
backfills existing rows. Operator-chose this over parse-on-read and over a separate item table.

**Prompt 09 — E2E asserts the control and the remembered choice, not row order.** Detail 706 asks for
"seeing list order change". No mobile flow creates two subscriptions with known titles, and the
seeded account deliberately follows nothing, so an order assertion today would need a new fixture
rather than a new assertion. `home.yaml` covers opening the screen, switching sort, the choice
surviving a re-open, per-media-type scoping, and the row being absent where sort is unsupported.
Ordering itself is covered by unit tests over the comparators. The fixture work is listed in 720.

**Prompt 08 — "subscribed-only" is enforced on Podcasts and Episodes; four media types still read the
directory.** Decision 2 says no global or directory rows in any auth state, but Clips, Artists,
Albums, and Tracks request global content unconditionally and 00-SUMMARY lists all five non-podcast
media types as out of scope. Satisfying decision 2 literally would mean emptying or removing chips
this set was told not to touch. Podcasts now reads local storage with no fallback at all, and the
Episodes cold-install fallback asks for `type: 'subscribed'` and only when signed in — signed out the
server cannot know a device-local subscription list, so its only answer would have been the
directory. The other four are unchanged and inherit the contradiction; resolve it when those media
types are planned. Operator-confirmed.

**Prompt 08 — the filter narrows whichever media type is showing, not only Podcasts.** The detail
scopes matching to "locally stored channels and items". Filtering the rendered rows covers both with
one code path, needs no per-media-type branching, and behaves consistently when a user switches chips
with a term already typed. Operator-confirmed.

**Prompt 08 — the empty states key off whether the filter emptied the list, not off subscription
count.** Decisions 17 and 18 describe "no subscriptions" and "filter matches nothing". Implemented as
"the source was empty" versus "the source had rows and the term removed them", which is the same
distinction for Podcasts and Episodes and degrades sensibly for the four directory-backed media types
rather than needing a fifth code path. A directory list that legitimately returns nothing therefore
shows the Search call to action, which is a reasonable next step from any empty Home list.

**Prompt 07 — seen state is a column on the follow rows, not an account-scoped table.** Detail 703
said "an account-scoped table server-side". A table would have needed its own account and channel
columns, its own uniqueness constraint, and its own cleanup on unfollow — all of which reproduce what
`account_following_channel` already is. An account and a channel it follows is exactly the grain the
state has, so `last_seen_at` is a nullable column on that row and on
`account_following_add_by_rss_channel`. Unfollowing drops it through the cascade that already exists.
`NULL` means never opened, which reads as nothing unseen, so following a show does not announce its
back catalogue as new.

**Prompt 07 — add-by-RSS has its own endpoints and carries no unseen count.** The detail described
one shape for "per-channel unseen counts". The server stores no add-by-RSS items, so it cannot derive
a count for one; only the device holding the parsed feed can. Rather than return a field that is
always zero, add-by-RSS reads and writes through `/account/channel-seen/add-by-rss` and
`/account/channel-seen/mark-add-by-rss`, which carry timestamps only. Both kinds still sync the
timestamp, so opening a feed on one device clears its badge on another. `mark-all` sweeps both.

**Prompt 07 — anonymous timestamps are not pushed into an existing account on sign-in.** The
acceptance criteria say local timestamps merge into the account on sign-in by the later-wins rule.
Prompt 02 since established that the account is the source of truth after sign-up, and reconciliation
follows it: later-wins applies per channel **the account already follows**, in both directions, so a
channel opened offline still clears on the web. A local-only follow keeps its timestamp on the device
and is never pushed into an account that did not ask for it — and once the account list replaces the
local one, its row is dropped with the follow.

**Prompt 05 — successes are not stored, which is what makes the failure-retention rule hold.** The
plan left storing successes as an implementation call and asked for a reason either way. Recording
them turns a diagnostic log into a transcript: one library pass settles dozens of jobs, so a 500-row
cap would represent minutes rather than months and the entries worth keeping would be the ones
squeezed out. Only failures and skips are written, so the cap can only be reached by things that
went wrong. The retention rule still exists and is tested — it evicts non-failures before failures —
so the guarantee holds if a future job ever does record a success.

**Prompt 05 — an offline failure is recorded as `skipped`, not `failure`.** The classifier already
separates "the server answered badly" from "the request never left the device", and the queue parks
on the second rather than walking every remaining job into the same wall. Filing that as a failure
would report the user's train tunnel as a fault; filing it as `skipped` tells support something more
useful, which is that this device believed it had no network. Because the queue parks after the
first one, an offline stretch produces about one entry per run rather than a flood.

**Prompt 05 — the stored code keeps both the HTTP status and the API body code.** Detail 719 lists
"HTTP status, API body code, or an internal identifier" as alternatives for the one `error_code`
column. Choosing between them loses a question support then has to ask, so `classifySyncError` now
composes them as `http_403:membership_required` when the body names its own failure, falling back to
`http_403` when it does not. This changes the codes the queue reports, so it also changes what the
progress indicator's sibling path sees — nothing renders them, but the format is now a contract the
log screen displays verbatim.

**Prompt 04 — the bottom content inset needed no fixing, because nothing is occluded.** Detail 718
and work item 4 both assumed lists slide under the mini player and that the app needs a shared
bottom-chrome height. It does not. `@react-navigation/bottom-tabs@7.18.8` renders the whole custom
`tabBar` element as a **flex sibling** of the screen container, which is `flex: 1` — so the screens
area is already reduced by the full height of that column, mini player included. Adding the sync bar
to the same column shrinks it again automatically. Introducing a `MINI_PLAYER_HEIGHT` and threading
it through ~20 list `contentContainerStyle` sites would have added dead space below every list, not
removed occlusion. The one real consequence is that the screen area resizes when the bar appears and
disappears — which is exactly how the mini player already behaves on play and stop.

**Prompt 04 — on tablet the bar sits below the whole navigator, not inside the tab bar element.**
The plan assumed the tablet branch renders a bottom bar. It renders a **left rail**
(`tabBarPosition: 'left'`), so "above `BottomTabBar`" there means the top of a ~120dp-wide vertical
strip, which cannot hold a labeled horizontal bar, and wrapping the rail to insert one requires flex
surgery on a third-party component to stop it collapsing to content height. Instead `TabScaffold`
wraps the navigator on tablet and puts the bar full-width beneath it. It does not vanish, it is
legible, and the rail is untouched. It takes its own home-indicator inset there via the `bottomInset`
prop, since the constraint that `BottomTabBar` owns that inset only holds for the phone column.

**Prompt 04 — announcements are imperative, not `accessibilityLiveRegion`.** The plan asked for
`accessibilityLiveRegion="polite"` **and** for meaningful transitions only. Those conflict here: a
live region announces on any subtree text change, and the visible count changes on every job, so a
forty-page subscription walk would announce forty times. The bar instead calls
`AccessibilityInfo.announceForAccessibility` when the **job label** changes, which is one
announcement per phase of work and behaves the same on iOS and Android (`accessibilityLiveRegion` is
Android-only). The role, name, and value are on the container as specified.

**Prompt 04 — mobile i18n interpolation was broken and had to be fixed to ship the counts.** The
catalog is authored in single-brace `{name}` form because web reads the same shared and consumer
layers through next-intl, but `apps/mobile` initialises i18next with its default `{{name}}`
delimiters. Every placeholder in the mobile bundle was therefore rendering verbatim — visibly so in
the OPML import progress text. `src/i18n/index.ts` now sets `prefix: '{'` / `suffix: '}'`. No mobile
string uses `{{ }}`, and the five ICU plural strings in the merged catalog have no mobile caller.

**Prompt 04 — the bar hides while the queue is parked offline.** Prompt 03 added a `paused` status
the plan predates. Parked means no job is running and there is no label to show, so the bar is
absent rather than stalled at a frozen count; it returns when connectivity resumes the run.

**Prompt 03 — the queue core lives in `src/sync/`, the existing primitives stay in `src/data/sync/`.**
The plan located `readThrough` / `writeBehind` / `syncMetadata` at `src/sync/` and told the queue to
reuse them there. They are actually at `src/data/sync/`, and they belong there: they are data-layer
primitives a repository composes per call, whereas the queue is app-level orchestration that decides
what runs and when. `src/sync/` is now the orchestration layer and imports nothing from
`src/data/sync/` — the reuse the plan asked for happens one level down, inside the repositories the
jobs call.

**Prompt 03 — the 8s auth bootstrap budget is gone, replaced by a per-job budget.** The plan asked
whether `AUTH_BOOTSTRAP_TIMEOUT_MS` still had a job once nothing network-bound gated the splash. It
does not: bootstrap now reads SecureStore and the SQLite account snapshot and nothing else, so there
is no request left to time out. The hazard it guarded moved rather than vanished — a serial queue is
only as available as its head job, so a hung request would stall everything behind it. Each job now
runs under `DEFAULT_SYNC_JOB_TIMEOUT_MS` (20s) with an `AbortController` the job passes into its
requests.

**Prompt 03 — `@react-native-community/netinfo` added; a native rebuild is required.** Connectivity
restore is one of the four required triggers and React Native has no built-in reachability signal.
Per [apps/mobile/AGENTS.md § Native dependencies](/apps/mobile/AGENTS.md), a rebuild is not a reason
to weaken a design, so the module was added rather than the trigger being stubbed. Contributors run
`npm run mobile:prebuild` and rebuild the dev client.

**Prompt 03 — the 401 that ends a dead session moved into the account-refresh job.** Bootstrap used
to call `/auth/me` and could therefore end the session itself when the credentials were definitively
dead. With that call gone, a signed-in-but-dead device would have stayed in `authenticated` forever.
The account-refresh job now owns it: a 401 that survives the token-refresh attempt calls
`clearSession('session_expired')`, which is what raises the forced-logout notice. Every other failure
is left to the queue, so an offline device stays signed in.

**Prompt 02 — local subscriptions merge into an account at sign-up only, not on every sign-in.**
Decision 31 and detail 701 specified an **additive** merge on sign-in ("a channel on either side ends
up subscribed"). Combined with decision 30's retain-on-sign-out, that resurrected unsubscribes: sign
in, subscribe, sign out, unsubscribe locally, sign in again, and the channel returns because the
server still has it. The operator resolved it by narrowing the merge instead of adding tombstones —
local subscriptions are pushed up **only** by the login that follows a sign-up on this device, and
after that the **account is the source of truth**. A later sign-in to an existing account therefore
replaces local rows with the account's rather than uploading them, so a phone cannot silently rewrite
an account also used on the web. There is no additive merge and no resurrection.

**Prompt 02 — sign-out retains all local data, not just subscriptions.** Decision 30 covered
subscriptions. The operator extended it to everything local, including add-by-RSS feeds and the
car/watch browse index, on the grounds that this is the same data offline mode depends on. Add-by-RSS
feeds therefore stay visible and playable signed out (`add_by_rss_view` is already anonymous tier);
only adding and refreshing remain membership-gated.

**Prompt 02 — the account sync was silently truncating to one page.** `syncFromAccount` hydrated only
page 1 of the subscribed list. That was invisible while the rows were a display cache, but they now
decide whether a channel shows as subscribed, so anything past the first page would have read as
unsubscribed. It now pages to the end under a fixed ceiling.

**Prompt 01 — the tier seam lives in `packages/helpers`, not `packages/helpers-requests`.** The plan
put it beside `parseMembershipGateError`. But its only input, `deriveMembershipState`, already lives
in `@podverse/helpers` and is already consumed by both surfaces, so `helpers-requests` would have
split membership derivation across two packages. Tier resolution is pure account derivation with no
HTTP in it. `helpers-requests` keeps the genuinely HTTP-shaped part: `accessDenialReasonFromGate`,
mapping a 403 onto the shared `AccessDenialReason`. Update the cross-surface table row above when
prompt 18 reconciles status.

**Prompt 01 — membership expiry is not a notification at all.** Detail 700 named four reminder
surfaces, the fourth being a push near expiry. That was over-engineering, and a scheduled
`membership-expiry-reminder` job plus a worker handler had already been built for it. Both are
removed, along with the ORM scheduler service that enqueued them. Expiry is now three **in-app**
surfaces only, all derived on demand from the account snapshot via `getMembershipExpiryNotice` in
`@podverse/helpers`. Enforced by the rule
[`no-membership-expiry-notifications`](/.cursor/rules/no-membership-expiry-notifications.mdc).
Scheduled jobs remain a supported mechanism generally — admin notification campaigns still use them.
