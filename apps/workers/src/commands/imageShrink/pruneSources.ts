import type { CommandLineArgs } from '@workers/commands/index.js';
import { getLoggerService } from '@workers/factories/loggerService.js';

import { ImageShrinkSourceService } from '@podverse/orm';

const DEFAULT_SOURCE_PRUNE_DAYS = 30;

const parsePruneDays = (value: string | undefined): number => {
  if (!value || value.trim() === '') {
    return DEFAULT_SOURCE_PRUNE_DAYS;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 0) {
    return DEFAULT_SOURCE_PRUNE_DAYS;
  }
  return parsed;
};

export const imageShrinkSourcePrune = async (_args: CommandLineArgs) => {
  const logger = getLoggerService();
  const pruneAfterDays = parsePruneDays(process.env.IMAGE_SHRINK_SOURCE_PRUNE_DAYS);
  const imageShrinkSourceService = new ImageShrinkSourceService();

  logger.info('imageShrinkSourcePrune: starting', { pruneAfterDays });
  const deleted = await imageShrinkSourceService.deleteUnusedSources(pruneAfterDays);
  logger.info('imageShrinkSourcePrune: completed', { deleted, pruneAfterDays });
};
