import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const statsDir = path.dirname(fileURLToPath(import.meta.url));

describe('stats track event service subtypes', () => {
  const cases = [
    { file: 'statsTrackEventItem.ts', field: 'item_id' },
    { file: 'statsTrackEventChannel.ts', field: 'channel_id' },
    { file: 'statsTrackEventClip.ts', field: 'clip_id' },
    { file: 'statsTrackEventPlaylist.ts', field: 'playlist_id' },
    { file: 'statsTrackEventAccount.ts', field: 'tracked_account_id' },
  ];

  it.each(cases)('$file declares a static entity id field mapping', ({ file, field }) => {
    const src = readFileSync(path.join(statsDir, file), 'utf8');
    expect(src).toContain(`entityIdField = '${field}'`);
    expect(src).not.toContain('protected entityName');
  });
});
