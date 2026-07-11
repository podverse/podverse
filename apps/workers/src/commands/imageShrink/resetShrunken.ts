import type { CommandLineArgs } from '@workers/commands/index.js';
import { getImageShrinkStorageConfig, isImageShrinkEnabled } from '@workers/config/index.js';
import { getImageStorageService } from '@workers/factories/imageStorageService.js';
import { getLoggerService } from '@workers/factories/loggerService.js';

import { ChannelImageService, ItemImageService } from '@podverse/orm';

import { isShrinkGeneratedObjectKey, isShrinkResizedPublicUrl } from './shrinkKeyPattern.js';

const IMAGE_KEY_PREFIX = 'images/';
const RESET_PAGE_SIZE = 500;
const SAMPLE_LOG_LIMIT = 5;

type ResetCounters = {
  bucketListed: number;
  bucketSkippedNonShrink: number;
  bucketWouldDelete: number;
  bucketDeleted: number;
  dbScanned: number;
  dbWouldDelete: number;
  dbDeleted: number;
};

const logSampleKeys = (
  logger: ReturnType<typeof getLoggerService>,
  commandName: string,
  label: string,
  keys: string[]
) => {
  if (keys.length === 0) {
    return;
  }
  logger.info(`${commandName}: ${label} sample`, {
    sample: keys.slice(0, SAMPLE_LOG_LIMIT),
    sampleCount: Math.min(keys.length, SAMPLE_LOG_LIMIT),
    total: keys.length,
  });
};

const deleteBucketShrinkObjects = async (params: {
  commandName: string;
  dryRun: boolean;
}): Promise<
  Pick<
    ResetCounters,
    'bucketListed' | 'bucketSkippedNonShrink' | 'bucketWouldDelete' | 'bucketDeleted'
  >
> => {
  const logger = getLoggerService();
  const storageConfig = getImageShrinkStorageConfig();
  const imageStorage = getImageStorageService();

  let continuationToken: string | undefined;
  let bucketListed = 0;
  let bucketSkippedNonShrink = 0;
  let bucketWouldDelete = 0;
  let bucketDeleted = 0;
  const sampleKeys: string[] = [];

  do {
    const listResult = await imageStorage.listObjects({
      bucket: storageConfig.bucket,
      prefix: IMAGE_KEY_PREFIX,
      continuationToken,
      maxKeys: RESET_PAGE_SIZE,
    });

    bucketListed += listResult.objects.length;
    continuationToken = listResult.nextContinuationToken;

    const keysToDelete: string[] = [];
    for (const object of listResult.objects) {
      if (!isShrinkGeneratedObjectKey(object.key)) {
        bucketSkippedNonShrink += 1;
        continue;
      }
      keysToDelete.push(object.key);
    }

    if (keysToDelete.length > 0) {
      sampleKeys.push(...keysToDelete);
    }

    for (const key of keysToDelete) {
      if (params.dryRun) {
        bucketWouldDelete += 1;
        continue;
      }

      await imageStorage.deleteImageByKey({
        bucket: storageConfig.bucket,
        key,
      });
      bucketDeleted += 1;
    }
  } while (continuationToken);

  logSampleKeys(logger, params.commandName, 'bucket keys targeted', sampleKeys);
  return { bucketListed, bucketSkippedNonShrink, bucketWouldDelete, bucketDeleted };
};

const deleteResizedDbRows = async (params: {
  commandName: string;
  cdnBaseUrl: string;
  dryRun: boolean;
}): Promise<Pick<ResetCounters, 'dbScanned' | 'dbWouldDelete' | 'dbDeleted'>> => {
  const logger = getLoggerService();
  const channelImageService = new ChannelImageService();
  const itemImageService = new ItemImageService();

  let dbScanned = 0;
  let dbWouldDelete = 0;
  let dbDeleted = 0;
  const sampleUrls: string[] = [];

  const deleteFromService = async (entityLabel: 'channel' | 'item'): Promise<void> => {
    let lastId = 0;

    for (;;) {
      const rows =
        entityLabel === 'channel'
          ? await channelImageService.findResizedRowsAfterId(lastId, RESET_PAGE_SIZE)
          : await itemImageService.findResizedRowsAfterId(lastId, RESET_PAGE_SIZE);

      if (rows.length === 0) {
        break;
      }

      lastId = rows[rows.length - 1]?.id ?? lastId;
      dbScanned += rows.length;

      const matchingRows = rows.filter((row) =>
        isShrinkResizedPublicUrl({ url: row.url, cdnBaseUrl: params.cdnBaseUrl })
      );

      if (matchingRows.length > 0) {
        sampleUrls.push(...matchingRows.map((row) => row.url));
      }

      if (params.dryRun) {
        dbWouldDelete += matchingRows.length;
        continue;
      }

      if (matchingRows.length > 0) {
        const ids = matchingRows.map((row) => row.id);
        if (entityLabel === 'channel') {
          await channelImageService.deleteByIds(ids);
        } else {
          await itemImageService.deleteByIds(ids);
        }
        dbDeleted += matchingRows.length;
      }
    }
  };

  await deleteFromService('channel');
  await deleteFromService('item');

  logSampleKeys(logger, params.commandName, 'db urls targeted', sampleUrls);
  return { dbScanned, dbWouldDelete, dbDeleted };
};

const runResetShrunken = async (commandName: string, dryRun: boolean) => {
  const logger = getLoggerService();

  if (!isImageShrinkEnabled()) {
    logger.info(`${commandName}: disabled (image shrink env vars not set)`);
    return;
  }

  const storageConfig = getImageShrinkStorageConfig();

  logger.info(`${commandName}: starting reset`, {
    dryRun,
    pageSize: RESET_PAGE_SIZE,
    bucket: storageConfig.bucket,
    cdnBaseUrl: storageConfig.cdnBaseUrl,
  });

  const bucketCounters = await deleteBucketShrinkObjects({ commandName, dryRun });

  const dbCounters = await deleteResizedDbRows({
    commandName,
    cdnBaseUrl: storageConfig.cdnBaseUrl,
    dryRun,
  });

  const summary = {
    ...bucketCounters,
    ...dbCounters,
    dryRun,
    pageSize: RESET_PAGE_SIZE,
  };

  logger.info(
    `${commandName}: completed ` +
      `(bucketListed=${summary.bucketListed}, bucketSkippedNonShrink=${summary.bucketSkippedNonShrink}, ` +
      `bucketWouldDelete=${summary.bucketWouldDelete}, bucketDeleted=${summary.bucketDeleted}, ` +
      `dbScanned=${summary.dbScanned}, dbWouldDelete=${summary.dbWouldDelete}, dbDeleted=${summary.dbDeleted}, ` +
      `dryRun=${summary.dryRun})`,
    summary
  );
};

export const imageShrinkResetShrunkenDryRun = async (_args: CommandLineArgs) => {
  await runResetShrunken('imageShrinkResetShrunkenDryRun', true);
};

export const imageShrinkResetShrunken = async (_args: CommandLineArgs) => {
  await runResetShrunken('imageShrinkResetShrunken', false);
};
