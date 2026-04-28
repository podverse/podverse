import type { CommandLineArgs } from '@workers/commands/index.js';
import { getLoggerService } from '@workers/factories/loggerService.js';

import { readOptionalPositiveExpirationEnv } from '@podverse/helpers';
import { ImageShrinkSourceService } from '@podverse/orm';

const DEFAULT_IMAGE_SHRINK_SOURCE_PRUNE_EXPIRATION = 30 * 24 * 60 * 60;

export const imageShrinkSourcePrune = async (_args: CommandLineArgs) => {
  const logger = getLoggerService();
  const pruneAfterExpiration = readOptionalPositiveExpirationEnv(
    'IMAGE_SHRINK_SOURCE_PRUNE_EXPIRATION',
    DEFAULT_IMAGE_SHRINK_SOURCE_PRUNE_EXPIRATION
  );
  const imageShrinkSourceService = new ImageShrinkSourceService();

  logger.info('imageShrinkSourcePrune: starting', { pruneAfterExpiration });
  const deleted = await imageShrinkSourceService.deleteUnusedSources(pruneAfterExpiration);
  logger.info('imageShrinkSourcePrune: completed', { deleted, pruneAfterExpiration });
};
