type GetDownloadFilenameParams = {
  itemTitle?: string | null;
  sourceUri: string;
  fallbackFilename: string;
};

function stripExtension(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return '';
  }
  const lastDot = trimmed.lastIndexOf('.');
  if (lastDot <= 0) {
    return trimmed;
  }
  return trimmed.slice(0, lastDot);
}

function getExtensionFromFilename(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) {
    return null;
  }
  const lastDot = trimmed.lastIndexOf('.');
  if (lastDot <= 0 || lastDot === trimmed.length - 1) {
    return null;
  }
  const ext = trimmed.slice(lastDot + 1).toLowerCase();
  return /^[a-z0-9]+$/i.test(ext) ? ext : null;
}

function getExtensionFromUri(sourceUri: string): string | null {
  const trimmed = sourceUri.trim();
  if (!trimmed) {
    return null;
  }

  let path = '';
  try {
    const url = new URL(trimmed, 'http://dummy.local');
    path = url.pathname;
  } catch {
    const queryIndex = trimmed.indexOf('?');
    const hashIndex = trimmed.indexOf('#');
    const cutIndex =
      queryIndex === -1
        ? hashIndex
        : hashIndex === -1
          ? queryIndex
          : Math.min(queryIndex, hashIndex);
    path = cutIndex === -1 ? trimmed : trimmed.slice(0, cutIndex);
  }

  const segments = path.split('/').filter(Boolean);
  const lastSegment = segments.at(-1);
  return getExtensionFromFilename(lastSegment ?? path);
}

export function getDownloadFilenameFromSource({
  itemTitle,
  sourceUri,
  fallbackFilename,
}: GetDownloadFilenameParams): string {
  const title = itemTitle?.trim() ?? '';
  const baseName = title ? stripExtension(title) : stripExtension(fallbackFilename);
  const sourceExtension = getExtensionFromUri(sourceUri);
  if (sourceExtension) {
    return `${baseName}.${sourceExtension}`;
  }

  const fallbackExtension = getExtensionFromFilename(fallbackFilename);
  if (title) {
    if (fallbackExtension) {
      return `${baseName}.${fallbackExtension}`;
    }
    return baseName;
  }

  return fallbackFilename;
}
