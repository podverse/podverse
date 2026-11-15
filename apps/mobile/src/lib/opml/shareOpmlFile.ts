import * as FileSystem from 'expo-file-system/legacy';
import { Share } from 'react-native';

import { isMobileE2eFromEnv } from '../../config/env';
import { presentShareSheet } from '../share/shareSheetPassthrough';
import { opmlExportFilename } from './opmlExportFile';

/**
 * Write an OPML file into the cache directory and open the share sheet.
 *
 * Returns false when `signal` aborts before the sheet opens. E2E builds write the file and
 * skip the sheet. Callers that leave the screen abort `signal` so a late sheet does not open.
 */
export const shareOpmlFile = async (text: string, signal: AbortSignal): Promise<boolean> => {
  const baseDirectory = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (baseDirectory === null) {
    throw new Error('No writable mobile file-system directory');
  }
  if (signal.aborted) {
    return false;
  }
  const filename = opmlExportFilename(new Date());
  const fileUri = `${baseDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(fileUri, text);
  if (signal.aborted) {
    return false;
  }
  if (!isMobileE2eFromEnv()) {
    await presentShareSheet(() => Share.share({ title: filename, url: fileUri }));
  }
  return !signal.aborted;
};
