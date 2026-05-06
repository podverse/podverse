import {
  buildShrinkImageKey,
  bytesMatchStoredChecksum,
  trustHeadUnchanged,
} from '@workers/commands/imageShrink/changeDetection.js';
import { existingEntityForResizedSave } from '@workers/commands/imageShrink/existingEntityForResizedSave.js';
import {
  getImageShrinkConfig,
  getImageShrinkStorageConfig,
  isImageShrinkEnabled,
} from '@workers/config/index.js';
import { getImageStorageService } from '@workers/factories/imageStorageService.js';
import { getLoggerService } from '@workers/factories/loggerService.js';
import sharp from 'sharp';

import {
  createThroughputLimiter,
  readOptionalPositiveExpirationEnv,
  sha256Hex,
  truncateForLog,
} from '@podverse/helpers';
import {
  buildConditionalRequestHeaders,
  fetchWithTimeout,
  getHttpCacheMetadata,
  sanitizeHttpCacheMetadata,
} from '@podverse/helpers-backend';
import type { ChannelImage, ItemImage } from '@podverse/orm';
import {
  Channel,
  ChannelImageService,
  ImageShrinkSourceService,
  Item,
  ItemImageService,
} from '@podverse/orm';

/**
 * Image shrink storage contract: upload by key, public URL = cdnBaseUrl + key.
 * Implementations are injected at bootstrap (S3-compatible storage); the pipeline does not
 * depend on a specific vendor.
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

type OriginFetchDiagnostics = {
  originResponseStatus?: number;
  originContentLength?: number | null;
  originEtag?: string | null;
  originLastModified?: string | null;
  originContentType?: string | null;
};

const FETCH_TIMEOUT_MS = 15000;
const DEFAULT_IMAGE_SHRINK_RECHECK_EXPIRATION = 24 * 60 * 60;
const DEFAULT_IMAGE_SHRINK_SOURCE_PRUNE_EXPIRATION = 30 * 24 * 60 * 60;
const DEFAULT_IMAGE_SHRINK_DEEP_RECHECK_EXPIRATION = 7 * 24 * 60 * 60;

type FetchImageResult = {
  status: number;
  headers: Headers;
  buffer?: Uint8Array;
};

const fetchImageResult = async (
  url: string,
  requestHeaders: Record<string, string> | undefined,
  maxSourceBytes: number
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
  if (contentLength && Number(contentLength) > maxSourceBytes) {
    throw new Error(`Image exceeds max size (${contentLength} bytes)`);
  }
  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength > maxSourceBytes) {
    throw new Error(`Image exceeds max size (${arrayBuffer.byteLength} bytes)`);
  }
  return {
    status: response.status,
    headers: response.headers,
    buffer: new Uint8Array(arrayBuffer),
  };
};

const applyOriginDiagnosticsFromResponse = (
  diagnostics: OriginFetchDiagnostics,
  responseResult: FetchImageResult
): void => {
  if (responseResult.status === 304 || responseResult.buffer === undefined) {
    return;
  }
  const meta = getHttpCacheMetadata(responseResult.headers);
  diagnostics.originResponseStatus = responseResult.status;
  diagnostics.originContentLength = meta.contentLength;
  diagnostics.originEtag = meta.etag;
  diagnostics.originLastModified = meta.lastModified;
  diagnostics.originContentType = truncateForLog(responseResult.headers.get('content-type'), 256);
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
  return (
    readOptionalPositiveExpirationEnv(
      'IMAGE_SHRINK_RECHECK_EXPIRATION',
      DEFAULT_IMAGE_SHRINK_RECHECK_EXPIRATION
    ) * 1000
  );
};

const getDeepRecheckIntervalSec = (): number => {
  return readOptionalPositiveExpirationEnv(
    'IMAGE_SHRINK_DEEP_RECHECK_EXPIRATION',
    DEFAULT_IMAGE_SHRINK_DEEP_RECHECK_EXPIRATION
  );
};

const getSourcePruneAfterExpiration = (): number => {
  return readOptionalPositiveExpirationEnv(
    'IMAGE_SHRINK_SOURCE_PRUNE_EXPIRATION',
    DEFAULT_IMAGE_SHRINK_SOURCE_PRUNE_EXPIRATION
  );
};

export type ImageShrinkProcessor = {
  processTarget: (target: ImageShrinkTarget) => Promise<void>;
  pruneSources: () => Promise<void>;
  concurrency: number;
};

type PersistedImage =
  | { entityType: 'channel'; row: ChannelImage; parent: Channel }
  | { entityType: 'item'; row: ItemImage; parent: Item };

export const createImageShrinkProcessor = (): ImageShrinkProcessor => {
  const logger = getLoggerService();

  if (!isImageShrinkEnabled()) {
    throw new Error('Image shrink is disabled');
  }

  const imageStorageService = getImageStorageService();
  const storageConfig = getImageShrinkStorageConfig();
  const imageShrinkConfig = getImageShrinkConfig();

  if (
    Number.isNaN(imageShrinkConfig.widthPx) ||
    !Number.isInteger(imageShrinkConfig.widthPx) ||
    imageShrinkConfig.widthPx <= 0
  ) {
    throw new Error('IMAGE_SHRINK_WIDTH_PX must be a positive integer (or unset for default 400)');
  }
  if (
    Number.isNaN(imageShrinkConfig.webpQuality) ||
    !Number.isInteger(imageShrinkConfig.webpQuality) ||
    imageShrinkConfig.webpQuality < 1 ||
    imageShrinkConfig.webpQuality > 100
  ) {
    throw new Error(
      'IMAGE_SHRINK_WEBP_QUALITY must be an integer from 1 to 100 (or unset for default 92)'
    );
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
  if (
    Number.isNaN(imageShrinkConfig.maxSourceBytes) ||
    !Number.isInteger(imageShrinkConfig.maxSourceBytes) ||
    imageShrinkConfig.maxSourceBytes <= 0
  ) {
    throw new Error('IMAGE_SHRINK_MAX_SOURCE_BYTES must be a positive integer');
  }

  const maxSourceBytes = imageShrinkConfig.maxSourceBytes;
  const rateLimiter = createThroughputLimiter(imageShrinkConfig.rps);
  const channelImageService = new ChannelImageService();
  const itemImageService = new ItemImageService();
  const imageShrinkSourceService = new ImageShrinkSourceService();
  const recheckTtlMs = getRecheckTtlMs();
  const deepRecheckIntervalSec = getDeepRecheckIntervalSec();
  const pruneAfterExpiration = getSourcePruneAfterExpiration();

  const loadPersistedImage = async (target: ImageShrinkTarget): Promise<PersistedImage | null> => {
    if (target.entityType === 'channel') {
      const parent = new Channel();
      parent.id = target.entityId;
      const nonResized = await channelImageService._get(parent, { url: target.url });
      if (nonResized && nonResized.is_resized === false) {
        return { entityType: 'channel', row: nonResized, parent };
      }
      const resized = await channelImageService.findResizedByShrinkKeyPrefix(parent, {
        cdnBaseUrl: storageConfig.cdnBaseUrl,
        sourceUrl: target.url,
        widthPx: imageShrinkConfig.widthPx,
      });
      if (resized) {
        return { entityType: 'channel', row: resized, parent };
      }
      return null;
    }
    const parent = new Item();
    parent.id = target.entityId;
    const nonResized = await itemImageService._get(parent, { url: target.url });
    if (nonResized && nonResized.is_resized === false) {
      return { entityType: 'item', row: nonResized, parent };
    }
    const resized = await itemImageService.findResizedByShrinkKeyPrefix(parent, {
      cdnBaseUrl: storageConfig.cdnBaseUrl,
      sourceUrl: target.url,
      widthPx: imageShrinkConfig.widthPx,
    });
    if (resized) {
      return { entityType: 'item', row: resized, parent };
    }
    return null;
  };

  const saveResizedRow = async (
    persisted: PersistedImage,
    newCdnUrl: string,
    resizedWidth: number
  ): Promise<void> => {
    const dto = {
      url: newCdnUrl,
      image_width_size: resizedWidth,
      is_resized: true,
    };
    if (persisted.entityType === 'channel') {
      const existingResized = existingEntityForResizedSave(persisted.row);
      await channelImageService._update(persisted.parent, ['url'], dto, undefined, existingResized);
    } else {
      const existingResized = existingEntityForResizedSave(persisted.row);
      await itemImageService._update(persisted.parent, ['url'], dto, undefined, existingResized);
    }
  };

  const processTarget = async (target: ImageShrinkTarget) => {
    const urlHash = sha256Hex(target.url);
    const originDiagnostics: OriginFetchDiagnostics = {};
    try {
      await rateLimiter();
      const source = await imageShrinkSourceService.getByUrl(target.url);
      if (!target.hinted) {
        const shouldCheck = await imageShrinkSourceService.shouldCheck(target.url, recheckTtlMs);
        if (!shouldCheck) {
          return;
        }
      }

      const persisted = await loadPersistedImage(target);
      if (!persisted) {
        logger.warn('imageShrinkProcessor: no image row for target', {
          entityType: target.entityType,
          entityId: target.entityId,
          url: target.url,
        });
        return;
      }

      const deepDue = await imageShrinkSourceService.shouldDeepRecheck(
        target.url,
        deepRecheckIntervalSec
      );

      const finishAfterBytes = async (params: {
        originalBuffer: Uint8Array;
        responseMeta: ReturnType<typeof getHttpCacheMetadata>;
        markDeepCheckComplete: boolean;
      }): Promise<void> => {
        const { originalBuffer, responseMeta, markDeepCheckComplete } = params;
        const checksum = sha256Hex(originalBuffer);
        const sourceSnapshot = source ?? undefined;
        const unchanged = bytesMatchStoredChecksum(
          sourceSnapshot ?? null,
          originalBuffer,
          sha256Hex
        );

        if (unchanged) {
          await imageShrinkSourceService.upsert(
            target.url,
            sanitizeHttpCacheMetadata(responseMeta),
            false,
            checksum,
            { markDeepCheckComplete }
          );
          return;
        }

        const key = buildShrinkImageKey({
          entityType: target.entityType,
          entityId: target.entityId,
          widthPx: imageShrinkConfig.widthPx,
          contentChecksumSha256Hex: checksum,
          urlHash,
        });
        const cdnUrl = imageStorageService.getPublicUrl({
          cdnBaseUrl: storageConfig.cdnBaseUrl,
          key,
        });

        const resizedImage = sharp(originalBuffer, { failOn: 'none' }).resize({
          width: imageShrinkConfig.widthPx,
          withoutEnlargement: true,
        });
        const { data: resizedBuffer, info: resizedInfo } = await resizedImage
          .webp({ quality: imageShrinkConfig.webpQuality })
          .toBuffer({ resolveWithObject: true });
        const resizedWidth = resizedInfo.width ?? imageShrinkConfig.widthPx;

        await imageStorageService.uploadResizedImage({
          bucket: storageConfig.bucket,
          key,
          body: resizedBuffer,
          contentType: 'image/webp',
          cacheControl: 'public, max-age=31536000, immutable',
        });

        await imageShrinkSourceService.upsert(
          target.url,
          sanitizeHttpCacheMetadata(responseMeta),
          true,
          checksum,
          { markDeepCheckComplete }
        );

        await saveResizedRow(persisted, cdnUrl, resizedWidth);
      };

      if (deepDue) {
        const responseResult = await fetchImageResult(target.url, {}, maxSourceBytes);
        if (responseResult.status === 304) {
          await imageShrinkSourceService.updateCheckTime(target.url);
          return;
        }
        if (!responseResult.buffer) {
          throw new Error(`Missing image buffer for ${target.url}`);
        }
        applyOriginDiagnosticsFromResponse(originDiagnostics, responseResult);
        const responseMeta = getHttpCacheMetadata(responseResult.headers);
        await finishAfterBytes({
          originalBuffer: responseResult.buffer,
          responseMeta,
          markDeepCheckComplete: true,
        });
        return;
      }

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
        if (hasComparableMeta && trustHeadUnchanged(source ?? null, headMeta)) {
          await imageShrinkSourceService.upsert(
            target.url,
            sanitizeHttpCacheMetadata(headMeta),
            false,
            undefined,
            {}
          );
          return;
        }
      }

      const responseResult = await fetchImageResult(target.url, conditionalHeaders, maxSourceBytes);
      if (responseResult.status === 304) {
        await imageShrinkSourceService.updateCheckTime(target.url);
        return;
      }
      if (!responseResult.buffer) {
        throw new Error(`Missing image buffer for ${target.url}`);
      }
      applyOriginDiagnosticsFromResponse(originDiagnostics, responseResult);
      const responseMeta = getHttpCacheMetadata(responseResult.headers);
      await finishAfterBytes({
        originalBuffer: responseResult.buffer,
        responseMeta,
        markDeepCheckComplete: true,
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      const isExpectedBadOrigin =
        err.message.includes('Image exceeds max size') || err.message.includes('Vips');
      const logFn = isExpectedBadOrigin ? logger.warn.bind(logger) : logger.error.bind(logger);
      logFn('imageShrinkProcessor: failed to process target', {
        entityType: target.entityType,
        entityId: target.entityId,
        url: target.url,
        urlHash,
        hinted: target.hinted,
        maxSourceBytes,
        errorName: err.name,
        errorMessage: err.message,
        ...originDiagnostics,
      });
      throw err;
    }
  };

  const pruneSources = async () => {
    const deletedSources = await imageShrinkSourceService.deleteUnusedSources(pruneAfterExpiration);
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
