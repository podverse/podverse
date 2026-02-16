type ItemImagePartial = {
  image_width_size: number | null;
  url: string;
  is_resized?: boolean;
};

type Comparison = 'greater' | 'lesser' | null;
type AllowedExtension = 'png' | 'jpg' | 'gif' | 'jpeg' | 'webp';
type ValidExtension = 'png' | 'jpg' | 'gif' | 'webp';

export function findDTOChannelImageBySize(
  channelImages: ItemImagePartial[] | null | undefined,
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
  itemImages: ItemImagePartial[] | null | undefined,
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

export function findDTOChannelImageForList(
  channelImages: ItemImagePartial[] | null | undefined,
  size: number | 'largest' | 'smallest',
  comparison: Comparison = null,
  allowedExtensions: AllowedExtension[] = ['png', 'jpg', 'webp']
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
  allowedExtensions: AllowedExtension[] = ['png', 'jpg', 'webp']
): ItemImagePartial | null {
  if (!itemImages || itemImages.length === 0) {
    return null;
  }
  return findImageBySizePreferResized(itemImages, size, comparison, allowedExtensions);
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
      .filter((image) => image.image_width_size !== null && isValidExtension(image.url))
      .sort(sortDesc);
    if (filtered.length > 0 && filtered[0]) {
      return filtered[0];
    }
  }
  if (size === 'smallest') {
    const filtered = itemImages
      .filter((image) => image.image_width_size !== null && isValidExtension(image.url))
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
          image.image_width_size !== null &&
          image.image_width_size >= size &&
          isValidExtension(image.url)
      )
      .sort(sortAsc);
  } else if (comparison === 'lesser') {
    filteredImages = itemImages
      .filter(
        (image) =>
          image.image_width_size !== null &&
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
          image.image_width_size !== null &&
          image.image_width_size < size &&
          isValidExtension(image.url)
      )
      .sort(sortDesc);
  } else if (comparison === 'lesser') {
    filteredImages = itemImages
      .filter(
        (image) =>
          image.image_width_size !== null &&
          image.image_width_size > size &&
          isValidExtension(image.url)
      )
      .sort(sortAsc);
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

  const noExtImage = itemImages.find((image) => hasNoExtension(image.url));
  return noExtImage ?? null;
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
