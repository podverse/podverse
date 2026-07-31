type OPMLChannelRow = {
  title: string | null;
  feedUrl: string;
};

type GenerateOpmlParams = {
  directoryChannels: OPMLChannelRow[];
  addByRssChannels: OPMLChannelRow[];
};

const escapeXml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

const buildOutline = (row: OPMLChannelRow): string => {
  const fallbackTitle = row.feedUrl;
  const title = row.title && row.title.trim() !== '' ? row.title : fallbackTitle;
  const escapedTitle = escapeXml(title);
  const escapedFeedUrl = escapeXml(row.feedUrl);

  return `    <outline type="rss" text="${escapedTitle}" title="${escapedTitle}" xmlUrl="${escapedFeedUrl}" />`;
};

export const generateOpml = ({
  directoryChannels,
  addByRssChannels,
}: GenerateOpmlParams): string => {
  const nowIso = new Date().toISOString();
  const outlines = [...directoryChannels, ...addByRssChannels].map(buildOutline).join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<opml version="2.0">',
    '  <head>',
    '    <title>Podverse Subscriptions Export</title>',
    `    <dateCreated>${escapeXml(nowIso)}</dateCreated>`,
    '  </head>',
    '  <body>',
    outlines,
    '  </body>',
    '</opml>',
  ].join('\n');
};
