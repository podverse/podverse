import * as FileSystem from 'expo-file-system/legacy';

/**
 * Copies a finished private download into a Storage Access Framework tree.
 * Returns the new document URI, or null when the copy does not land.
 * The private source file stays where it is.
 */
export const copyCompletedDownloadToChosenFolder = async (input: {
  treeUri: string;
  sourceUri: string;
  fileName: string;
  mimeType: string;
  sourceByteSize: number;
}): Promise<string | null> => {
  try {
    const free = await FileSystem.getFreeDiskStorageAsync();
    if (Number.isFinite(free) && free < input.sourceByteSize) {
      return null;
    }
  } catch {
    // Unknown free space still attempts the copy.
  }

  let documentUri: string | null = null;
  try {
    documentUri = await FileSystem.StorageAccessFramework.createFileAsync(
      input.treeUri,
      input.fileName,
      input.mimeType
    );
    await FileSystem.copyAsync({ from: input.sourceUri, to: documentUri });
    const info = await FileSystem.getInfoAsync(documentUri);
    if (!info.exists) {
      await deleteCreatedDocument(documentUri);
      return null;
    }
    // A missing size is accepted. A reported size must match the private file.
    if (typeof info.size === 'number' && info.size !== input.sourceByteSize) {
      await deleteCreatedDocument(documentUri);
      return null;
    }
    return documentUri;
  } catch {
    if (documentUri !== null) {
      await deleteCreatedDocument(documentUri);
    }
    return null;
  }
};

const deleteCreatedDocument = async (uri: string): Promise<void> => {
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // The row keeps the private file when this document is not stored.
  }
};
