/**
 * Locate, copy, and delete download files written by the previous app. Nothing here runs on its
 * own. A carryover pass calls these helpers and handles the result values; a failure never throws.
 *
 * The first read of a shared folder is remembered on the roots object, so one pass keeps the
 * object from `resolveV4DownloadRoots`. A file key is joined onto a folder only after
 * `isSafeV4FileKey` accepts it. Stored names are file names under `downloads/`, never absolute
 * paths.
 */

import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import {
  getAndroidExternalFilesDirectory,
  removeUnfinishedAndroidDownloadJobs,
} from '../../../modules/podverse-legacy-storage';
import { DOWNLOADS_SUBDIRECTORY, toStoredDownloadFileName } from '../../downloads/downloadStorage';
import type { V4FileRootKind, V4SharedFolder } from './v4DownloadNames';
import {
  classifyV4SharedFolder,
  isSafeV4FileKey,
  isV4OrphanMediaName,
  matchesV4SharedFolderName,
  nestedDirectoriesOf,
  safDocumentDisplayName,
} from './v4DownloadNames';

export { removeUnfinishedAndroidDownloadJobs };

export type V4DownloadRoots = {
  /** `FileSystem.documentDirectory`, with a trailing slash. `downloads/` lives under it. */
  documentDirectory: string;
  /** Searched in this order for a staged file key. */
  fileRoots: { kind: V4FileRootKind; uri: string }[];
  sharedFolder: V4SharedFolder | null;
};

export type V4LocatedFile = {
  uri: string;
  place: V4FileRootKind | 'shared_folder';
  byteSize: number | null;
};

export type V4LocateResult =
  | { kind: 'already_adopted'; fileName: string; byteSize: number | null }
  | { kind: 'found'; file: V4LocatedFile; duplicates: V4LocatedFile[] }
  | { kind: 'not_found' }
  | { kind: 'unreachable'; reason: 'shared_folder_unreadable' | 'shared_folder_unsupported' };

export type V4AdoptResult =
  | { kind: 'adopted'; fileName: string; byteSize: number; sourceRemoved: boolean }
  | { kind: 'target_exists'; fileName: string }
  | {
      kind: 'failed';
      reason: 'invalid_target' | 'source_missing' | 'insufficient_space' | 'copy_failed';
    };

export type V4DeleteResult =
  { kind: 'deleted'; bytes: number } | { kind: 'failed'; deletedCount: number };

export type V4OrphanFile = { fileKey: string; root: V4FileRootKind };

type V4LocateEntry = {
  fileKey: string;
  orphanRoot: V4FileRootKind | null;
  adoptedFileName: string | null;
};

type FoundFile = Extract<V4LocateResult, { kind: 'found' }>;

type PathStat =
  | { status: 'missing' }
  | { status: 'file'; size: number }
  | { status: 'directory' }
  | { status: 'unreadable' };

type SharedFolderScan = { status: 'listed'; uris: readonly string[] } | { status: 'unreadable' };

type SharedFolderOutcome = {
  files: V4LocatedFile[];
  problem: 'shared_folder_unreadable' | 'shared_folder_unsupported' | null;
};

const sharedFolderScans = new WeakMap<V4DownloadRoots, SharedFolderScan>();

const withTrailingSlash = (uri: string): string => (uri.endsWith('/') ? uri : `${uri}/`);

const joinUnderRoot = (rootUri: string, relative: string): string => {
  const base = rootUri.endsWith('/') ? rootUri : `${rootUri}/`;
  return `${base}${relative}`;
};

const fileUriForAbsolutePath = (absolutePath: string): string => {
  if (absolutePath.startsWith('file://')) {
    return withTrailingSlash(absolutePath);
  }
  const trimmed = absolutePath.endsWith('/') ? absolutePath.slice(0, -1) : absolutePath;
  return `file://${trimmed}/`;
};

