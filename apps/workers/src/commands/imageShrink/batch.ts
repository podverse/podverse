import sharp from 'sharp';

import { createThroughputLimiter, sha256Hex } from '@podverse/helpers';
import {
  buildConditionalRequestHeaders,
  fetchWithTimeout,
  getHttpCacheMetadata,
  sanitizeHttpCacheMetadata,
} from '@podverse/helpers-backend';
import {
  Channel,
  ChannelImageService,
  ImageShrinkSourceService,
  Item,
  ItemImageService,
} from '@podverse/orm';
import {
  getImageShrinkConfig,
  getImageShrinkStorageConfig,
  isImageShrinkEnabled,
} from '@workers/config/index.js';
import { getImageStorageService } from '@workers/factories/imageStorageService.js';
import { getLoggerService } from '@workers/factories/loggerService.js';

/**
 * Image shrink storage contract: upload by key, public URL = cdnBaseUrl + key.
 * Implementations are injected at bootstrap (e.g. Digital Ocean Spaces); the pipeline
 * does not depend on a specific provider.
 */

export type ImageShrinkTarget =
  | {
      entityType: 'channel';
      entityId: number;
      url: string;
      hinted: boolean;
    }
  | {
      entityType: 'item';
      entityId: number;
      url: string;
      hinted: boolean;
    };

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15000;
const DEFAULT_RECHECK_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_SOURCE_PRUNE_DAYS = 30;

const createImageKey = (target: ImageShrinkTarget, widthPx: number) => {
  const hash = sha256Hex(target.url);
  return `images/${target.entityType}/${target.entityId}/${hash}-w${widthPx}.webp`;
};

type FetchImageResult = {
  status: number;
  headers: Headers;
  buffer?: Uint8Array;
};

