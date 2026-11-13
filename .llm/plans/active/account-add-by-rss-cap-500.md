# Add by RSS limit, default 100

Deferred. To run it, open a chat and say: "Implement
`.llm/plans/active/account-add-by-rss-cap-500.md`."

Add by RSS is outside the follow total in
[account-follow-cap-5000.md](account-follow-cap-5000.md). Each feed is parsed on our
servers. The default limit is 100. Management can raise one account.

The tier ladder below is a draft count of who is over 100. It is not the migration
rule. That decision is open in
[07](/docs/proposals/v4-to-v5-migration/07-account-and-data-migration-model.md#account-caps-v4-did-not-have).
Do not implement this ladder as that decision. `v4CopyAccountLibrary` does not write
an Add by RSS override today. Trial and Premium already share the default of 100;
a line below that still says Trial is 10 is leftover draft text.

The draft says migration
grandfathers an account already over 100 onto the smallest tier that covers its count.
Migration never writes Unlimited. The highest tier it may write is 10000. A library past
10000 is copied up to 10000 and the rest is counted as not copied.

## Tiers

| Tier | Who gets it |
| --- | --- |
| 100 | Default for Premium. Stored as empty. |
| 200 | |
| 300 | |
| 400 | |
| 500 | |
| 1000 | |
| 10000 | The highest tier migration may write. |
| Unlimited | Management only. Migration never writes this. |

Trial and Premium share one default, `MEMBERSHIP_MAX_ADD_BY_RSS_FEEDS` (100), read as
`maxAddByRSSFeeds`. There is no separate Trial number below this ladder, and no renew path at
the limit. A Trial account with an empty override gets the same 100 as Premium and the same
at-limit refusal.

Premium with an empty override stays at 100. The existing free-number override
`max_add_by_rss_feeds` on account membership status becomes this tier select. A value that
is not in the list is not a valid save.

On the counted v4 snapshot, 3,274 accounts have at least one Add by RSS address. Accounts
over 100:

| Current count | Accounts | Tier written at migration |
| --- | --- | --- |
| 101–200 | 4 | 200 |
| 201–300 | 2 | 300 |
| 301–400 | 0 | |
| 401–500 | 1 | 500 |
| 501–1000 | 3 | 1000 |
| 5,215 | 1 | 10000 |

No Add by RSS library is over 10000, so migration writes Unlimited for nobody.

## Where the check lives

Enforce the tier in `addOrUpdateRSSChannel`
([accountFollowingAddByRSSChannel.ts](/packages/orm/src/services/account/accountFollowingAddByRSSChannel.ts)),
in the same transaction as the insert, with the account row locked. OPML calls that
service directly from
[processOpmlImport.ts](/packages/mq/src/functions/mq/rss/processOpmlImport.ts), so a
controller-only check is not enough. Updating a feed the account already follows does not
count. Removing a feed still works at the cap. Unlimited is not refused.

## What the user sees

One refusal, at the account's limit (the shared 100, or a raised tier), on Trial and Premium
alike: the 403 `add_by_rss_feed_limit_reached` with `i18nKey`
`membership.add_by_rss_feed_limit_reached`, the account's `limit`, and no renew path.
Management raises the tier. A purchase does not.

That catalog key already says the limit was reached and to email support to raise it, with
`{limit}` and `{contactEmail}`, in the consumer originals for en-US, es, fr, and el-GR. The
number is the account's tier. This plan adds no second refusal and no second key.

Show it on the add action on web and mobile, and in the OPML result when that import is
what hit the tier.

## v4 library copy

The library write is not built. When it copies `addByRSSPodcastFeedUrls`, it writes the
grandfather tier first, then copies addresses up to that tier. A library of 100 or fewer
keeps an empty override and the Premium default of 100. The copy does not clip a
grandfathered library down to the Trial number of 10. New adds after the copy use the
Trial gate first, then the tier.

## Tests

- Premium with an empty override is refused at 100 with the new sentence and no renew path.
- Trial at 10 still gets the existing renew sentence.
- A stored tier of 200 allows the 101st feed and refuses the 201st.
- Updating a feed already followed succeeds at the cap.
- The account at 5,215 resolves to 10000. A library past 10000 copies 10000 and does not
  become Unlimited.
- OPML stops at the tier and the status carries the same sentence.
- The migration tier for 150 is 200, for 600 is 1000, and for 5,215 is 10000.

## Checklist

- [ ] Tier list in `@podverse/helpers`
- [ ] Management select replaces the free-number Add by RSS override, including Unlimited
- [ ] Count-and-insert in `addOrUpdateRSSChannel`, covering OPML
- [ ] New 403, OpenAPI, and the catalog sentence in four locales
- [ ] Web, mobile, and OPML show that sentence when the tier is the reason
- [ ] Trial renew sentence unchanged
- [ ] Tests listed above
- [ ] v4 library copy writes the grandfather tier, 10000 for the library of 5,215, and never Unlimited
