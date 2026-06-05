# Phase 2a — Public RSS content metadata rules

## Goal

Add `generateMetadata` to all **RSS public content** routes so title, description,
canonical, OG, and Twitter tags derive from feed/channel/item DTO fields.

**Rule:** meta description = sanitized RSS description field, not curated marketing copy.

## Description source priority

| Entity | Primary field | Fallback |
| --- | --- | --- |
| Channel (podcast, artist, album) | `channel_description?.value` | `channel.title` only (no description meta if empty) |
| Item (episode, track, livestream) | `item_description?.value` | `item.title` |
| Podcast Index feed | PI feed description from `reqPodcastIndexFeedById` | feed title |
| Clip | clip description/notes if present on DTO | parent `item_description` |
| Chapter | chapter title + truncated item description | item title |

Always pipe HTML fields through `toSeoPlainText()` then `truncateMetaDescription()`.

## Title patterns

| Route | Title pattern |
| --- | --- |
| Channel pages | `{channel.title}` |
| Item pages | `{item.title}` or `{item.title} · {channel.title}` when channel fetched |
| PI feed page | `{feed.title}` |
| Clip | `{clip title or item title}` |
| Chapter | `{chapter.title} · {item.title}` |

Use layout title template (`%s | Brand`) — pass short `title` string only.

## OG image

Use existing helpers from `@podverse/helpers` image module:

- Channels: `findDTOChannelImageForHero` or equivalent hero candidate merge.
- Items: `mergeDTOItemThenChannelImageHeroCandidates` — first absolute URL wins.

Pass result to `buildContentMetadata({ imageUrl })`.

## Canonical paths

Prefer **`id_text`** slugs in canonical URLs when that is the public URL segment:

- `/podcast/{channel.id_text}`
- `/episode/{item.id_text}`
- `/track/{item.id_text}`
- etc.

Canonical should **omit** query params (`?page=`, `?type=`, `?sort=`).

## Files to update

Add `export async function generateMetadata` to each server `page.tsx`:

| File | Fetch for metadata |
| --- | --- |
| `apps/web/src/app/podcast/[channel_id]/page.tsx` | channel (reuse page fetch via `cache`) |
| `apps/web/src/app/episode/[item_id]/page.tsx` | item + channel |
| `apps/web/src/app/artist/[channel_id]/page.tsx` | channel |
| `apps/web/src/app/album/[channel_id]/page.tsx` | channel |
| `apps/web/src/app/track/[item_id]/page.tsx` | item + channel |
| `apps/web/src/app/podcast/livestream/[item_id]/page.tsx` | item + channel |
| `apps/web/src/app/music/livestream/[item_id]/page.tsx` | item + channel |
| `apps/web/src/app/podcast-index/feed/[podcast_index_id]/page.tsx` | PI feed |
| `apps/web/src/app/clip/[clip_id]/page.tsx` | clip + item + channel |
| `apps/web/src/app/chapter/[item_chapter_id_text]/page.tsx` | chapter + item + channel |
| `apps/web/src/app/official-clip/[item_soundbite_id]/page.tsx` | soundbite + item |

### Implementation pattern (example: episode)

```typescript
import type { Metadata } from 'next';

import { buildContentMetadata } from '../../../lib/seo/buildContentMetadata';
import { toSeoPlainText } from '../../../lib/seo/toSeoPlainText';
import { getItemForEpisodePage, getChannelForPage } from '../../../lib/seo/fetchers';

type Props = { params: Promise<{ item_id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { item_id } = await params;
  const item = await getItemForEpisodePage(item_id);
  const channel = await getChannelForPage(item.channel_id);

  const descriptionPlain = toSeoPlainText(item.item_description?.value);

  return buildContentMetadata({
    title: item.title,
    descriptionPlain,
    pathname: `/episode/${item.id_text}`,
    type: 'article',
    // imageUrl from mergeDTOItemThenChannelImageHeroCandidates
  });
}
```

Refactor page component to use the same cached fetchers to avoid double API calls.

## Podcast visibility redirect

For `podcast/[channel_id]`: if `feed_policy.public_visible === false`, page redirects
to podcast-index URL. Metadata should still reflect **visible** channel data before
redirect, or return metadata matching the redirect target — pick one strategy and
document in code comment. Prefer metadata for the **served** URL (post-redirect target).

## Exit criteria

- All listed routes emit unique `<title>` and meta description in SSR HTML.
- Descriptions match feed-derived plain text (not i18n marketing strings).
- Canonical URLs exclude query strings.
- OG/Twitter tags present when image URL available.

## Verification

```bash
./scripts/nix/with-env npm run lint
./scripts/nix/with-env npm run build -w apps/web
```

Manual curl (after dev server up):

```bash
curl -s http://localhost:4032/episode/<seed-id-text> | rg -i 'meta name="description"|og:title|canonical'
```

Phase 6 adds automated E2E for these routes.
