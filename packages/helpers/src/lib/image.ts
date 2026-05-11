type ItemImagePartial = {
  /** Stored payloads may omit width; treat like null in sizing helpers. */
  image_width_size: number | null | undefined;
  url: string;
  is_resized?: boolean;
};

type AllowedExtension = 'png' | 'jpg' | 'gif' | 'jpeg' | 'webp';
type ValidExtension = 'png' | 'jpg' | 'gif' | 'webp';

export const DEFAULT_ARTWORK_EXTENSIONS: AllowedExtension[] = ['png', 'jpg', 'webp', 'gif'];
export const DEFAULT_HERO_ARTWORK_EXTENSIONS = DEFAULT_ARTWORK_EXTENSIONS;

function itemImageHasNumericWidth(
  image: ItemImagePartial
): image is ItemImagePartial & { image_width_size: number } {
  return typeof image.image_width_size === 'number';
}

function itemImageWidthUnset(image: ItemImagePartial): boolean {
  return image.image_width_size === null || image.image_width_size === undefined;
}

function urlHasAllowedImageExtension(url: string, allowedExtensions: AllowedExtension[]): boolean {
  const extensions: ValidExtension[] = allowedExtensions.map((ext) =>
    ext === 'jpeg' ? 'jpg' : ext
  ) as ValidExtension[];
  const match = url.match(/(\?|\.)(jpg|jpeg|png|gif|webp)(?=($|\?|#))/i);
  if (!match || !match[2]) {
    return false;
  }
  const ext = match[2].toLowerCase() === 'jpeg' ? 'jpg' : match[2].toLowerCase();
  return extensions.includes(ext as ValidExtension);
}

/** Non-resized rows with no stored width (DTO omits size); treat as full originals before resized thumbs. */
function pickUnsetWidthNonResizedForHero(
  nonResizedImages: ItemImagePartial[],
  allowedExtensions: AllowedExtension[]
): ItemImagePartial | null {
  const candidates = nonResizedImages.filter(
    (img) => itemImageWidthUnset(img) && urlHasAllowedImageExtension(img.url, allowedExtensions)
  );
  if (candidates.length === 0) {
    return null;
  }
  const sorted = [...candidates].sort((a, b) => a.url.localeCompare(b.url));
  return sorted[0] ?? null;
}

type Comparison = 'greater' | 'lesser' | null;

export function findDTOChannelImageBySize(
  channelImages: ItemImagePartial[] | null | undefined,
  size: number | 'largest' | 'smallest',
  comparison: Comparison = null,
  allowedExtensions: AllowedExtension[] = DEFAULT_ARTWORK_EXTENSIONS
): ItemImagePartial | null {
  if (!channelImages || channelImages.length === 0) {
    return null;
  } else {
    return findImageBySize(channelImages, size, comparison, allowedExtensions);
  }
}

export function findDTOItemImageBySize(
  itemImages: ItemImagePartial[] | null | undefined,
  size: number | 'largest' | 'smallest',
  comparison: Comparison = null,
  allowedExtensions: AllowedExtension[] = DEFAULT_ARTWORK_EXTENSIONS
): ItemImagePartial | null {
  if (!itemImages || itemImages.length === 0) {
    return null;
  } else {
    return findImageBySize(itemImages, size, comparison, allowedExtensions);
  }
}

export function findDTOChannelImageForList(
  channelImages: ItemImagePartial[] | null | undefined,
  size: number | 'largest' | 'smallest',
  comparison: Comparison = null,
  allowedExtensions: AllowedExtension[] = DEFAULT_ARTWORK_EXTENSIONS
): ItemImagePartial | null {
  if (!channelImages || channelImages.length === 0) {
    return null;
  }
  return findImageBySizePreferResized(channelImages, size, comparison, allowedExtensions);
}

export function findDTOItemImageForList(
  itemImages: ItemImagePartial[] | null | undefined,
  size: number | 'largest' | 'smallest',
  comparison: Comparison = null,
  allowedExtensions: AllowedExtension[] = DEFAULT_ARTWORK_EXTENSIONS
): ItemImagePartial | null {
  if (!itemImages || itemImages.length === 0) {
    return null;
  }
  return findImageBySizePreferResized(itemImages, size, comparison, allowedExtensions);
}

export function findDTOChannelImageForHero(
  channelImages: ItemImagePartial[] | null | undefined,
  size: number | 'largest' | 'smallest',
  comparison: Comparison = null,
  allowedExtensions: AllowedExtension[] = DEFAULT_HERO_ARTWORK_EXTENSIONS
): ItemImagePartial | null {
  if (!channelImages || channelImages.length === 0) {
    return null;
  }
  return findImageBySizePreferNonResized(channelImages, size, comparison, allowedExtensions);
}

export function findDTOItemImageForHero(
  itemImages: ItemImagePartial[] | null | undefined,
  size: number | 'largest' | 'smallest',
  comparison: Comparison = null,
  allowedExtensions: AllowedExtension[] = DEFAULT_HERO_ARTWORK_EXTENSIONS
): ItemImagePartial | null {
  if (!itemImages || itemImages.length === 0) {
    return null;
  }
  return findImageBySizePreferNonResized(itemImages, size, comparison, allowedExtensions);
}

function pushDistinctUrl(urls: string[], seen: Set<string>, url: string | null | undefined) {
  if (url === null || url === undefined || url.trim() === '') {
    return;
  }
  if (seen.has(url)) {
    return;
  }
  seen.add(url);
  urls.push(url);
}

/** Non-resized URLs: best {@link findImageBySize} pick first, then remaining by descending numeric width, unset width last. */
function orderNonResizedUrlsForFallbackChain(
  nonResized: ItemImagePartial[],
  size: number | 'largest' | 'smallest',
  comparison: Comparison,
  allowedExtensions: AllowedExtension[]
): string[] {
  const best = findImageBySize(nonResized, size, comparison, allowedExtensions);
  const rest = best === null ? nonResized : nonResized.filter((img) => img.url !== best.url);
  const sortedRest = [...rest].sort((a, b) => {
    const wa = a.image_width_size;
    const wb = b.image_width_size;
    const aUnset = wa === null || wa === undefined;
    const bUnset = wb === null || wb === undefined;
    if (aUnset && bUnset) {
      return a.url.localeCompare(b.url);
    }
    if (aUnset) {
      return 1;
    }
    if (bUnset) {
      return -1;
    }
    if (wa !== wb) {
      return wb - wa;
    }
    return a.url.localeCompare(b.url);
  });
  const urls: string[] = [];
  if (best !== null) {
    urls.push(best.url);
  }
  for (const img of sortedRest) {
    urls.push(img.url);
  }
  return urls;
}

function buildDTOImageLoadCandidates(
  images: ItemImagePartial[] | null | undefined,
  size: number | 'largest' | 'smallest',
  comparison: Comparison,
  allowedExtensions: AllowedExtension[],
  findForList: (
    imgs: ItemImagePartial[] | null | undefined,
    sz: number | 'largest' | 'smallest',
    cmp: Comparison,
    ext: AllowedExtension[]
  ) => ItemImagePartial | null
): string[] {
  if (!images || images.length === 0) {
    return [];
  }

  const normalized = images.map((img) => ({
    ...img,
    image_width_size: img.image_width_size ?? null,
  }));

  const seen = new Set<string>();
  const out: string[] = [];

  const primary = findForList(normalized, size, comparison, allowedExtensions);
  pushDistinctUrl(out, seen, primary?.url);

  const nonResized = normalized.filter((image) => image.is_resized !== true);
  if (nonResized.length > 0) {
    for (const url of orderNonResizedUrlsForFallbackChain(
      nonResized,
      size,
      comparison,
      allowedExtensions
    )) {
      pushDistinctUrl(out, seen, url);
    }
  }

  const fullSetBest = findImageBySize(normalized, size, comparison, allowedExtensions);
  pushDistinctUrl(out, seen, fullSetBest?.url);

  return out;
}

/** Ordered URLs for client-side load fallback: list preference first, then native-sized, then full-set best. */
export function buildDTOItemImageLoadCandidates(
  itemImages: ItemImagePartial[] | null | undefined,
  size: number | 'largest' | 'smallest',
  comparison: Comparison = null,
  allowedExtensions: AllowedExtension[] = DEFAULT_ARTWORK_EXTENSIONS
): string[] {
  return buildDTOImageLoadCandidates(
    itemImages,
    size,
    comparison,
    allowedExtensions,
    findDTOItemImageForList
  );
}

/** Same as {@link buildDTOItemImageLoadCandidates} for channel artwork rows. */
export function buildDTOChannelImageLoadCandidates(
  channelImages: ItemImagePartial[] | null | undefined,
  size: number | 'largest' | 'smallest',
  comparison: Comparison = null,
  allowedExtensions: AllowedExtension[] = DEFAULT_ARTWORK_EXTENSIONS
): string[] {
  return buildDTOImageLoadCandidates(
    channelImages,
    size,
    comparison,
    allowedExtensions,
    findDTOChannelImageForList
  );
}

/**
 * Header / hero / large artwork: same fallback chain as {@link buildDTOItemImageLoadCandidates}, but the
 * primary URL uses {@link findDTOItemImageBySize} — never {@link findDTOItemImageForList} (shrunken-first).
 */
export function buildDTOItemImageHeroLoadCandidates(
  itemImages: ItemImagePartial[] | null | undefined,
  size: number | 'largest' | 'smallest',
  comparison: Comparison = null,
  allowedExtensions: AllowedExtension[] = DEFAULT_HERO_ARTWORK_EXTENSIONS
): string[] {
  return buildDTOImageLoadCandidates(
    itemImages,
    size,
    comparison,
    allowedExtensions,
    findDTOItemImageForHero
  );
}

/**
 * Header / hero channel artwork: primary uses {@link findDTOChannelImageBySize}, not list-oriented
 * {@link findDTOChannelImageForList}.
 */
export function buildDTOChannelImageHeroLoadCandidates(
  channelImages: ItemImagePartial[] | null | undefined,
  size: number | 'largest' | 'smallest',
  comparison: Comparison = null,
  allowedExtensions: AllowedExtension[] = DEFAULT_HERO_ARTWORK_EXTENSIONS
): string[] {
  return buildDTOImageLoadCandidates(
    channelImages,
    size,
    comparison,
    allowedExtensions,
    findDTOChannelImageForHero
  );
}

/**
 * Item artwork candidates first (episode/track cover), then podcast/channel artwork — deduped in order.
 * Matches UI that prefers `item_image?.url || channel_image?.url`.
 */
export function mergeDTOItemThenChannelImageCandidates(
  itemImages: ItemImagePartial[] | null | undefined,
  channelImages: ItemImagePartial[] | null | undefined,
  size: number | 'largest' | 'smallest',
  comparison: Comparison = null,
  allowedExtensions: AllowedExtension[] = DEFAULT_ARTWORK_EXTENSIONS
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const url of buildDTOItemImageLoadCandidates(
    itemImages,
    size,
    comparison,
    allowedExtensions
  )) {
    pushDistinctUrl(out, seen, url);
  }
  for (const url of buildDTOChannelImageLoadCandidates(
    channelImages,
    size,
    comparison,
    allowedExtensions
  )) {
    pushDistinctUrl(out, seen, url);
  }
  return out;
}

/**
 * Same merge order as {@link mergeDTOItemThenChannelImageCandidates} for header / hero surfaces — uses
 * {@link buildDTOItemImageHeroLoadCandidates} and {@link buildDTOChannelImageHeroLoadCandidates} (no list
 * shrunken-first primary).
 */
export function mergeDTOItemThenChannelImageHeroCandidates(
  itemImages: ItemImagePartial[] | null | undefined,
  channelImages: ItemImagePartial[] | null | undefined,
  size: number | 'largest' | 'smallest',
  comparison: Comparison = null,
  allowedExtensions: AllowedExtension[] = DEFAULT_HERO_ARTWORK_EXTENSIONS
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const url of buildDTOItemImageHeroLoadCandidates(
    itemImages,
    size,
    comparison,
    allowedExtensions
  )) {
    pushDistinctUrl(out, seen, url);
  }
  for (const url of buildDTOChannelImageHeroLoadCandidates(
    channelImages,
    size,
    comparison,
    allowedExtensions
  )) {
    pushDistinctUrl(out, seen, url);
  }
  return out;
}

/** Put `prefixUrl` first when present; omit duplicates already in `candidates`. */
export function prependDistinctImageCandidate(
  prefixUrl: string | null | undefined,
  candidates: string[]
): string[] {
  const trimmed = prefixUrl?.trim();
  if (!trimmed) {
    return candidates;
  }
  const rest = candidates.filter((url) => url !== trimmed);
  return [trimmed, ...rest];
}

/** Append `suffixUrl` last when present and not already in `candidates`. */
export function appendDistinctImageCandidate(
  suffixUrl: string | null | undefined,
  candidates: string[]
): string[] {
  const trimmed = suffixUrl?.trim();
  if (!trimmed) {
    return candidates;
  }
  if (candidates.includes(trimmed)) {
    return candidates;
  }
  return [...candidates, trimmed];
}

function findImageBySizePreferResized(
  itemImages: ItemImagePartial[],
  size: number | 'largest' | 'smallest',
  comparison: Comparison,
  allowedExtensions: AllowedExtension[]
): ItemImagePartial | null {
  const resizedImages = itemImages.filter((image) => image.is_resized === true);
  const resizedMatch = findImageBySizeWithTieBreak(
    resizedImages,
    size,
    comparison,
    allowedExtensions
  );
  if (resizedMatch) {
    return resizedMatch;
  }
  return findImageBySizeWithTieBreak(itemImages, size, comparison, allowedExtensions);
}

function findImageBySizePreferNonResized(
  itemImages: ItemImagePartial[],
  size: number | 'largest' | 'smallest',
  comparison: Comparison,
  allowedExtensions: AllowedExtension[]
): ItemImagePartial | null {
  const nonResizedImages = itemImages.filter((image) => image.is_resized !== true);
  const nonResizedMatch = findImageBySizeWithTieBreak(
    nonResizedImages,
    size,
    comparison,
    allowedExtensions
  );
  if (nonResizedMatch) {
    return nonResizedMatch;
  }
  const unsetOriginal = pickUnsetWidthNonResizedForHero(nonResizedImages, allowedExtensions);
  if (unsetOriginal !== null) {
    return unsetOriginal;
  }
  return findImageBySizeWithTieBreak(itemImages, size, comparison, allowedExtensions);
}

function findImageBySizeWithTieBreak(
  itemImages: ItemImagePartial[],
  size: number | 'largest' | 'smallest',
  comparison: Comparison,
  allowedExtensions: AllowedExtension[]
): ItemImagePartial | null {
  if (itemImages.length === 0) {
    return null;
  }

  const sortAsc = (a: ItemImagePartial, b: ItemImagePartial) => {
    const widthA = a.image_width_size ?? 0;
    const widthB = b.image_width_size ?? 0;
    if (widthA !== widthB) {
      return widthA - widthB;
    }
    return a.url.localeCompare(b.url);
  };
  const sortDesc = (a: ItemImagePartial, b: ItemImagePartial) => {
    const widthA = a.image_width_size ?? 0;
    const widthB = b.image_width_size ?? 0;
    if (widthA !== widthB) {
      return widthB - widthA;
    }
    return a.url.localeCompare(b.url);
  };

  const extensions: ValidExtension[] = allowedExtensions.map((ext) =>
    ext === 'jpeg' ? 'jpg' : ext
  ) as ValidExtension[];
  const isValidExtension = (url: string) => {
    const match = url.match(/(\?|\.)(jpg|jpeg|png|gif|webp)(?=($|\?|#))/i);
    if (!match || !match[2]) {
      return false;
    }
    const ext = match[2].toLowerCase() === 'jpeg' ? 'jpg' : match[2].toLowerCase();
    return extensions.includes(ext as ValidExtension);
  };
  const hasNoExtension = (url: string) => {
    const cleanUrl = url.split(/[?#]/)[0] ?? '';
    const lastSegment = cleanUrl.split('/').pop() ?? '';
    return lastSegment && !lastSegment.includes('.') && lastSegment.length > 0;
  };

  if (size === 'largest') {
    const filtered = itemImages
      .filter((image) => itemImageHasNumericWidth(image) && isValidExtension(image.url))
      .sort(sortDesc);
    if (filtered.length > 0 && filtered[0]) {
      return filtered[0];
    }
  }
  if (size === 'smallest') {
    const filtered = itemImages
      .filter((image) => itemImageHasNumericWidth(image) && isValidExtension(image.url))
      .sort(sortAsc);
    if (filtered.length > 0 && filtered[0]) {
      return filtered[0];
    }
  }

  if (typeof size !== 'number') {
    return null;
  }

  let filteredImages: ItemImagePartial[] = [];

  if (comparison === 'greater') {
    filteredImages = itemImages
      .filter(
        (image) =>
          itemImageHasNumericWidth(image) &&
          image.image_width_size >= size &&
          isValidExtension(image.url)
      )
      .sort(sortAsc);
  } else if (comparison === 'lesser') {
    filteredImages = itemImages
      .filter(
        (image) =>
          itemImageHasNumericWidth(image) &&
          image.image_width_size <= size &&
          isValidExtension(image.url)
      )
      .sort(sortDesc);
  }

  if (filteredImages.length > 0 && filteredImages[0]) {
    return filteredImages[0];
  }

  if (comparison === 'greater') {
    filteredImages = itemImages
      .filter(
        (image) =>
          itemImageHasNumericWidth(image) &&
          image.image_width_size < size &&
          isValidExtension(image.url)
      )
      .sort(sortDesc);
  } else if (comparison === 'lesser') {
    filteredImages = itemImages
      .filter(
        (image) =>
          itemImageHasNumericWidth(image) &&
          image.image_width_size > size &&
          isValidExtension(image.url)
      )
      .sort(sortAsc);
  }

  if (filteredImages.length > 0 && filteredImages[0]) {
    return filteredImages[0];
  }

  const nullSizeImage = itemImages.find(
    (image) => itemImageWidthUnset(image) && isValidExtension(image.url)
  );
  if (nullSizeImage) {
    return nullSizeImage;
  }

  const noExtImage = itemImages.find((image) => hasNoExtension(image.url));
  return noExtImage ?? null;
}

export function findImageBySize(
  itemImages: ItemImagePartial[],
  size: number | 'largest' | 'smallest',
  comparison: Comparison = null,
  allowedExtensions: AllowedExtension[] = DEFAULT_ARTWORK_EXTENSIONS
): ItemImagePartial | null {
  const extensions: ValidExtension[] = allowedExtensions.map((ext) =>
    ext === 'jpeg' ? 'jpg' : ext
  ) as ValidExtension[];
  const isValidExtension = (url: string) => {
    // Match .jpg, ?.jpg, etc. at the end of the URL (before query/hash)
    const match = url.match(/(\?|\.)(jpg|jpeg|png|gif|webp)(?=($|\?|#))/i);
    if (!match || !match[2]) {
      return false;
    }
    const ext = match[2].toLowerCase() === 'jpeg' ? 'jpg' : match[2].toLowerCase();
    return extensions.includes(ext as ValidExtension);
  };

  // Helper to check if URL has no extension
  const hasNoExtension = (url: string) => {
    // Remove query/hash
    const cleanUrl = url.split(/[?#]/)[0] ?? '';
    // Get last segment after last '/'
    const lastSegment = cleanUrl.split('/').pop() ?? '';
    // If there's no dot in last segment, it's likely no extension
    return lastSegment && !lastSegment.includes('.') && lastSegment.length > 0;
  };

  if (size === 'largest') {
    const filtered = itemImages
      .filter((image) => itemImageHasNumericWidth(image) && isValidExtension(image.url))
      .sort((a, b) => (b.image_width_size ?? 0) - (a.image_width_size ?? 0));
    if (filtered.length > 0 && filtered[0]) {
      return filtered[0];
    }

    const nullSizeImage = itemImages.find(
      (image) => itemImageWidthUnset(image) && isValidExtension(image.url)
    );
    if (nullSizeImage) {
      return nullSizeImage;
    }

    // Last resort: image with no extension
    const noExtImage = itemImages.find((image) => hasNoExtension(image.url));
    return noExtImage ?? null;
  }
  if (size === 'smallest') {
    const filtered = itemImages
      .filter((image) => itemImageHasNumericWidth(image) && isValidExtension(image.url))
      .sort((a, b) => (a.image_width_size ?? 0) - (b.image_width_size ?? 0));
    if (filtered.length > 0 && filtered[0]) {
      return filtered[0];
    }

    const nullSizeImage = itemImages.find(
      (image) => itemImageWidthUnset(image) && isValidExtension(image.url)
    );
    if (nullSizeImage) {
      return nullSizeImage;
    }

    // Last resort: image with no extension
    const noExtImage = itemImages.find((image) => hasNoExtension(image.url));
    return noExtImage ?? null;
  }

  let filteredImages: ItemImagePartial[] = [];

  if (comparison === 'greater') {
    filteredImages = itemImages
      .filter(
        (image) =>
          itemImageHasNumericWidth(image) &&
          image.image_width_size >= size &&
          isValidExtension(image.url)
      )
      .sort((a, b) => (a.image_width_size ?? 0) - (b.image_width_size ?? 0));
  } else if (comparison === 'lesser') {
    filteredImages = itemImages
      .filter(
        (image) =>
          itemImageHasNumericWidth(image) &&
          image.image_width_size <= size &&
          isValidExtension(image.url)
      )
      .sort((b, a) => (b.image_width_size ?? 0) - (a.image_width_size ?? 0));
  }

  if (filteredImages.length > 0 && filteredImages[0]) {
    return filteredImages[0];
  }

  if (comparison === 'greater') {
    filteredImages = itemImages
      .filter(
        (image) =>
          itemImageHasNumericWidth(image) &&
          image.image_width_size < size &&
          isValidExtension(image.url)
      )
      .sort((b, a) => (b.image_width_size ?? 0) - (a.image_width_size ?? 0));
  } else if (comparison === 'lesser') {
    filteredImages = itemImages
      .filter(
        (image) =>
          itemImageHasNumericWidth(image) &&
          image.image_width_size > size &&
          isValidExtension(image.url)
      )
      .sort((a, b) => (a.image_width_size ?? 0) - (b.image_width_size ?? 0));
  }

  if (filteredImages.length > 0 && filteredImages[0]) {
    return filteredImages[0];
  }

  const nullSizeImage = itemImages.find(
    (image) => itemImageWidthUnset(image) && isValidExtension(image.url)
  );
  if (nullSizeImage) {
    return nullSizeImage;
  }

  // Last resort: image with no extension
  const noExtImage = itemImages.find((image) => hasNoExtension(image.url));
  return noExtImage ?? null;
}
