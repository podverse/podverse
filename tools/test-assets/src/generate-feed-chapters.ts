import { faker } from '@faker-js/faker';

import { CHAPTERS_VERSION, IMAGE_SIZES, NUM_TOC_CHAPTERS } from './generate-feed-constants.js';
import { pad3 } from './generate-feed-utils.js';

/** JSON chapters (1.2): chapter entry for generated file. startTime/endTime in seconds. */
export type GeneratedChapter = {
  startTime: number;
  endTime?: number;
  title?: string;
  img?: string;
  url?: string;
  toc?: boolean;
  location?: { name: string; geo: string; osm?: string };
};

/**
 * Build chapters array for one item. Exactly NUM_TOC_CHAPTERS toc:true chapters,
 * all within [0, durationSec]. Optionally 0–2 toc:false overlay chapters. Sorted by startTime.
 */
export const buildChaptersForItem = (
  durationSec: number,
  baseUrl: string,
  imagePoolSize: number
): GeneratedChapter[] => {
  const chapters: GeneratedChapter[] = [];
  const numTocChapters = NUM_TOC_CHAPTERS;
  const segmentDuration = durationSec / numTocChapters;
  for (let i = 0; i < numTocChapters; i++) {
    const startTime = Math.round(i * segmentDuration * 10) / 10;
    const endTime =
      i < numTocChapters - 1
        ? Math.round((i + 1) * segmentDuration * 10) / 10
        : Math.round(durationSec * 10) / 10;
    const ch: GeneratedChapter = {
      startTime,
      endTime,
      title: faker.lorem.sentence(),
      toc: true,
    };
    if (faker.helpers.arrayElement([true, false])) {
      ch.img = `${baseUrl}/images/image-${pad3(
        faker.number.int({ min: 1, max: imagePoolSize })
      )}-${IMAGE_SIZES[0]}.jpg`;
    }
    if (faker.helpers.arrayElement([true, false])) {
      ch.url = faker.internet.url();
    }
    if (faker.helpers.arrayElement([true, false])) {
      ch.location = {
        name: faker.location.city(),
        geo: `geo:${faker.location.latitude()},${faker.location.longitude()}`,
      };
    }
    chapters.push(ch);
  }
  const numOverlay = faker.number.int({ min: 0, max: 2 });
  for (let o = 0; o < numOverlay; o++) {
    const start = faker.number.float({
      min: 0,
      max: Math.max(0, durationSec - 10),
      fractionDigits: 1,
    });
    const end = Math.min(
      durationSec,
      start + faker.number.float({ min: 10, max: 60, fractionDigits: 1 })
    );
    chapters.push({
      startTime: Math.round(start * 10) / 10,
      endTime: Math.round(end * 10) / 10,
      title: faker.lorem.words(2),
      toc: false,
    });
  }
  chapters.sort((a, b) => a.startTime - b.startTime);

  // Ensure no chapter exceeds media duration (clamp start/end to [0, durationSec])
  const clamped = chapters.map((ch) => {
    const start = Math.max(0, Math.min(ch.startTime, durationSec));
    const end =
      ch.endTime !== undefined ? Math.max(start, Math.min(ch.endTime, durationSec)) : undefined;
    return {
      ...ch,
      startTime: Math.round(start * 10) / 10,
      endTime: end !== undefined ? Math.round(end * 10) / 10 : undefined,
    };
  });
  return clamped;
};

/** Build full chapters JSON object (version + optional metadata + chapters). */
export const buildChaptersJson = (
  chapters: GeneratedChapter[]
): {
  version: string;
  chapters: GeneratedChapter[];
  author?: string;
  title?: string;
  podcastName?: string;
  description?: string;
  fileName?: string;
  waypoints?: boolean;
} => {
  const root: {
    version: string;
    chapters: GeneratedChapter[];
    author?: string;
    title?: string;
    podcastName?: string;
    description?: string;
    fileName?: string;
    waypoints?: boolean;
  } = {
    version: CHAPTERS_VERSION,
    chapters,
    author: faker.person.fullName(),
    title: faker.lorem.sentence(),
    podcastName: faker.lorem.words(3),
    description: faker.lorem.paragraph(),
    fileName: faker.system.fileName(),
  };
  if (faker.helpers.arrayElement([true, false])) {
    root.waypoints = faker.helpers.arrayElement([true, false]);
  }
  return root;
};