const downloadsDirectoryUri = (documentDirectory: string): string =>
  joinUnderRoot(withTrailingSlash(documentDirectory), DOWNLOADS_SUBDIRECTORY);

const filesystemPath = (uri: string): string => {
  const raw = uri.startsWith('file://') ? uri.slice('file://'.length) : uri;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
};

const isSingleDownloadFileName = (name: string): boolean => {
  if (name === '' || name === '.' || name === '..') {
    return false;
  }
  return !name.includes('/') && !name.includes('\\') && !name.includes('\0');
};

const statPath = async (uri: string): Promise<PathStat> => {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) {
      return { status: 'missing' };
    }
    if (info.isDirectory) {
      return { status: 'directory' };
    }
    return { status: 'file', size: info.size };
  } catch {
    return { status: 'unreadable' };
  }
};

const deleteUri = async (uri: string): Promise<boolean> => {
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
    return true;
  } catch {
    return false;
  }
};

/** Deletes a partial file. A directory at that URI is left in place. */
const deletePartialFile = async (uri: string): Promise<void> => {
  const stat = await statPath(uri);
  if (stat.status === 'directory') {
    return;
  }
  await deleteUri(uri);
};

const hasFreeSpace = async (bytes: number): Promise<boolean> => {
  try {
    const free = await FileSystem.getFreeDiskStorageAsync();
    return free >= bytes;
  } catch {
    return true;
  }
};

const sizesMatch = (actual: number, expected: number | null): boolean =>
  expected === null || actual === expected;

const readRootFile = async (
  root: { kind: V4FileRootKind; uri: string },
  fileKey: string
): Promise<V4LocatedFile | null> => {
  if (!isSafeV4FileKey(fileKey)) {
    return null;
  }
  const stat = await statPath(joinUnderRoot(root.uri, fileKey));
  if (stat.status !== 'file') {
    return null;
  }
  return {
    byteSize: stat.size,
    place: root.kind,
    uri: joinUnderRoot(root.uri, fileKey),
  };
};

const loadSharedTree = async (
  roots: V4DownloadRoots,
  treeUri: string
): Promise<SharedFolderScan> => {
  const cached = sharedFolderScans.get(roots);
  if (cached !== undefined) {
    return cached;
  }
  try {
    const uris = await FileSystem.StorageAccessFramework.readDirectoryAsync(treeUri);
    const scan: SharedFolderScan = { status: 'listed', uris };
    sharedFolderScans.set(roots, scan);
    return scan;
  } catch {
    const scan: SharedFolderScan = { status: 'unreadable' };
    sharedFolderScans.set(roots, scan);
    return scan;
  }
};

const searchSharedPath = async (
  roots: V4DownloadRoots,
  folderUri: string,
  fileKey: string
): Promise<SharedFolderOutcome> => {
  if (sharedFolderScans.get(roots)?.status === 'unreadable') {
    return { files: [], problem: 'shared_folder_unreadable' };
  }
  if (!isSafeV4FileKey(fileKey)) {
    return { files: [], problem: null };
  }
  const stat = await statPath(`${folderUri}/${fileKey}`);
  if (stat.status === 'unreadable') {
    sharedFolderScans.set(roots, { status: 'unreadable' });
    return { files: [], problem: 'shared_folder_unreadable' };
  }
  if (stat.status !== 'file') {
    return { files: [], problem: null };
  }
  return {
    files: [{ byteSize: stat.size, place: 'shared_folder', uri: `${folderUri}/${fileKey}` }],
    problem: null,
  };
};

