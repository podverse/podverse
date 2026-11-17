# Description storage efficiency — deferred

Parked on 2026-11-15. Do not implement until someone reopens it. The runnable abcplan request was
removed on purpose.

## Why it waits

The goal was less database storage for descriptions, with the overflow fetched on demand. Measured
on the local sample database: 1.99 million episode descriptions, 6.4 GB total, description text
2.03 GB on disk. All 6,356 feeds use the default Standard tier. That tier's visible cap is 10,000
characters (`DESCRIPTION_LENGTH_TIERS` in `packages/helpers/src/lib/descriptionLimits.ts`). Extended
(25,000) and Maximum (50,000) exist and no feed uses them.

Savings against today's stored HTML. The range is markdown size: plain text at the high end, link
URLs kept at the low end. The full-catalog column scales to about 14.5 million episodes and a
database of about 48 GB.

| Cap | Episodes over the cap | Saved on this database | Full catalog |
| --- | --- | --- | --- |
| 10,000 (current) | 0.14% (2,786) | about 0 (−0.2 to +0.1 GB) | about 0 |
| 2,000 | 11% (219,000) | 0.07–0.32 GB | 0.5–2.3 GB |
| 1,000 | 34% (685,000) | 0.53–0.73 GB | 3.9–5.3 GB |
| 500 | 63% (1,258,000) | 1.08–1.20 GB | 7.8–8.7 GB |

The median episode description is 694 characters. The median channel description is 332, and none
of 6,133 channels exceed 10,000 (longest 9,762). The preview column is about 699 MB here and was
left out of the design. The operator's decision: the savings are too small, so do not build this.

## Decisions, if it is reopened

These were settled before the work was parked. The character cap was not.

- Store descriptions as markdown so a partial value still renders.
- Add a Slim tier and make it the default for channels and items. Standard, Extended, and Maximum
  stay as per-feed overrides. The Slim number was never chosen. 2,000 was the first proposal.
  500, 1,000, and 2,000 were then compared with the current 10,000, and none was accepted.
- Show More and Show Less wherever a description is shown on web and mobile. Hide both controls
  when the stored description already fits the cap.
- First render uses a full description already on the device or in the detail response, so the
  text does not jump. Otherwise show the stored text and Show More.
- Show More checks the device first, for a signed-in and a signed-out person.
- Signed in, and not on the device: read object storage, then a server parse of that one item,
  then save the result to object storage and return it.
- Signed out, and not on the device: read object storage. On mobile, if it is missing, parse the
  feed on the device and save only that description in a local area that expires. Do not save the
  whole feed locally except for a signed-in person's subscriptions.
- Signed-out web cannot parse the feed (CORS). Show More opens the item's web page in a new tab.
  With no web page URL, a modal says the full description is unavailable.
- Add by RSS descriptions never go to Valkey or object storage. Signed-in users use the server
  parse. Anyone can use an on-device parse.
- Web caches full descriptions in IndexedDB, same expiry as the server, checked first. The
  existing database is `add-by-rss` in `apps/web/src/utils/addByRSS/storage.ts`.
- Mobile expiry of those on-demand descriptions uses the same default as the server.
- Object storage is optional. Everything still works when it is off.
- Objects are gzipped. Clients accept gzip.
- Expire objects after a configurable period, default 30 days. Use the provider's lifecycle
  expiry when it has one, and also run a sweep a configurable number of times per day, default 2.
- A hash detects a changed description and replaces the stored object.
- A flag on the detail response says an unexpired full description is in object storage, so the
  first render can request it.
- Previews stay as they are. They are not part of object storage, and no new preview UI was
  requested.
- Fill object storage only when a signed-in person uses Show More. A normal feed parse does not
  upload.
- A one-off worker job would convert existing rows to markdown and re-truncate them.

## Still open

- Whether Valkey should sit between the API and object storage.
- The object key layout. Group keys in a hierarchy. Numeric prefix sharding was suggested and not
  chosen.
- The channel field name. Check **domain-terms** before calling it description, About, or Summary.
- Whether a subscribed feed on mobile already keeps the full description locally.

## Where to start

- `packages/helpers/src/lib/descriptionLimits.ts` — tiers. Standard visible max is 10,000.
- `packages/helpers/src/lib/descriptionIngest.ts` — `prepareDescriptionForStorage` stores HTML.
- `packages/orm/src/entities/item/itemDescription.ts` and
  `packages/orm/src/entities/channel/channelDescription.ts` — `is_truncated`, `source_length`.
- `packages/parser/src/lib/rss/descriptionIngestContext.ts` — tier at ingest.
- `apps/management-api/src/lib/startup/validation.ts` — `BUCKET_*` exists for image shrinking only.
  The API and workers have no object storage client.
- `docs/proposals/v4-to-v5-migration/17-storage-v4-vs-v5.md` — measured sizes. Larger savings than
  this cap are listed there (indexes, compressing the mid-size band) and are separate work.
