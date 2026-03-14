import type { CommandLineArgs } from '@workers/commands/index.js';
import {
  getBucketProviderConfig,
  getImageShrinkCleanupConfig,
  getImageShrinkStorageConfig,
  isImageShrinkEnabled,
} from '@workers/config/index.js';
import { getLoggerService } from '@workers/factories/loggerService.js';

import { DigitalOceanService } from '@podverse/external-services-digital-ocean';
import { ChannelImageService, ItemImageService } from '@podverse/orm';

type CandidateObject = {
  key: string;
  lastModified?: Date;
  url: string;
};

const IMAGE_KEY_PREFIX = 'images/';
const WEBP_SUFFIX = '.webp';

const isWebpKey = (key: string): boolean => {
  return key.endsWith(WEBP_SUFFIX);
};

const isOlderThanMinAge = (lastModified: Date | undefined, minAgeMs: number): boolean => {
  if (!lastModified) {
    return false;
  }
  return Date.now() - lastModified.getTime() >= minAgeMs;
};

export const imageShrinkCleanupOrphans = async (_args: CommandLineArgs) => {
  const logger = getLoggerService();

  if (!isImageShrinkEnabled()) {
    logger.info('imageShrinkCleanupOrphans: disabled (image shrink env vars not set)');
    return;
  }

  const cleanupConfig = getImageShrinkCleanupConfig();
  const storageConfig = getImageShrinkStorageConfig();
  const bucketProviderConfig = getBucketProviderConfig();
  const digitalOceanService = new DigitalOceanService({
    accessKey: bucketProviderConfig.accessKey,
    secretKey: bucketProviderConfig.secretKey,
    region: bucketProviderConfig.region,
  });
  const channelImageService = new ChannelImageService();
  const itemImageService = new ItemImageService();
  const minAgeMs = cleanupConfig.minAgeDays * 24 * 60 * 60 * 1000;

  let continuationToken: string | undefined;
  let totalListed = 0;
  let pageCount = 0;
  let skippedNonWebp = 0;
  let skippedTooNew = 0;
  let totalCandidates = 0;
  let referenced = 0;
  let orphaned = 0;
  let missingLastModified = 0;
  let deleted = 0;
  let wouldDelete = 0;

  logger.info('imageShrinkCleanupOrphans: starting scan', {
    dryRun: cleanupConfig.dryRun,
    maxDelete: cleanupConfig.maxDelete ?? 'none',
    minAgeDays: cleanupConfig.minAgeDays,
    pageSize: cleanupConfig.pageSize,
  });

  do {
    const listResult = await digitalOceanService.listObjects({
      bucket: storageConfig.bucket,
      prefix: IMAGE_KEY_PREFIX,
      continuationToken,
      maxKeys: cleanupConfig.pageSize,
    });

    pageCount += 1;
    totalListed += listResult.objects.length;
    continuationToken = listResult.nextContinuationToken;

    const candidates: CandidateObject[] = [];
    for (const object of listResult.objects) {
      if (!isWebpKey(object.key)) {
        skippedNonWebp += 1;
        continue;
      }
      if (!object.lastModified) {
        missingLastModified += 1;
        continue;
      }
      if (!isOlderThanMinAge(object.lastModified, minAgeMs)) {
        skippedTooNew += 1;
        continue;
      }
      candidates.push({
        key: object.key,
        lastModified: object.lastModified,
        url: digitalOceanService.getPublicUrl({
          cdnBaseUrl: storageConfig.cdnBaseUrl,
          key: object.key,
        }),
      });
    }

    if (candidates.length === 0) {
      if (listResult.objects.length > 0) {
        logger.info(
          `imageShrinkCleanupOrphans: page summary (page=${pageCount}, listed=${listResult.objects.length}, candidates=0, orphans=0, wouldDelete=${wouldDelete}, deleted=${deleted}, dryRun=${cleanupConfig.dryRun})`,
          {
            page: pageCount,
            listed: listResult.objects.length,
            candidates: 0,
            orphans: 0,
            wouldDelete,
            deleted,
            dryRun: cleanupConfig.dryRun,
          }
        );
      }
      continue;
    }

    totalCandidates += candidates.length;

    const urls = candidates.map((candidate) => candidate.url);
    const channelImages = await channelImageService.getByUrls(urls, true);
    const itemImages = await itemImageService.getByUrls(urls, true);
    const referencedUrls = new Set<string>();
    for (const image of channelImages) {
      referencedUrls.add(image.url);
    }
    for (const image of itemImages) {
      referencedUrls.add(image.url);
    }

    const orphans: CandidateObject[] = [];
    for (const candidate of candidates) {
      if (referencedUrls.has(candidate.url)) {
        referenced += 1;
        continue;
      }
      orphans.push(candidate);
    }

    orphaned += orphans.length;
    for (const orphan of orphans) {
      if (cleanupConfig.maxDelete !== null && deleted >= cleanupConfig.maxDelete) {
        break;
      }
      if (cleanupConfig.dryRun) {
        wouldDelete += 1;
        continue;
      }
      await digitalOceanService.deleteImageByKey({
        bucket: storageConfig.bucket,
        key: orphan.key,
      });
      deleted += 1;
    }

    logger.info(
      `imageShrinkCleanupOrphans: page summary (page=${pageCount}, listed=${listResult.objects.length}, candidates=${candidates.length}, orphans=${orphans.length}, wouldDelete=${wouldDelete}, deleted=${deleted}, dryRun=${cleanupConfig.dryRun})`,
      {
        page: pageCount,
        listed: listResult.objects.length,
        candidates: candidates.length,
        orphans: orphans.length,
        wouldDelete,
        deleted,
        dryRun: cleanupConfig.dryRun,
      }
    );

    const deleteCount = cleanupConfig.dryRun ? wouldDelete : deleted;
    if (cleanupConfig.maxDelete !== null && deleteCount >= cleanupConfig.maxDelete) {
      logger.info('imageShrinkCleanupOrphans: delete cap reached', {
        deleted,
        wouldDelete,
        maxDelete: cleanupConfig.maxDelete,
        dryRun: cleanupConfig.dryRun,
      });
      break;
    }
  } while (continuationToken);

  const summaryMessage =
    `imageShrinkCleanupOrphans: completed ` +
    `(pages=${pageCount}, listed=${totalListed}, candidates=${totalCandidates}, ` +
    `skippedNonWebp=${skippedNonWebp}, skippedTooNew=${skippedTooNew}, ` +
    `missingLastModified=${missingLastModified}, referenced=${referenced}, ` +
    `orphans=${orphaned}, wouldDelete=${wouldDelete}, deleted=${deleted}, ` +
    `dryRun=${cleanupConfig.dryRun}, maxDelete=${cleanupConfig.maxDelete ?? 'none'})`;

  logger.info(summaryMessage, {
    pages: pageCount,
    totalListed,
    totalCandidates,
    skippedNonWebp,
    skippedTooNew,
    referenced,
    orphaned,
    missingLastModified,
    deleted,
    wouldDelete,
    dryRun: cleanupConfig.dryRun,
    maxDelete: cleanupConfig.maxDelete ?? 'none',
  });

  if (orphaned === 0) {
    logger.info('imageShrinkCleanupOrphans: no images qualified for removal', {
      totalListed,
      totalCandidates,
      skippedNonWebp,
      skippedTooNew,
      missingLastModified,
      referenced,
      dryRun: cleanupConfig.dryRun,
    });
  }
};