const searchSharedTree = async (
  roots: V4DownloadRoots,
  treeUri: string,
  fileKey: string
): Promise<SharedFolderOutcome> => {
  const scan = await loadSharedTree(roots, treeUri);
  if (scan.status === 'unreadable') {
    return { files: [], problem: 'shared_folder_unreadable' };
  }
  const files: V4LocatedFile[] = [];
  for (const documentUri of scan.uris) {
    const displayName = safDocumentDisplayName(documentUri);
    if (displayName === null || !matchesV4SharedFolderName(displayName, fileKey)) {
      continue;
    }
    const stat = await statPath(documentUri);
    if (stat.status === 'directory' || stat.status === 'missing') {
      continue;
    }
    files.push({
      byteSize: stat.status === 'file' ? stat.size : null,
      place: 'shared_folder',
      uri: documentUri,
    });
  }
  return { files, problem: null };
};

const searchSharedFolder = async (
  roots: V4DownloadRoots,
  fileKey: string
): Promise<SharedFolderOutcome> => {
  const folder = roots.sharedFolder;
  if (folder === null) {
    return { files: [], problem: null };
  }
  if (folder.kind === 'unsupported') {
    return { files: [], problem: 'shared_folder_unsupported' };
  }
  if (folder.kind === 'path') {
    return searchSharedPath(roots, folder.uri, fileKey);
  }
  return searchSharedTree(roots, folder.uri, fileKey);
};

const locateAlreadyAdopted = async (
  adoptedFileName: string | null,
  documentDirectory: string
): Promise<Extract<V4LocateResult, { kind: 'already_adopted' }> | null> => {
  if (adoptedFileName === null || !isSingleDownloadFileName(adoptedFileName)) {
    return null;
  }
  const stat = await statPath(
    joinUnderRoot(downloadsDirectoryUri(documentDirectory), adoptedFileName)
  );
  if (stat.status !== 'file') {
    return null;
  }
  return { byteSize: stat.size, fileName: adoptedFileName, kind: 'already_adopted' };
};

const relativeKeyUnderRoot = (rootUri: string, fileUri: string): string | null => {
  const rootPath = withTrailingSlash(filesystemPath(rootUri));
  const filePath = filesystemPath(fileUri);
  if (!filePath.startsWith(rootPath)) {
    return null;
  }
  const relative = filePath.slice(rootPath.length);
  return isSafeV4FileKey(relative) ? relative : null;
};

const rootUriForPlace = (place: V4LocatedFile['place'], roots: V4DownloadRoots): string | null => {
  if (place === 'shared_folder') {
    return null;
  }
  const root = roots.fileRoots.find((item) => item.kind === place);
  return root === undefined ? null : root.uri;
};

/**
 * Deletes empty nested folders under the same file root, deepest first. The root itself and a
 * top-level `downloads` folder are never deleted.
 */
const pruneEmptyNestedFolders = async (
  files: readonly V4LocatedFile[],
  roots: V4DownloadRoots
): Promise<void> => {
  for (const file of files) {
    const rootUri = rootUriForPlace(file.place, roots);
    if (rootUri === null) {
      continue;
    }
    const relativeFile = relativeKeyUnderRoot(rootUri, file.uri);
    if (relativeFile === null) {
      continue;
    }
    for (const relativeDir of nestedDirectoriesOf(relativeFile)) {
      if (relativeDir === DOWNLOADS_SUBDIRECTORY) {
        continue;
      }
      const dirUri = joinUnderRoot(rootUri, relativeDir);
      if (
        withTrailingSlash(filesystemPath(dirUri)) === withTrailingSlash(filesystemPath(rootUri))
      ) {
        continue;
      }
      try {
        const names = await FileSystem.readDirectoryAsync(dirUri);
        if (names.length > 0) {
          break;
        }
        await FileSystem.deleteAsync(dirUri, { idempotent: true });
      } catch {
        break;
      }
    }
  }
};

const deleteDuplicates = async (
  located: FoundFile,
  protectedUri: string
): Promise<V4LocatedFile[]> => {
  const removed: V4LocatedFile[] = [];
  for (const duplicate of located.duplicates) {
    if (duplicate.uri === protectedUri || duplicate.uri === located.file.uri) {
      continue;
    }
    if (await deleteUri(duplicate.uri)) {
      removed.push(duplicate);
    }
  }
  return removed;
};

