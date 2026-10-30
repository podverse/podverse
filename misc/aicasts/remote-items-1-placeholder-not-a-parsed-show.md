# Remote Items 1: A Placeholder, Not a Parsed Show

- **Version:** 2026-10-29T21:06-05:00
- **Episode ID:** remote-items-placeholder-not-a-parsed-show
- **Changed:** First version.
- **Description:** Why a remote item reference becomes a small placeholder row instead of a
  fully parsed show, where those rows appear, and where a tap goes on the website and in
  Add by RSS.
- **Status:** Built
- **Group:** Remote Items, part 1
- **Sources:** `packages/orm/src/entities/remoteStub/remoteChannelStub.ts`,
  `packages/orm/src/entities/remoteStub/remoteItemStub.ts`,
  `packages/parser/src/lib/rss/remoteItemStubs.ts`,
  `packages/helpers/src/dtos/remoteItem.ts`,
  `packages/helpers/src/lib/appRoutes.ts` (`buildIndexProviderFeedPath`),
  `apps/workers/src/lib/remoteStubs/remoteStubActions.ts`,
  `apps/web/src/components/Content/Podroll/ContentPodrollItemUnaddedRow.tsx`,
  `apps/web/src/hooks/useAddByRSSRemoteItemList.ts`
- **Length:** about 5 minutes (716 words)

## Directions for the voice service (do not read aloud)

- Two voices. **Claire** is a woman: warm, clear, measured. **Tom** is a man: relaxed, curious.
  Each line starts with the speaker's name and a colon. That name picks the voice. Never read it.
- About 150 words per minute. Natural turn-taking, no overlap.
- Read only the lines under **Script**, exactly as written. Do not read headings or these
  directions.
- A line that says `(pause)` is about one and a half seconds of silence. Never say "pause".
- No music, sound effects, intro, or outro.
- Pronunciation: **Podverse** "POD-verse". Spell out **RSS** and **URL** letter by letter.
  **Podcast Index** is the directory name.
- If your service writes its own script from this one, keep every number and every claim
  exactly, keep both voices, and add nothing the text does not say.

## Script

CLAIRE: This is part one of Remote Items. It covers the placeholder Podverse keeps when a show mentions another feed that we have not fully parsed. It's built.

TOM: What is a remote item, in plain terms?

CLAIRE: A feed can point at another feed, or at one episode of another feed. Podroll does that. A publisher's album list does that. If we already have that other show fully parsed, we show the normal row. If we don't, we still want the mention on screen, without saving the whole show.

(pause)

TOM: Why not just parse every feed those mentions point at?

CLAIRE: Because most of them are shows nobody asked us to keep. Parsing each one would store the feed, the episodes, and the images, and then keep them updated. The placeholder is the smaller record. It exists only when the index provider knows the feed. Today that provider is Podcast Index, and the database allows only that one.

TOM: So if Podcast Index has never heard of the feed, there is no placeholder.

CLAIRE: Right. Nothing is saved for that miss, so the next time we parse the show that mentioned it, we ask again. A failed lookup is different. It does not invent a placeholder either. If we already had one, and the lookup fails, we keep the old one.

(pause)

TOM: What does the placeholder actually hold?

CLAIRE: Two tables, both outside the normal feed and channel tables. Browse, search, and the scheduled parser never query them. The channel placeholder has the provider, the provider's feed id, the feed URL, and whatever title, author, and image the provider returned. The image stays that URL. These rows do not go through image shrinking. An episode placeholder always belongs to a channel placeholder. It can hold a title, an image, a publish date, and a duration. A reference with no channel placeholder and no parsed show is left out of the list.

TOM: How often do we ask the provider again?

CLAIRE: A placeholder resolved less than seven days ago is reused with no new call. One parse may make at most one hundred single lookups, for a URL fallback or an episode lookup. After that cap, a reference that still has no placeholder waits for a later run. A later recheck looks again with no reuse window, and at most twenty-five single lookups. If the show has since been fully parsed, the placeholder is removed. If the provider no longer knows the feed, or has retired it, the placeholder is removed. A separate step can point the same placeholder at a new provider id, when that id still names a feed we have not parsed.

(pause)

TOM: What does a person see, and where does a tap go?

CLAIRE: On a podroll, or on a publisher's album list, a parsed show is a normal row. A placeholder is a row with the title, the author, and the image we have. Tapping it opens the Podcast Index page for that show. Tapping an episode placeholder opens that same show page, not an episode page. A publisher feed's episode references are not shown at all. Nothing can verify them.

TOM: And Add by RSS? Those feeds are not in our directory.

CLAIRE: Tapping a reference there looks it up. If Podverse already has the show, you land on that show. If the provider knows the feed, you land on the provider's page for it, and that lookup can create the placeholder. If the provider does not know it, and the reference has a feed URL, you land on the Add by RSS page for that URL. If there is no usable URL, the list says, This feed could not be found.

(pause)

TOM: The points to remember. A placeholder is not a parsed show, and it lives outside the tables Browse uses. We only create one when Podcast Index knows the feed, and a miss is not remembered. A fresh one is reused for seven days, and one parse stops after one hundred single lookups. A tap opens the show's provider page, even when the row was an episode. Add by RSS uses that same page when the provider knows the feed, and the Add by RSS URL page when it does not.

CLAIRE: And once someone actually adds the show, the placeholder's job is over. The parsed show is what the lists use after that.
