import { XMLParser } from 'fast-xml-parser';

import { canonicalHttpOrHttpsUrl } from '@podverse/helpers-validation';

export type ParsedOpmlFeed = {
  title?: string;
  feedUrl: string;
};

type OutlineNode = {
  '@_xmlUrl'?: string;
  '@_xmlurl'?: string;
  '@_title'?: string;
  '@_text'?: string;
  outline?: OutlineNode | OutlineNode[];
};

type OpmlDocument = {
  opml?: {
    body?: {
      outline?: OutlineNode | OutlineNode[];
    };
  };
};

const asOutlineArray = (value: OutlineNode | OutlineNode[] | undefined): OutlineNode[] => {
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
};

const collectOutlines = (node: OutlineNode, out: ParsedOpmlFeed[]): void => {
  const xmlUrlRaw = node['@_xmlUrl'] ?? node['@_xmlurl'];
  if (typeof xmlUrlRaw === 'string' && xmlUrlRaw.trim() !== '') {
    const feedUrl = canonicalHttpOrHttpsUrl(xmlUrlRaw.trim());
    if (feedUrl !== null) {
      const titleRaw = node['@_title'] ?? node['@_text'];
      const title =
        typeof titleRaw === 'string' && titleRaw.trim() !== '' ? titleRaw.trim() : undefined;
      out.push(title !== undefined ? { title, feedUrl } : { feedUrl });
    }
  }

  for (const child of asOutlineArray(node.outline)) {
    collectOutlines(child, out);
  }
};

/**
 * Parse OPML XML into a deduped list of feed URLs (canonical http/https).
 * Tolerant: skips malformed outlines and non-http(s) urls; recurses folders.
 *
 * Scheme is preserved as provided (http stays http): the feed URL functions as
 * an identifier, so this parser never rewrites http->https. Preferring https
 * when it is actually reachable — with a silent fallback to http — is a
 * fetch/lookup-time concern (async availability probe), not a parse-time one.
 * Dedupe is by exact canonical URL, so http and https of the same path are
 * treated as distinct feeds here.
 */
export const parseOpml = (opmlXml: string): ParsedOpmlFeed[] => {
  const trimmed = opmlXml.trim();
  if (trimmed === '') {
    return [];
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    allowBooleanAttributes: true,
  });

  let document: OpmlDocument;
  try {
    document = parser.parse(trimmed) as OpmlDocument;
  } catch {
    return [];
  }

  const collected: ParsedOpmlFeed[] = [];
  for (const outline of asOutlineArray(document.opml?.body?.outline)) {
    collectOutlines(outline, collected);
  }

  const seen = new Set<string>();
  const deduped: ParsedOpmlFeed[] = [];
  for (const feed of collected) {
    if (seen.has(feed.feedUrl)) {
      continue;
    }
    seen.add(feed.feedUrl);
    deduped.push(feed);
  }

  return deduped;
};