const finishAdopted = async (
  fileName: string,
  byteSize: number,
  sourceRemoved: boolean,
  located: FoundFile,
  roots: V4DownloadRoots,
  targetUri: string
): Promise<V4AdoptResult> => {
  const removedDuplicates = await deleteDuplicates(located, targetUri);
  const pruned = sourceRemoved ? [located.file, ...removedDuplicates] : removedDuplicates;
  await pruneEmptyNestedFolders(pruned, roots);
  return { byteSize, fileName, kind: 'adopted', sourceRemoved };
};

const ensureDownloadsDirectory = async (documentDirectory: string): Promise<boolean> => {
  const directory = downloadsDirectoryUri(documentDirectory);
  try {
    const stat = await statPath(directory);
    if (stat.status === 'directory') {
      return true;
    }
    if (stat.status === 'file') {
      return false;
    }
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
    return true;
  } catch {
    const stat = await statPath(directory);
    return stat.status === 'directory';
  }
};

const adoptFromContentUri = async (
  located: FoundFile,
  storedName: string,
  targetUri: string,
  roots: V4DownloadRoots
): Promise<V4AdoptResult> => {
  const source = await statPath(located.file.uri);
  if (source.status === 'missing' || source.status === 'directory') {
    return { kind: 'failed', reason: 'source_missing' };
  }
  const sourceSize = source.status === 'file' ? source.size : located.file.byteSize;
  if (sourceSize !== null && !(await hasFreeSpace(sourceSize))) {
    return { kind: 'failed', reason: 'insufficient_space' };
  }
  try {
    await FileSystem.copyAsync({ from: located.file.uri, to: targetUri });
  } catch {
    await deletePartialFile(targetUri);
    const sourceAfter = await statPath(located.file.uri);
    if (sourceAfter.status === 'missing' || sourceAfter.status === 'directory') {
      return { kind: 'failed', reason: 'source_missing' };
    }
    return { kind: 'failed', reason: 'copy_failed' };
  }
  const copied = await statPath(targetUri);
  if (copied.status !== 'file' || copied.size <= 0) {
    await deletePartialFile(targetUri);
    return { kind: 'failed', reason: 'copy_failed' };
  }
  const sourceRemoved = await deleteUri(located.file.uri);
  return finishAdopted(storedName, copied.size, sourceRemoved, located, roots, targetUri);
};

const adoptFromFileUri = async (
  located: FoundFile,
  storedName: string,
  targetUri: string,
  roots: V4DownloadRoots
): Promise<V4AdoptResult> => {
  const sourceUri = located.file.uri;
  const source = await statPath(sourceUri);
  if (source.status === 'missing' || source.status === 'directory') {
    return { kind: 'failed', reason: 'source_missing' };
  }
  const sourceSize = source.status === 'file' ? source.size : located.file.byteSize;
  try {
    await FileSystem.moveAsync({ from: sourceUri, to: targetUri });
    const moved = await statPath(targetUri);
    const byteSize = moved.status === 'file' ? moved.size : (sourceSize ?? 0);
    return finishAdopted(storedName, byteSize, true, located, roots, targetUri);
  } catch {
    const sourceAfter = await statPath(sourceUri);
    const targetAfter = await statPath(targetUri);
    const sourceGone = sourceAfter.status === 'missing' || sourceAfter.status === 'directory';
    if (targetAfter.status === 'file' && sizesMatch(targetAfter.size, sourceSize) && sourceGone) {
      return finishAdopted(storedName, targetAfter.size, true, located, roots, targetUri);
    }
    if (sourceGone) {
      await deletePartialFile(targetUri);
      return { kind: 'failed', reason: 'source_missing' };
    }
    if (sourceSize !== null && !(await hasFreeSpace(sourceSize))) {
      await deletePartialFile(targetUri);
      return { kind: 'failed', reason: 'insufficient_space' };
    }
    try {
      await FileSystem.copyAsync({ from: sourceUri, to: targetUri });
    } catch {
      await deletePartialFile(targetUri);
      return { kind: 'failed', reason: 'copy_failed' };
    }
    const copied = await statPath(targetUri);
    if (copied.status !== 'file' || !sizesMatch(copied.size, sourceSize)) {
      await deletePartialFile(targetUri);
      return { kind: 'failed', reason: 'copy_failed' };
    }
    const sourceRemoved = await deleteUri(sourceUri);
    return finishAdopted(storedName, copied.size, sourceRemoved, located, roots, targetUri);
  }
};

