import { describe, expect, it } from 'vitest';

import {
  CATEGORY_BASE,
  CATEGORY_MQ,
  CATEGORY_ORM,
  CATEGORY_PARSER,
  CATEGORY_PODCAST_INDEX,
  CATEGORY_WEB_NOTIFICATIONS,
  getCategoriesForCommand,
} from './categoriesForCommand.js';

function sortCategories(set: ReadonlySet<string>): string[] {
  return [...set].sort();
}

describe('getCategoriesForCommand', () => {
  it('maps archiveAll to Base and ORM', () => {
    expect(sortCategories(getCategoriesForCommand('archiveAll'))).toEqual(
      sortCategories(new Set([CATEGORY_BASE, CATEGORY_ORM]))
    );
  });

  it('maps podcastIndexDeadFeedsDeleteCache to Base only', () => {
    expect(sortCategories(getCategoriesForCommand('podcastIndexDeadFeedsDeleteCache'))).toEqual([
      CATEGORY_BASE,
    ]);
  });

  it('maps mqRSSRunParser to full parser stack categories', () => {
    expect(sortCategories(getCategoriesForCommand('mqRSSRunParser'))).toEqual(
      sortCategories(
        new Set([
          CATEGORY_BASE,
          CATEGORY_ORM,
          CATEGORY_MQ,
          CATEGORY_PARSER,
          CATEGORY_PODCAST_INDEX,
          CATEGORY_WEB_NOTIFICATIONS,
        ])
      )
    );
  });
});
