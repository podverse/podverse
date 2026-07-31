import { describe, expect, it } from 'vitest';

import { isLongRunningCommand, LONG_RUNNING_COMMANDS } from './longRunningCommands.js';

describe('LONG_RUNNING_COMMANDS', () => {
  it('includes all Deployment-style long-running worker commands', () => {
    expect(LONG_RUNNING_COMMANDS.size).toBe(6);
    expect(isLongRunningCommand('mqRSSRunParser')).toBe(true);
    expect(isLongRunningCommand('mqAddByRSSRunParser')).toBe(true);
    expect(isLongRunningCommand('mqOpmlImportRun')).toBe(true);
    expect(isLongRunningCommand('mqRSSRunLiveItemListener')).toBe(true);
    expect(isLongRunningCommand('mqRSSRunDlqConsumer')).toBe(true);
    expect(isLongRunningCommand('imageShrinkRunConsumer')).toBe(true);
  });

  it('excludes one-shot CronJob-style commands', () => {
    expect(isLongRunningCommand('statsUpdateAggregated')).toBe(false);
    expect(isLongRunningCommand('archiveAll')).toBe(false);
  });
});