/**
 * Resolves the folders a pass searches. Returns null when `documentDirectory` is null.
 * iOS searches the documents folder only and ignores the shared-folder value. Android searches
 * the external files folder (when present), then documents, then cache.
 */
export const resolveV4DownloadRoots = async (
  sharedFolderValue: string | null
): Promise<V4DownloadRoots | null> => {
  try {
    const documentDirectory = FileSystem.documentDirectory;
    if (documentDirectory === null || documentDirectory === '') {
      return null;
    }
    const documentsUri = withTrailingSlash(documentDirectory);
    if (Platform.OS !== 'android') {
      return {
        documentDirectory: documentsUri,
        fileRoots: [{ kind: 'app_documents', uri: documentsUri }],
        sharedFolder: null,
      };
    }

    const fileRoots: { kind: V4FileRootKind; uri: string }[] = [];
    const externalPath = await getAndroidExternalFilesDirectory();
    if (externalPath !== null && externalPath !== '') {
      fileRoots.push({ kind: 'app_external_files', uri: fileUriForAbsolutePath(externalPath) });
    }
    fileRoots.push({ kind: 'app_documents', uri: documentsUri });
    const cacheDirectory = FileSystem.cacheDirectory;
    if (cacheDirectory !== null && cacheDirectory !== '') {
      fileRoots.push({ kind: 'app_cache', uri: withTrailingSlash(cacheDirectory) });
    }
    return {
      documentDirectory: documentsUri,
      fileRoots,
      sharedFolder: classifyV4SharedFolder(sharedFolderValue),
    };
  } catch {
    return null;
  }
};

/**
 * Finds a staged file. An adopted file already under `downloads/` wins. An unsafe key is
 * `not_found` without a disk read. An orphan entry checks only its root. Otherwise every file
 * root is checked, then the shared folder. The first match is `file`; the rest are duplicates.
 * A shared folder that cannot be read still yields `found` when another place had a match.
 */
export const locateV4DownloadFile = async (
  entry: V4LocateEntry,
  roots: V4DownloadRoots
): Promise<V4LocateResult> => {
  try {
    const adopted = await locateAlreadyAdopted(entry.adoptedFileName, roots.documentDirectory);
    if (adopted !== null) {
      return adopted;
    }
    if (!isSafeV4FileKey(entry.fileKey)) {
      return { kind: 'not_found' };
    }

    const matches: V4LocatedFile[] = [];
    if (entry.orphanRoot !== null) {
      const root = roots.fileRoots.find((item) => item.kind === entry.orphanRoot);
      if (root === undefined) {
        return { kind: 'not_found' };
      }
      const file = await readRootFile(root, entry.fileKey);
      if (file === null) {
        return { kind: 'not_found' };
      }
      return { duplicates: [], file, kind: 'found' };
    }

    for (const root of roots.fileRoots) {
      const file = await readRootFile(root, entry.fileKey);
      if (file !== null) {
        matches.push(file);
      }
    }
    const shared = await searchSharedFolder(roots, entry.fileKey);
    matches.push(...shared.files);
    const first = matches[0];
    if (first !== undefined) {
      return { duplicates: matches.slice(1), file: first, kind: 'found' };
    }
    if (shared.problem !== null) {
      return { kind: 'unreachable', reason: shared.problem };
    }
    return { kind: 'not_found' };
  } catch {
    if (entry.orphanRoot === null && roots.sharedFolder !== null) {
      const reason =
        roots.sharedFolder.kind === 'unsupported'
          ? 'shared_folder_unsupported'
          : 'shared_folder_unreadable';
      return { kind: 'unreachable', reason };
    }
    return { kind: 'not_found' };
  }
};

