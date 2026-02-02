import type { DTOChannelImage, DTOItemImage } from '../dtos/index.js';

type ItemImagePartial = {
  image_width_size: number | null;
  url: string;
};

type Comparison = 'greater' | 'lesser' | null;
type AllowedExtension = 'png' | 'jpg' | 'gif' | 'jpeg' | 'webp';
type ValidExtension = 'png' | 'jpg' | 'gif' | 'webp';

export function findDTOChannelImageBySize(
  channelImages: DTOChannelImage[] | null | undefined,
  size: number | 'largest' | 'smallest',
  comparison: Comparison = null,
  allowedExtensions: AllowedExtension[] = ['png', 'jpg', 'webp']
): ItemImagePartial | null {
  if (!channelImages || channelImages.length === 0) {
    return null;
  } else {
    return findImageBySize(channelImages, size, comparison, allowedExtensions);
  }
}

export function findDTOItemImageBySize(
  itemImages: DTOItemImage[] | null | undefined,
  size: number | 'largest' | 'smallest',
  comparison: Comparison = null,
  allowedExtensions: AllowedExtension[] = ['png', 'jpg', 'webp']
): ItemImagePartial | null {
  if (!itemImages || itemImages.length === 0) {
    return null;
  } else {
    return findImageBySize(itemImages, size, comparison, allowedExtensions);
  }
}

export function findImageBySize(
  itemImages: ItemImagePartial[],
  size: number | 'largest' | 'smallest',
  comparison: Comparison = null,
  allowedExtensions: AllowedExtension[] = ['png', 'jpg', 'webp']
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
      .filter((image) => image.image_width_size !== null && isValidExtension(image.url))
      .sort((a, b) => (b.image_width_size ?? 0) - (a.image_width_size ?? 0));
    if (filtered.length > 0 && filtered[0]) {
      return filtered[0];
    }

    const nullSizeImage = itemImages.find(
      (image) => image.image_width_size === null && isValidExtension(image.url)
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
      .filter((image) => image.image_width_size !== null && isValidExtension(image.url))
      .sort((a, b) => (a.image_width_size ?? 0) - (b.image_width_size ?? 0));
    if (filtered.length > 0 && filtered[0]) {
      return filtered[0];
    }

    const nullSizeImage = itemImages.find(
      (image) => image.image_width_size === null && isValidExtension(image.url)
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
          image.image_width_size !== null &&
          image.image_width_size >= size &&
          isValidExtension(image.url)
      )
      .sort((a, b) => (a.image_width_size ?? 0) - (b.image_width_size ?? 0));
  } else if (comparison === 'lesser') {
    filteredImages = itemImages
      .filter(
        (image) =>
          image.image_width_size !== null &&
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
          image.image_width_size !== null &&
          image.image_width_size < size &&
          isValidExtension(image.url)
      )
      .sort((b, a) => (b.image_width_size ?? 0) - (a.image_width_size ?? 0));
  } else if (comparison === 'lesser') {
    filteredImages = itemImages
      .filter(
        (image) =>
          image.image_width_size !== null &&
          image.image_width_size > size &&
          isValidExtension(image.url)
      )
      .sort((a, b) => (a.image_width_size ?? 0) - (b.image_width_size ?? 0));
  }

  if (filteredImages.length > 0 && filteredImages[0]) {
    return filteredImages[0];
  }

  const nullSizeImage = itemImages.find(
    (image) => image.image_width_size === null && isValidExtension(image.url)
  );
  if (nullSizeImage) {
    return nullSizeImage;
  }

  // Last resort: image with no extension
  const noExtImage = itemImages.find((image) => hasNoExtension(image.url));
  return noExtImage ?? null;
}
