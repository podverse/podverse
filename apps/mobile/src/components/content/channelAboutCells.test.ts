import { describe, expect, it } from 'vitest';

import { buildChannelAboutCells } from './channelAboutCells';

const person = {
  channel_id: 1,
  href: null,
  id: 9,
  img: null,
  name: 'Ada',
  person_group: 'host',
  role: 'Host',
};

describe('buildChannelAboutCells', () => {
  it('lists description then people when both are present', () => {
    const kinds = buildChannelAboutCells({
      channel_description: { value: 'A show about feeds.' },
      channel_persons: [person],
    }).map((cell) => cell.kind);

    expect(kinds).toEqual(['description', 'people-heading', 'person']);
  });

  it('lists people when description is missing', () => {
    const kinds = buildChannelAboutCells({
      channel_persons: [person],
    }).map((cell) => cell.kind);

    expect(kinds).toEqual(['people-heading', 'person']);
  });

  it('lists description when people are missing', () => {
    const kinds = buildChannelAboutCells({
      channel_description: { value: 'A show about feeds.' },
    }).map((cell) => cell.kind);

    expect(kinds).toEqual(['description']);
  });

  it('lists links as description then people when prose is empty', () => {
    const kinds = buildChannelAboutCells({
      channel_persons: [person],
      feed: { url: 'https://example.com/feed.xml' },
    }).map((cell) => cell.kind);

    expect(kinds).toEqual(['description', 'people-heading', 'person']);
  });
});
