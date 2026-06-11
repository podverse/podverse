/** Fixed embed demo showcase slots on `/embed` (content ids come from `embed_demo_showcase` table). */

export const EMBED_DEMO_SHOWCASE_IDS = [
  'episode-audio',
  'episode-video',
  'track-audio',
  'track-video',
  'clip-audio',
  'official-clip-audio',
  'chapter-audio',
  'podcast-audio',
  'podcast-video',
  'album-audio',
  'album-video',
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
  | 'playlist';

export type EmbedDemoShowcaseSlotDef = {
  showcaseId: EmbedDemoShowcaseId;
  routeKind: EmbedDemoShowcaseRouteKind;
};

export const EMBED_DEMO_SHOWCASE_SLOT_DEFS: EmbedDemoShowcaseSlotDef[] = [
  { showcaseId: 'episode-audio', routeKind: 'episode' },
  { showcaseId: 'episode-video', routeKind: 'episode' },
  { showcaseId: 'track-audio', routeKind: 'track' },
  { showcaseId: 'track-video', routeKind: 'track' },
  { showcaseId: 'clip-audio', routeKind: 'clip' },
  { showcaseId: 'official-clip-audio', routeKind: 'official-clip' },
  { showcaseId: 'chapter-audio', routeKind: 'chapter' },
  { showcaseId: 'podcast-audio', routeKind: 'podcast' },
  { showcaseId: 'podcast-video', routeKind: 'podcast' },
  { showcaseId: 'album-audio', routeKind: 'album' },
  { showcaseId: 'album-video', routeKind: 'album' },
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

function shouldAppendEmbedDemoChapterMarkersQuery(
  routeKind: EmbedDemoShowcaseRouteKind,
  showcaseId: EmbedDemoShowcaseId
): boolean {
  if (isEmbedDemoVideoShowcase(showcaseId)) {
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

export function buildEmbedDemoHref(
  routeKind: EmbedDemoShowcaseRouteKind,
  resourceIdText: string,
  showcaseId: EmbedDemoShowcaseId
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
    default: {
      const exhaustive: never = routeKind;
      throw new Error(`Unsupported embed demo route kind: ${String(exhaustive)}`);
    }
  }

  if (shouldAppendEmbedDemoChapterMarkersQuery(routeKind, showcaseId)) {
    pathname = appendEmbedDemoChapterMarkersQuery(pathname);
  }

  if (isEmbedDemoVideoShowcase(showcaseId)) {
    pathname = appendEmbedDemoPresentationQuery(pathname, 'video');
  }

  return pathname;
}
