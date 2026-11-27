# Request — Person research

## Status

Parked. Full planning is deferred. Do not implement from this file, and do not write numbered
plans or COPY-PASTA until the operator asks to plan this feature.

## Issue

https://github.com/podverse/podverse/issues/412

Issue 411 is the people directory (Cast, Appearances, the Browse People chip, person pages, and
follows). This request is the later research mode. It ships on its own issue.

## Request

People in the directory come from `channel_person` and `item_person`. Those tags do not give a
stable id that separates two people who share a name. The directory therefore uses one row per
standardized name.

The operator also wants a second mode, planned later:

- A research job, with limited access, looks for appearances the tags do not name. The aim is to
  help someone find many appearances by a person, including ones with no person tag, when the job
  is confident the person is actually there.
- The job must not add feeds on its own. New feeds cost storage. A proposed feed goes to
  management (management API and management web) and an administrator approves it before it is
  added. The job records how confident it is that the feed is a real appearance.
- The job can also separate people who have the same name, so each person has their own public id
  and a label that tells them apart.
- A short summary can be stored and shown with the person. It is basic context for who the name
  refers to, in the same minimal style as a descriptor, not a biography.

## Settled with the directory

These are already the schema and product rules. A later plan keeps them.

- The name key is NFKC, trimmed, lowercase, with runs of characters that are not letters or
  numbers folded to one hyphen, hyphens at the ends removed, and the result cut at 255 characters.
  An empty key creates no person. `Dave Jones` and `dave jones` are one person. `Dave Jones` and
  `David Jones` are two people.
- The first raw name is the display name. Later credits for that same name do not replace it.
- The public page is `/person/:id_text`. The name is not the URL.
- The unique key is `(name_key, distinction_key)`. Every row created from a tag has
  `distinction_key` `''`. A split inserts another row with the same name key, a non-empty
  distinction key, and a new `id_text`. The original row keeps its `id_text`.
- `summary` is nullable and stays empty until something writes it. The web person page shows that
  sentence when it has text.
- Role, group, image, and website stay on the credit. The person row's list image is the portrait
  used on the people list and the person page.
- Channel People lists Cast (`channel_person`) and Appearances (distinct item credits on that
  channel, including people who are also in Cast). Item pages list item credits only.
- Following a person does not send a notification.
- People recommendations are derived from show recommendations and credits. They are not this
  research job.
- Add by RSS stays on the device and is not part of the directory.
- Image fallbacks for person pictures stay on issue 411. This request does not cover them.

The directory migration is `0023_person.sql`. This work starts after that change is on `develop`.
There is no research table, no confidence column, and no management approval screen for proposed
feeds.

## Still open

A later planning pass asks these before it writes implementation plans. Do not invent the answers
here.

1. What confidence is high enough for a match on content already stored to show on the person page
   and in channel Appearances, and does that match still wait for an administrator?
2. A feed that is not stored yet always waits for approval. Which outside sources may the job
   call, and what does limited access allow it to read and write?
3. Can the job join different spellings (`Dave Jones` and `David Jones`), or only split one
   standardized name into more than one person?
4. After a summary is written, who can edit or clear it?
5. An approved feed still has to enter through the existing catalog add path. Planning has to name
   that path. It does not add a side door that inserts a feed the allowlist would refuse.