/**
 * Copies a located file into `downloads/` under `targetFileName`. The name must already be a
 * stored download file name. An existing target is left untouched. A shared-folder document is
 * copied and must land non-empty. An app-folder file is moved, and a failed move is copied once
 * free space covers the source.
 */
export const adoptV4DownloadFile = async (
  located: FoundFile,
  targetFileName: string,
  roots: V4DownloadRoots
): Promise<V4AdoptResult> => {
  try {
    if (targetFileName === '' || toStoredDownloadFileName(targetFileName) !== targetFileName) {
      return { kind: 'failed', reason: 'invalid_target' };
    }
    if (!(await ensureDownloadsDirectory(roots.documentDirectory))) {
      return { kind: 'failed', reason: 'copy_failed' };
    }
    const targetUri = joinUnderRoot(downloadsDirectoryUri(roots.documentDirectory), targetFileName);
    const target = await statPath(targetUri);
    if (target.status === 'file' || target.status === 'directory') {
      return { fileName: targetFileName, kind: 'target_exists' };
    }
    if (target.status === 'unreadable') {
      return { kind: 'failed', reason: 'copy_failed' };
    }
    if (located.file.uri.startsWith('content://')) {
      return adoptFromContentUri(located, targetFileName, targetUri, roots);
    }
    return adoptFromFileUri(located, targetFileName, targetUri, roots);
  } catch {
    return { kind: 'failed', reason: 'copy_failed' };
  }
};

/** Deletes the located file and every duplicate. `bytes` sums the known sizes that were removed. */
export const deleteV4DownloadFile = async (
  located: FoundFile,
  roots: V4DownloadRoots
): Promise<V4DeleteResult> => {
  const files = [located.file, ...located.duplicates];
  let deletedCount = 0;
  let bytes = 0;
  let failed = false;
  const removed: V4LocatedFile[] = [];
  try {
    for (const file of files) {
      if (await deleteUri(file.uri)) {
        deletedCount += 1;
        bytes += file.byteSize ?? 0;
        removed.push(file);
      } else {
        failed = true;
      }
    }
    await pruneEmptyNestedFolders(removed, roots);
  } catch {
    failed = true;
  }
  if (failed) {
    return { deletedCount, kind: 'failed' };
  }
  return { bytes, kind: 'deleted' };
};

/**
 * Top-level media files in the external files folder and the documents folder whose names are
 * not already known. The cache folder and the shared folder are not scanned. A root that fails
 * to list contributes nothing.
 */
export const listV4OrphanFiles = async (
  roots: V4DownloadRoots,
  knownFileKeys: ReadonlySet<string>
): Promise<V4OrphanFile[]> => {
  const orphans: V4OrphanFile[] = [];
  try {
    for (const root of roots.fileRoots) {
      if (root.kind !== 'app_external_files' && root.kind !== 'app_documents') {
        continue;
      }
      let names: string[];
      try {
        names = await FileSystem.readDirectoryAsync(root.uri);
      } catch {
        continue;
      }
      for (const name of names) {
        if (!isV4OrphanMediaName(name) || knownFileKeys.has(name)) {
          continue;
        }
        const stat = await statPath(joinUnderRoot(root.uri, name));
        if (stat.status !== 'file') {
          continue;
        }
        orphans.push({ fileKey: name, root: root.kind });
      }
    }
  } catch {
    return orphans;
  }
  return orphans;
};
