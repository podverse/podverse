/**
 * File-name rules for downloads written by the previous app. A file key is `${episodeId}${ext}`
 * and may contain `/` when the episode id is a trimmed base64 path. Helpers that delete files
 * join a key onto a folder only after `isSafeV4FileKey` accepts it.
 */

export type V4FileRootKind = 'app_external_files' | 'app_documents' | 'app_cache';

export type V4SharedFolder =
  { kind: 'saf_tree'; uri: string } | { kind: 'path'; uri: string } | { kind: 'unsupported' };

/** Lowercase media extensions, without a leading dot. */
export const V4_MEDIA_EXTENSIONS = [
  'mp3',
  'm4a',
  'm4b',
  'mp4',
  'm4v',
  'aac',
  'ogg',
  'oga',
  'opus',
  'wav',
  'flac',
  'webm',
  'mov',
  'mpga',
  'mpeg',
  '3gp',
  'mkv',
] as const;

const V4_MEDIA_EXTENSION_SET: ReadonlySet<string> = new Set(V4_MEDIA_EXTENSIONS);

const FAT_REPLACED_CHARACTERS = new Set(['"', '*', '/', ':', '<', '>', '?', '\\', '|']);

const CLASH_BEFORE_FINAL_EXTENSION = / \(\d+\)(\.[^.]+)$/;

/**
 * Extension from a media URL, including the dot. The query is removed at the first `?`. A `#`
 * fragment stays. An empty last path segment, or an empty extension, is `.mp3`. A segment with
 * no dot uses the whole segment (`.abc`). Case is kept.
 */
export const v4ExtensionFromUrl = (url: string): string => {
  const path = url.split('?')[0] ?? '';
  if (path === '') {
    return '.mp3';
  }
  const segments = path.split('/');
  const filePath = segments[segments.length - 1] ?? '';
  if (filePath === '') {
    return '.mp3';
  }
  const extension = filePath.split('.').pop() ?? '';
  return `.${extension === '' ? 'mp3' : extension}`;
};

/** `${episodeId}${legacyExtension}`. `legacyExtension` includes its dot. */
export const v4FileKey = (episodeId: string, legacyExtension: string): string =>
  `${episodeId}${legacyExtension}`;

/**
 * False for an empty key, a leading `/`, a backslash, a NUL, or any `/` segment that is empty,
 * `.`, or `..`.
 */
export const isSafeV4FileKey = (fileKey: string): boolean => {
  if (
    fileKey === '' ||
    fileKey.startsWith('/') ||
    fileKey.includes('\\') ||
    fileKey.includes('\0')
  ) {
    return false;
  }
  const segments = fileKey.split('/');
  for (const segment of segments) {
    if (segment === '' || segment === '.' || segment === '..') {
      return false;
    }
  }
  return true;
};

/** Top-level media file name: no `/`, a safe key, and a known media extension. */
export const isV4OrphanMediaName = (name: string): boolean => {
  if (name.includes('/')) {
    return false;
  }
  if (!isSafeV4FileKey(name)) {
    return false;
  }
  const dotIndex = name.lastIndexOf('.');
  if (dotIndex < 0) {
    return false;
  }
  const extension = name.slice(dotIndex + 1).toLowerCase();
  return V4_MEDIA_EXTENSION_SET.has(extension);
};

/** `.` plus the text after the last dot, or `''` when the name has no dot. */
export const legacyExtensionOfName = (name: string): string => {
  const dotIndex = name.lastIndexOf('.');
  if (dotIndex < 0) {
    return '';
  }
  return `.${name.slice(dotIndex + 1)}`;
};

/**
 * Extension without the dot, lowercased, when it is a known media extension. Otherwise null.
 * This is the `fileExtension` value passed to `buildDownloadFileName`.
 */
export const v5FileExtensionForV4 = (legacyExtension: string): string | null => {
  const withoutDot = legacyExtension.startsWith('.') ? legacyExtension.slice(1) : legacyExtension;
  const lowered = withoutDot.toLowerCase();
  if (withoutDot === '' || !V4_MEDIA_EXTENSION_SET.has(lowered)) {
    return null;
  }
  return lowered;
};

