# Follow limit, default 500

Deferred. To run it, open a chat and say: "Implement
`.llm/plans/active/account-follow-cap-5000.md`."

One account may follow a limited number of directory channels, playlists, and accounts,
counted together. Add by RSS is not in this total. Its ladder is
[account-add-by-rss-cap-500.md](account-add-by-rss-cap-500.md).

The default is 500. Management can raise one account to a higher tier.

The tier ladder below is a draft count of who is over 500. It is not the migration
rule. That decision is open in
[07](/docs/proposals/v4-to-v5-migration/07-account-and-data-migration-model.md#account-caps-v4-did-not-have).
Do not implement this ladder as that decision. The follow cap is not shipped, and
`v4CopyAccountLibrary` does not write a follow override today.

The draft says migration
grandfathers an account that is already over 500 onto the smallest tier that covers its
count. Migration never chooses Unlimited. The highest tier it may write is 10000. A count past
10000 is copied up to 10000 and the rest is counted as not copied.

## Tiers

| Tier | Who gets it |
| --- | --- |
| 500 | Default. Stored as empty, so a later default change still applies. |
| 1000 | |
| 2000 | |
| 3000 | |
| 4000 | |
| 5000 | |
| 10000 | The highest tier migration may write. |
| Unlimited | Management only. Migration never writes this. |

On the counted v4 snapshot, podcast subscriptions decide the tier. Playlist follows max
out at 1 and account follows at 2, so they do not push anyone into a higher tier.
Accounts with 100 to 500 podcast subscriptions: 262. Accounts over 500:

| Current count | Accounts | Tier written at migration |
| --- | --- | --- |
| 501–1000 | 7 | 1000 |
| 1001–2000 | 3 | 2000 |
| 2001–4000 | 0 | |
| 4001–5000 | 1 (4,314) | 5000 |
| 5001–10000 | 0 | 10000 |
| Over 10000 | 0 | Stop at 10000. Do not write Unlimited. |

## Where it is stored and edited

Add a nullable follow-limit tier on account membership status, beside the existing
`max_add_by_rss_feeds` override. Empty means 500.

Management already edits per-account entitlement overrides on the user edit page
([EditUserPageClient.tsx](/apps/management-web/src/app/(management)/users/[id]/edit/EditUserPageClient.tsx)).
Replace a free number with a select of these tiers, including Unlimited. The same select
goes on the new-user page. Saving a tier is an operator action. There is no separate
request queue.

## Where the check lives

Count the three follow tables in the same transaction as the insert, with the account
row locked:

- `followChannel` and `followChannelsBulk` in
  [accountFollowingChannel.ts](/packages/orm/src/services/account/accountFollowingChannel.ts)
- `followPlaylist` in
  [accountFollowingPlaylist.ts](/packages/orm/src/services/account/accountFollowingPlaylist.ts)
- `followAccount` in
  [accountFollowingAccount.ts](/packages/orm/src/services/account/accountFollowingAccount.ts)

A follow that already exists does not count. Unsubscribe still works at the cap. An
account on Unlimited is not refused.

Share the tier list from `@podverse/helpers`. Do not add a SQL check or a trigger. The
total spans three tables.

## What the user sees

A new follow at the account's tier returns HTTP 403 with a stable `code` and `i18nKey`.
No renew path. Raising the tier is a management action, not a purchase.

Catalog sentence, in the consumer originals for en-US, es, fr, and el-GR. The number is
the account's tier:

"You can follow up to {limit} podcasts, playlists, and accounts."

Web and mobile show that sentence on the follow action for a channel, a playlist, and an
account. A bulk follow or an OPML import follows until the tier and reports the rest with
the same sentence. The per-request caps stay: 1,000 per bulk follow or unfollow, 1,000
per OPML file, and 50 new OPML feeds per hour.

## v4 library copy

The library write is not built. When it copies channel, playlist, and account follows, it
writes the grandfather tier first, then copies follows up to that tier. A count that fits
the default copies with an empty tier. Do not fail the account.

## Tests

- A new follow is refused at the account's tier, and the 403 carries the code, the catalog
  key, and that tier's number.
- Web and mobile render the sentence.
- An empty tier means 500. A stored tier is the cap. Unlimited is not refused.
- Following something already followed succeeds at the cap. Unfollow succeeds.
- A bulk follow with room for some of the list follows those and reports the rest.
- The migration tier for 563 is 1000, for 1,910 is 2000, and for 4,314 is 5000.

## Checklist

- [ ] Tier list in `@podverse/helpers`, and the membership-status column
- [ ] Management select on the user edit and new-user pages, including Unlimited
- [ ] Count-and-insert in the three follow services
- [ ] 403, OpenAPI, and the catalog sentence in four locales
- [ ] Web and mobile show the sentence
- [ ] Bulk follow and OPML stop at the tier and show the sentence
- [ ] Tests listed above
- [ ] v4 library copy writes the grandfather tier and does not write Unlimited
