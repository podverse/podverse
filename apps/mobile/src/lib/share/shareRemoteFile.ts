import * as FileSystem from 'expo-file-system';
import { Share } from 'react-native';

import { isMobileE2eFromEnv } from '../../config/env';

const fallbackFilename = (url: string): string => {
  try {
    const path = new URL(url).pathname;
    const segments = path.split('/').filter((segment) => segment.length > 0);
    const last = segments[segments.length - 1];
    if (last !== undefined && last.includes('.')) {
      return last;
    }
  } catch {
    // Not a parseable URL; use a generic name.
  }

  return 'image.jpg';
};

/**
 * Download a remote file into the cache directory and present the OS share sheet so the user can
 * save, copy, or send it. Episode offline downloads stay in `downloads/downloadManager`.
 */
export async function shareRemoteFile(remoteUrl: string): Promise<void> {
  const baseDirectory = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (baseDirectory === null) {
    return;
  }

  const filename = fallbackFilename(remoteUrl);
  const result = await FileSystem.downloadAsync(remoteUrl, `${baseDirectory}${filename}`);
  if (result.status !== 200) {
    return;
  }

  if (isMobileE2eFromEnv()) {
    return;
  }

  await Share.share({ title: filename, url: result.uri });
}