const fetchImageResult = async (
  url: string,
  requestHeaders?: Record<string, string>
): Promise<FetchImageResult> => {
  const response = await fetchWithTimeout(url, {
    headers: requestHeaders,
    timeoutMs: FETCH_TIMEOUT_MS,
  });
  if (response.status === 304) {
    return { status: response.status, headers: response.headers };
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch image ${url} (${response.status})`);
  }
  const contentLength = response.headers.get('content-length');
  if (contentLength && Number(contentLength) > MAX_IMAGE_BYTES) {
    throw new Error(`Image exceeds max size (${contentLength} bytes)`);
  }
  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_IMAGE_BYTES) {
    throw new Error(`Image exceeds max size (${arrayBuffer.byteLength} bytes)`);
  }
  return {
    status: response.status,
    headers: response.headers,
    buffer: new Uint8Array(arrayBuffer),
  };
};

const fetchHead = async (
  url: string,
  requestHeaders: Record<string, string>
): Promise<Response | null> => {
  try {
    return await fetchWithTimeout(url, {
      method: 'HEAD',
      headers: requestHeaders,
      timeoutMs: FETCH_TIMEOUT_MS,
    });
  } catch {
    return null;
  }
};

const getRecheckTtlMs = (): number => {
  const ttlSeconds = process.env.IMAGE_SHRINK_RECHECK_TTL_SECONDS;
  if (ttlSeconds && ttlSeconds.trim() !== '') {
    const parsed = Number(ttlSeconds);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed * 1000;
    }
  }
  return DEFAULT_RECHECK_TTL_MS;
};

const getSourcePruneDays = (): number | null => {
  const pruneDays = process.env.IMAGE_SHRINK_SOURCE_PRUNE_DAYS;
  if (pruneDays && pruneDays.trim() !== '') {
    const parsed = Number(pruneDays);
    if (!Number.isNaN(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return DEFAULT_SOURCE_PRUNE_DAYS;
};

export type ImageShrinkProcessor = {
  processTarget: (target: ImageShrinkTarget) => Promise<void>;
  pruneSources: () => Promise<void>;
  concurrency: number;
};

export const createImageShrinkProcessor = (): ImageShrinkProcessor => {
  const logger = getLoggerService();

  if (!isImageShrinkEnabled()) {
    throw new Error('Image shrink is disabled');
  }

  const imageStorageService = getImageStorageService();
  const storageConfig = getImageShrinkStorageConfig();
  const imageShrinkConfig = getImageShrinkConfig();

  if (Number.isNaN(imageShrinkConfig.widthPx) || imageShrinkConfig.widthPx <= 0) {
    throw new Error('IMAGE_SHRINK_WIDTH_PX must be a positive number');
  }
  if (Number.isNaN(imageShrinkConfig.batchSize) || imageShrinkConfig.batchSize <= 0) {
    throw new Error('IMAGE_SHRINK_BATCH_SIZE must be a positive number');
  }
  if (Number.isNaN(imageShrinkConfig.concurrency) || imageShrinkConfig.concurrency <= 0) {
    throw new Error('IMAGE_SHRINK_CONCURRENCY must be a positive number');
  }
  if (Number.isNaN(imageShrinkConfig.rps) || imageShrinkConfig.rps <= 0) {
    throw new Error('IMAGE_SHRINK_RPS must be a positive number');
  }

  const rateLimiter = createThroughputLimiter(imageShrinkConfig.rps);
  const channelImageService = new ChannelImageService();
  const itemImageService = new ItemImageService();
  const imageShrinkSourceService = new ImageShrinkSourceService();
  const recheckTtlMs = getRecheckTtlMs();
  const pruneAfterDays = getSourcePruneDays();

  const processTarget = async (target: ImageShrinkTarget) => {
    await rateLimiter();
    const source = await imageShrinkSourceService.getByUrl(target.url);
    if (!target.hinted) {
      const shouldCheck = await imageShrinkSourceService.shouldCheck(target.url, recheckTtlMs);
      if (!shouldCheck) {
        return;
      }
    }

    const key = createImageKey(target, imageShrinkConfig.widthPx);
    const cdnUrl = imageStorageService.getPublicUrl({
      cdnBaseUrl: storageConfig.cdnBaseUrl,
      key,
    });
    const conditionalHeaders = buildConditionalRequestHeaders(source ?? undefined);
    const headResponse = await fetchHead(target.url, conditionalHeaders);
    if (headResponse && headResponse.status === 304) {
      await imageShrinkSourceService.updateCheckTime(target.url);
      return;
    }

    if (headResponse && headResponse.ok) {
      const headMeta = getHttpCacheMetadata(headResponse.headers);
      const hasComparableMeta =
        !!headMeta.etag || !!headMeta.lastModified || headMeta.contentLength !== null;
      if (hasComparableMeta) {
        const sameEtag = source?.etag && headMeta.etag && source.etag === headMeta.etag;
        const sameLastModified =
          source?.lastModified &&
          headMeta.lastModified &&
          source.lastModified === headMeta.lastModified;
        const sameLength =
          source?.contentLength !== null &&
          source?.contentLength !== undefined &&
          headMeta.contentLength !== null &&
          source.contentLength === headMeta.contentLength;
        if (sameEtag || sameLastModified || sameLength) {
          await imageShrinkSourceService.upsert(
            target.url,
            sanitizeHttpCacheMetadata(headMeta),
            false
          );
          return;
        }
      }
    }

    const responseResult = await fetchImageResult(target.url, conditionalHeaders);
    if (responseResult.status === 304) {
      await imageShrinkSourceService.updateCheckTime(target.url);
      return;
    }
    if (!responseResult.buffer) {
      throw new Error(`Missing image buffer for ${target.url}`);
    }
    const originalBuffer = responseResult.buffer;
    const responseMeta = getHttpCacheMetadata(responseResult.headers);
    let changed = true;
    let checksum: string | null = null;

    if (source) {
      if (responseMeta.etag && source.etag && responseMeta.etag === source.etag) {
        changed = false;
      } else if (
        responseMeta.lastModified &&
        source.lastModified &&
        responseMeta.lastModified === source.lastModified
      ) {
        changed = false;
      } else if (
        responseMeta.contentLength !== null &&
        source.contentLength !== null &&
        responseMeta.contentLength === source.contentLength
      ) {
        checksum = sha256Hex(originalBuffer);
        if (source.checksumSha256 && checksum === source.checksumSha256) {
          changed = false;
        }
      }
    }

    if (!changed) {
      await imageShrinkSourceService.upsert(
        target.url,
        sanitizeHttpCacheMetadata(responseMeta),
        false,
        checksum
      );
      return;
    }

    const resizedImage = sharp(originalBuffer).resize({
      width: imageShrinkConfig.widthPx,
      withoutEnlargement: true,
    });
    const { data: resizedBuffer, info: resizedInfo } = await resizedImage
      .webp({ quality: 80 })
      .toBuffer({ resolveWithObject: true });
    const resizedWidth = resizedInfo.width ?? imageShrinkConfig.widthPx;

    await imageStorageService.uploadResizedImage({
      bucket: storageConfig.bucket,
      key,
      body: resizedBuffer,
      contentType: 'image/webp',
      cacheControl: 'public, max-age=31536000, immutable',
    });

    checksum = checksum ?? sha256Hex(originalBuffer);
    await imageShrinkSourceService.upsert(
      target.url,
      sanitizeHttpCacheMetadata(responseMeta),
      true,
      checksum
    );

    if (target.entityType === 'channel') {
      const parentChannel = new Channel();
      parentChannel.id = target.entityId;
      await channelImageService.update(parentChannel, {
        url: cdnUrl,
        image_width_size: resizedWidth,
        is_resized: true,
      });
    } else {
      const parentItem = new Item();
      parentItem.id = target.entityId;
      await itemImageService.update(parentItem, {
        url: cdnUrl,
        image_width_size: resizedWidth,
        is_resized: true,
      });
    }
  };

  const pruneSources = async () => {
    const deletedSources = await imageShrinkSourceService.deleteUnusedSources(pruneAfterDays);
    if (deletedSources > 0) {
      logger.info(`imageShrinkProcessor: pruned ${deletedSources} unused source rows`);
    }
  };

  return {
    processTarget,
    pruneSources,
    concurrency: imageShrinkConfig.concurrency,
  };
};
