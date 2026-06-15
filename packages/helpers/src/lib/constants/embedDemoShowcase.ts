/** Fixed embed demo showcase slots on `/embed` (content ids come from `embed_demo_showcase` table). */

export const EMBED_DEMO_SHOWCASE_IDS = [
  'episode-audio',
  'episode-video',
  'track-audio',
  'track-video',
  'chapter-audio',
  'chapter-video',
  'clip-audio',
  'clip-video',
  'official-clip-audio',
  'podcast-audio',
  'podcast-video',
  'album-audio',
  'album-video',
  'episode-chapters-audio',
  'episode-chapters-video',
  'podcast-clips-audio',
  'podcast-clips-video',
  'playlist-mixed',
] as const;

export type EmbedDemoShowcaseId = (typeof EMBED_DEMO_SHOWCASE_IDS)[number];

export type EmbedDemoShowcaseRouteKind =
  | 'episode'
  | 'track'
  | 'clip'
  | 'chapter'
  | 'official-clip'
  | 'podcast'
  | 'album'
  | 'playlist'
  | 'episode-chapters';

export type EmbedDemoShowcaseSlotDef = {
  showcaseId: EmbedDemoShowcaseId;
  routeKind: EmbedDemoShowcaseRouteKind;
};

export const EMBED_DEMO_SHOWCASE_SLOT_DEFS: EmbedDemoShowcaseSlotDef[] = [
  { showcaseId: 'episode-audio', routeKind: 'episode' },
  { showcaseId: 'episode-video', routeKind: 'episode' },
  { showcaseId: 'track-audio', routeKind: 'track' },
  { showcaseId: 'track-video', routeKind: 'track' },
  { showcaseId: 'chapter-audio', routeKind: 'chapter' },
  { showcaseId: 'chapter-video', routeKind: 'chapter' },
  { showcaseId: 'clip-audio', routeKind: 'clip' },
  { showcaseId: 'clip-video', routeKind: 'clip' },
  { showcaseId: 'official-clip-audio', routeKind: 'official-clip' },
  { showcaseId: 'podcast-audio', routeKind: 'podcast' },
  { showcaseId: 'podcast-video', routeKind: 'podcast' },
  { showcaseId: 'album-audio', routeKind: 'album' },
  { showcaseId: 'album-video', routeKind: 'album' },
  { showcaseId: 'episode-chapters-audio', routeKind: 'episode-chapters' },
  { showcaseId: 'episode-chapters-video', routeKind: 'episode-chapters' },
  { showcaseId: 'podcast-clips-audio', routeKind: 'podcast' },
  { showcaseId: 'podcast-clips-video', routeKind: 'podcast' },
  { showcaseId: 'playlist-mixed', routeKind: 'playlist' },
];

const EMBED_DEMO_SHOWCASE_SLOT_BY_ID = new Map(
  EMBED_DEMO_SHOWCASE_SLOT_DEFS.map((slot) => [slot.showcaseId, slot])
);

export function isEmbedDemoShowcaseId(value: string): value is EmbedDemoShowcaseId {
  return EMBED_DEMO_SHOWCASE_SLOT_BY_ID.has(value as EmbedDemoShowcaseId);
}

export function getEmbedDemoShowcaseSlotDef(
  showcaseId: EmbedDemoShowcaseId
): EmbedDemoShowcaseSlotDef {
  const slot = EMBED_DEMO_SHOWCASE_SLOT_BY_ID.get(showcaseId);
  if (slot === undefined) {
    throw new Error(`Unknown embed demo showcase id: ${showcaseId}`);
  }
  return slot;
}

export function isEmbedDemoVideoShowcase(showcaseId: EmbedDemoShowcaseId): boolean {
  return showcaseId.endsWith('-video');
}

/** List route kinds load multiple rows and support a `play_id_text` default item. */
export function isEmbedDemoListRouteKind(routeKind: EmbedDemoShowcaseRouteKind): boolean {
  return (
    routeKind === 'podcast' ||
    routeKind === 'album' ||
    routeKind === 'playlist' ||
    routeKind === 'episode-chapters'
  );
}

