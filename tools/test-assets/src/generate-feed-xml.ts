import { faker } from '@faker-js/faker';

import { generateGuidWithRandomVersion, pickRandomRssFeedMedium } from '@podverse/helpers';

import {
  LIVE_ITEM_ENCLOSURE_LENGTH,
  LIVE_ITEM_ENCLOSURE_TYPE,
  LIVE_ITEM_ENCLOSURE_URL,
} from './generate-feed-constants.js';

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** RFC 2822-style date for pubDate/lastBuildDate */
export function toRfc2822(d: Date): string {
  return d.toUTCString();
}

/** Build one <podcast:remoteItem> with optional itemGuid, title, medium (each chosen randomly). */
export function buildRemoteItemXml(target: { guid: string; url: string }): string {
  const attrs: string[] = [
    `feedGuid="${escapeXml(target.guid)}"`,
    `feedUrl="${escapeXml(target.url)}"`,
  ];
  if (faker.helpers.arrayElement([true, false])) {
    attrs.push(`itemGuid="${escapeXml(generateGuidWithRandomVersion())}"`);
  }
  if (faker.helpers.arrayElement([true, false])) {
    attrs.push(`title="${escapeXml(faker.lorem.words(3))}"`);
  }
  const medium = pickRandomRssFeedMedium();
  if (medium !== undefined) {
    attrs.push(`medium="${escapeXml(medium)}"`);
  }
  return `<podcast:remoteItem ${attrs.join(' ')}/>`;
}

/** Build one <podcast:remoteItem> for <podcast:publisher>: always medium="publisher", optional itemGuid/title. */
export function buildPublisherRemoteItemXml(target: { guid: string; url: string }): string {
  const attrs: string[] = [
    `feedGuid="${escapeXml(target.guid)}"`,
    `feedUrl="${escapeXml(target.url)}"`,
    'medium="publisher"',
  ];
  if (faker.helpers.arrayElement([true, false])) {
    attrs.push(`itemGuid="${escapeXml(generateGuidWithRandomVersion())}"`);
  }
  if (faker.helpers.arrayElement([true, false])) {
    attrs.push(`title="${escapeXml(faker.lorem.words(3))}"`);
  }
  return `<podcast:remoteItem ${attrs.join(' ')}/>`;
}

/** 07c: Build one <podcast:liveItem> with reference enclosure; status = live | pending | ended. */
export function buildLiveItemBlock(
  status: 'live' | 'pending' | 'ended',
  chatWebUrl?: string
): string {
  const guid = generateGuidWithRandomVersion();
  const title = faker.lorem.sentence();
  const start = toRfc2822(faker.date.recent({ days: 1 }));
  const endAttr =
    status === 'ended' || status === 'pending'
      ? ` end="${toRfc2822(faker.date.recent({ days: 1 }))}"`
      : '';
  const chatAttr = chatWebUrl ? ` chat="${escapeXml(chatWebUrl)}"` : '';
  return `<podcast:liveItem status="${status}" start="${start}"${endAttr}${chatAttr}>
    <guid>${escapeXml(guid)}</guid>
    <title>${escapeXml(title)}</title>
    <enclosure url="${escapeXml(LIVE_ITEM_ENCLOSURE_URL)}" type="${LIVE_ITEM_ENCLOSURE_TYPE}" length="${LIVE_ITEM_ENCLOSURE_LENGTH}"/>
  </podcast:liveItem>`;
}