const contentUriHost = (uri: string): string => {
  const withoutScheme = uri.slice('content://'.length);
  const slashIndex = withoutScheme.indexOf('/');
  const authority = slashIndex === -1 ? withoutScheme : withoutScheme.slice(0, slashIndex);
  const atIndex = authority.lastIndexOf('@');
  return atIndex === -1 ? authority : authority.slice(atIndex + 1);
};

const stripTrailingSlashes = (path: string): string => {
  let end = path.length;
  while (end > 1 && path[end - 1] === '/') {
    end -= 1;
  }
  return path.slice(0, end);
};

/**
 * Classifies the raw shared-folder value. Blank is null. An external-storage tree is `saf_tree`.
 * Any other `content://` URI is `unsupported`. A filesystem path becomes a `file://` URI with no
 * trailing slash. Anything else is `unsupported`.
 */
export const classifyV4SharedFolder = (value: string | null): V4SharedFolder | null => {
  if (value === null) {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed === '') {
    return null;
  }
  if (trimmed.startsWith('content://')) {
    const host = contentUriHost(trimmed);
    if (host.startsWith('com.android.externalstorage')) {
      return { kind: 'saf_tree', uri: trimmed };
    }
    return { kind: 'unsupported' };
  }
  if (trimmed.startsWith('/')) {
    return { kind: 'path', uri: `file://${stripTrailingSlashes(trimmed)}` };
  }
  return { kind: 'unsupported' };
};

/**
 * Display name of a SAF document URI: the decoded id after the last `/document/`, then the text
 * after the last `/`, or after the first `:` when the id has no `/`. A decode error is null.
 */
export const safDocumentDisplayName = (documentUri: string): string | null => {
  const marker = '/document/';
  const markerIndex = documentUri.lastIndexOf(marker);
  if (markerIndex < 0) {
    return null;
  }
  const encoded = documentUri.slice(markerIndex + marker.length);
  let decoded: string;
  try {
    decoded = decodeURIComponent(encoded);
  } catch {
    return null;
  }
  if (decoded === '') {
    return null;
  }
  const slashIndex = decoded.lastIndexOf('/');
  if (slashIndex >= 0) {
    const name = decoded.slice(slashIndex + 1);
    return name === '' ? null : name;
  }
  const colonIndex = decoded.indexOf(':');
  if (colonIndex >= 0) {
    const name = decoded.slice(colonIndex + 1);
    return name === '' ? null : name;
  }
  return decoded;
};

/** Replaces FAT-illegal characters and control characters (below 0x20, and 0x7F) with `_`. */
export const fatSafeName = (name: string): string => {
  let safe = '';
  for (const character of name) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint < 0x20 || codePoint === 0x7f || FAT_REPLACED_CHARACTERS.has(character)) {
      safe += '_';
    } else {
      safe += character;
    }
  }
  return safe;
};

/**
 * True when the shared-folder display name is the FAT-safe file key, that name plus `.mp3`, or
 * either of those with one ` (digits)` suffix removed from just before the final extension.
 */
export const matchesV4SharedFolderName = (displayName: string, fileKey: string): boolean => {
  const base = fatSafeName(fileKey);
  const withoutClash = displayName.replace(CLASH_BEFORE_FINAL_EXTENSION, '$1');
  return withoutClash === base || withoutClash === `${base}.mp3`;
};

/** Folder prefixes of a nested key, deepest first. A top-level key returns an empty list. */
export const nestedDirectoriesOf = (fileKey: string): string[] => {
  const segments = fileKey.split('/');
  if (segments.length <= 1) {
    return [];
  }
  const directories: string[] = [];
  for (let depth = segments.length - 1; depth >= 1; depth -= 1) {
    directories.push(segments.slice(0, depth).join('/'));
  }
  return directories;
};