function shouldAppendEmbedDemoChapterMarkersQuery(
  routeKind: EmbedDemoShowcaseRouteKind,
  showcaseId: EmbedDemoShowcaseId
): boolean {
  if (isEmbedDemoVideoShowcase(showcaseId)) {
    return false;
  }

  if (isEmbedDemoPodcastClipsShowcase(showcaseId)) {
    return false;
  }

  return (
    routeKind === 'episode' ||
    routeKind === 'clip' ||
    routeKind === 'chapter' ||
    routeKind === 'official-clip' ||
    routeKind === 'podcast'
  );
}

function appendEmbedDemoChapterMarkersQuery(pathname: string): string {
  const separator = pathname.includes('?') ? '&' : '?';
  return `${pathname}${separator}chapter_markers=1`;
}

function appendEmbedDemoPresentationQuery(
  pathname: string,
  presentation: 'audio' | 'video'
): string {
  const separator = pathname.includes('?') ? '&' : '?';
  return `${pathname}${separator}presentation=${presentation}`;
}

function appendEmbedDemoPlayIdTextQuery(pathname: string, playIdText: string): string {
  const separator = pathname.includes('?') ? '&' : '?';
  return `${pathname}${separator}play_id_text=${encodeURIComponent(playIdText)}`;
}

/** Podcast channel slots that render the channel's public clips list (`?type=clips`). */
function isEmbedDemoPodcastClipsShowcase(showcaseId: EmbedDemoShowcaseId): boolean {
  return showcaseId === 'podcast-clips-audio' || showcaseId === 'podcast-clips-video';
}

function appendEmbedDemoClipsListQuery(pathname: string): string {
  const separator = pathname.includes('?') ? '&' : '?';
  return `${pathname}${separator}type=clips`;
}

export function buildEmbedDemoHref(
  routeKind: EmbedDemoShowcaseRouteKind,
  resourceIdText: string,
  showcaseId: EmbedDemoShowcaseId,
  playResourceIdText?: string | null
): string {
  let pathname: string;

  switch (routeKind) {
    case 'episode':
      pathname = `/embed/episode/${resourceIdText}`;
      break;
    case 'track':
      pathname = `/embed/track/${resourceIdText}`;
      break;
    case 'clip':
      pathname = `/embed/clip/${resourceIdText}`;
      break;
    case 'chapter':
      pathname = `/embed/chapter/${resourceIdText}`;
      break;
    case 'official-clip':
      pathname = `/embed/official-clip/${resourceIdText}`;
      break;
    case 'podcast':
      pathname = `/embed/podcast/${resourceIdText}`;
      break;
    case 'album':
      pathname = `/embed/album/${resourceIdText}`;
      break;
    case 'playlist':
      pathname = `/embed/playlist/${resourceIdText}`;
      break;
    case 'episode-chapters':
      pathname = `/embed/episode-chapters/${resourceIdText}`;
      break;
    default: {
      const exhaustive: never = routeKind;
      throw new Error(`Unsupported embed demo route kind: ${String(exhaustive)}`);
    }
  }

  if (isEmbedDemoPodcastClipsShowcase(showcaseId)) {
    pathname = appendEmbedDemoClipsListQuery(pathname);
  }

  if (shouldAppendEmbedDemoChapterMarkersQuery(routeKind, showcaseId)) {
    pathname = appendEmbedDemoChapterMarkersQuery(pathname);
  }

  if (isEmbedDemoVideoShowcase(showcaseId)) {
    pathname = appendEmbedDemoPresentationQuery(pathname, 'video');
  }

  const trimmedPlayIdText = playResourceIdText?.trim() ?? '';
  if (trimmedPlayIdText !== '' && isEmbedDemoListRouteKind(routeKind)) {
    pathname = appendEmbedDemoPlayIdTextQuery(pathname, trimmedPlayIdText);
  }

  return pathname;
}
