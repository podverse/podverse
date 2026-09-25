import type { DTOChannelPerson } from '@podverse/helpers';

import type { AboutPerson } from './aboutPerson';
import { toAboutPersonFromChannel } from './aboutPerson';

export type ChannelAboutCell =
  | {
      feedUrl: string | null;
      key: string;
      kind: 'description';
      text: string | null;
      websiteUrl: string | null;
    }
  | { key: string; kind: 'people-heading' }
  | { key: string; kind: 'person'; person: AboutPerson };

const nonEmpty = (value: string | null | undefined): string | null => {
  if (value === null || value === undefined || value.length === 0) {
    return null;
  }
  return value;
};

/**
 * Order the About body: description (and tucked RSS / website), then people.
 */
export type ChannelAboutSource = {
  channel_about?: { website_link_url?: string | null } | null;
  channel_description?: { value?: string | null } | null;
  channel_persons?: DTOChannelPerson[] | null;
  feed?: { url?: string | null } | null;
};

export const buildChannelAboutCells = (channel: ChannelAboutSource | null): ChannelAboutCell[] => {
  const description = nonEmpty(channel?.channel_description?.value);
  const feedUrl = nonEmpty(channel?.feed?.url);
  const websiteUrl = nonEmpty(channel?.channel_about?.website_link_url);
  const people = (channel?.channel_persons ?? []).map(toAboutPersonFromChannel);
  const next: ChannelAboutCell[] = [];

  const hasLinks = feedUrl !== null || websiteUrl !== null;
  if (description !== null || hasLinks) {
    next.push({
      feedUrl,
      key: 'description',
      kind: 'description',
      text: description,
      websiteUrl,
    });
  }

  if (people.length > 0) {
    next.push({ key: 'people-heading', kind: 'people-heading' });
    for (const person of people) {
      next.push({ key: `person-${person.id}`, kind: 'person', person });
    }
  }

  return next;
};
