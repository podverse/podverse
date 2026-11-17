import type { DownloadRecord } from './downloadTypes';

export type ChosenFolderKind = 'saf_tree' | 'path' | 'unsupported' | null;

/**
 * Android shows the switch only for a Storage Access Framework tree. The switch starts on.
 * Only the exact pref `false` turns it off. Every other platform and folder kind stays hidden.
 */
export const chosenFolderSwitchState = (input: {
  platform: 'android' | 'ios' | 'other';
  folderKind: ChosenFolderKind;
  pref: string | null;
}): { visible: boolean; enabled: boolean } => {
  const visible = input.platform === 'android' && input.folderKind === 'saf_tree';
  const enabled = visible && input.pref !== 'false';
  return { visible, enabled };
};

/** True when the stored download path is a document URI rather than a private file name. */
export const isChosenFolderDocumentUri = (stored: string): boolean => {
  return stored.trim().startsWith('content://');
};

const SAF_EXTENSION_MIME: Readonly<Record<string, string>> = {
  '3gp': 'video/3gpp',
  aac: 'audio/aac',
  flac: 'audio/flac',
  m4a: 'audio/mp4',
  m4b: 'audio/mp4',
  m4v: 'video/mp4',
  mkv: 'video/x-matroska',
  mov: 'video/quicktime',
  mp3: 'audio/mpeg',
  mp4: 'video/mp4',
  mpeg: 'audio/mpeg',
  mpga: 'audio/mpeg',
  oga: 'audio/ogg',
  ogg: 'audio/ogg',
  opus: 'audio/opus',
  wav: 'audio/wav',
  webm: 'video/webm',
};

const enclosureMimeType = (enclosureMime: string): string | null => {
  const semicolon = enclosureMime.indexOf(';');
  const head = (semicolon === -1 ? enclosureMime : enclosureMime.slice(0, semicolon))
    .trim()
    .toLowerCase();
  const slash = head.indexOf('/');
  if (slash === -1 || slash !== head.lastIndexOf('/') || /\s/.test(head)) {
    return null;
  }
  return head;
};

const extensionMimeType = (fileExtension: string): string | null => {
  const withoutDot = fileExtension.startsWith('.') ? fileExtension.slice(1) : fileExtension;
  const mapped = SAF_EXTENSION_MIME[withoutDot.toLowerCase()];
  return mapped === undefined ? null : mapped;
};

/**
 * MIME type passed to `StorageAccessFramework.createFileAsync`. A usable enclosure type wins.
 * Otherwise the extension is mapped. A mismatched type makes the document provider append
 * `.mp3`, so an unknown pair stays `application/octet-stream` instead of `audio/mpeg`.
 */
export const safCreateMimeType = (
  fileExtension: string | null,
  enclosureMime: string | null
): string => {
  if (enclosureMime !== null) {
    const fromMime = enclosureMimeType(enclosureMime);
    if (fromMime !== null) {
      return fromMime;
    }
  }
  if (fileExtension !== null) {
    const fromExtension = extensionMimeType(fileExtension);
    if (fromExtension !== null) {
      return fromExtension;
    }
  }
  return 'application/octet-stream';
};

/**
 * Bytes of completed downloads stored as document URIs. The settings meter adds this to the
 * downloads bucket. The listener's folder can hold other files, so this does not list that folder.
 */
export const sumChosenFolderBytes = (
  rows: readonly Pick<DownloadRecord, 'byteSize' | 'filePath' | 'status'>[]
): number => {
  let total = 0;
  for (const row of rows) {
    if (row.status !== 'complete' || row.filePath === null || row.byteSize === null) {
      continue;
    }
    if (!isChosenFolderDocumentUri(row.filePath)) {
      continue;
    }
    if (!Number.isFinite(row.byteSize) || row.byteSize <= 0) {
      continue;
    }
    total += row.byteSize;
  }
  return total;
};
