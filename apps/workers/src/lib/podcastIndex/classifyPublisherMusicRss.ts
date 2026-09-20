import { MediumEnum } from '@podverse/helpers';
import { detectDuckTypedPublisherMediumId } from '@podverse/parser-mapping';

const PODCAST_NS = 'https://podcastindex.org/namespace/1.0';

export type PublisherParentRef = {
  feedUrl: string | null;
  feedGuid: string | null;
};

/**
 * Reads channel medium and remoteItem medium attributes from RSS XML without a full
 * partytime parse, then applies the same duck-typing as production publisher mapping.
 */
export function isPublisherMusicRssXml(xml: string): boolean {
  const medium = extractChannelMedium(xml);
  if (medium === null || medium.toLowerCase() !== 'publisher') {
    return false;
  }

  const remoteMediums = extractRemoteItemMediums(xml);
  const musicRemoteCount = remoteMediums.filter((m) => m.toLowerCase().includes('music')).length;
  if (musicRemoteCount === 0) {
    return false;
  }

  const detected = detectDuckTypedPublisherMediumId({
    medium: 'publisher',
    podcastRemoteItems: remoteMediums.map((m) => ({ medium: m })),
  });

  return detected === MediumEnum.PublisherMusic;
}

/**
 * Pulls publisher parent refs from an album (music) feed: podcast:publisher remoteItems
 * and channel remoteItems with medium=publisher.
 */
export function extractPublisherParentsFromAlbumXml(xml: string): PublisherParentRef[] {
  const parents: PublisherParentRef[] = [];
  const tagRe = /<(?:podcast:)?remoteItem\b([^>]*)\/?>/gi;
  let match: RegExpExecArray | null = tagRe.exec(xml);
  while (match !== null) {
    const attrs = match[1] ?? '';
    const medium = attrValue(attrs, 'medium');
    const feedUrl = attrValue(attrs, 'feedUrl');
    const feedGuid = attrValue(attrs, 'feedGuid');
    const mediumLower = (medium ?? '').toLowerCase();
    if (feedUrl === null && feedGuid === null) {
      match = tagRe.exec(xml);
      continue;
    }
    const start = Math.max(0, match.index - 200);
    const context = xml.slice(start, match.index).toLowerCase();
    const inPublisherBlock =
      context.includes('<podcast:publisher') || context.includes('<publisher');
    if (mediumLower === 'publisher' || inPublisherBlock) {
      parents.push({ feedUrl, feedGuid });
    }
    match = tagRe.exec(xml);
  }
  return parents;
}

function extractChannelMedium(xml: string): string | null {
  const withPrefix = xml.match(
    /<(?:podcast:)?medium(?:\s[^>]*)?>([^<]*)<\/(?:podcast:)?medium>/i
  );
  if (withPrefix?.[1] !== undefined) {
    return withPrefix[1].trim();
  }

  const nsPrefixed = /<[^>\s:]+:medium(?:\s[^>]*)?>([^<]*)<\/[^>\s:]+:medium>/i;
  const nsMatch = xml.match(nsPrefixed);
  if (nsMatch?.[1] !== undefined) {
    return nsMatch[1].trim();
  }

  if (xml.includes(PODCAST_NS)) {
    const bare = xml.match(/<medium(?:\s[^>]*)?>([^<]*)<\/medium>/i);
    if (bare?.[1] !== undefined) {
      return bare[1].trim();
    }
  }

  return null;
}

function extractRemoteItemMediums(xml: string): string[] {
  const mediums: string[] = [];
  const tagRe = /<(?:podcast:)?remoteItem\b([^>]*)\/?>/gi;
  let match: RegExpExecArray | null = tagRe.exec(xml);
  while (match !== null) {
    const attrs = match[1] ?? '';
    const mediumAttr = attrs.match(/\bmedium\s*=\s*["']([^"']*)["']/i);
    if (mediumAttr?.[1] !== undefined && mediumAttr[1].trim() !== '') {
      mediums.push(mediumAttr[1].trim());
    }
    match = tagRe.exec(xml);
  }
  return mediums;
}

function attrValue(attrs: string, name: string): string | null {
  const re = new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, 'i');
  const m = attrs.match(re);
  if (m?.[1] === undefined || m[1].trim() === '') {
    return null;
  }
  return m[1].trim();
}
