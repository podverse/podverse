import { getPodcastIndexService } from '@workers/factories/podcastIndexService';
import { DeduplicatorService } from '@workers/lib/deduplicator';
import fs from 'fs';

const CACHE_FILE_PATH = '/data/dead_feeds_cache.json';

function loadCache(): Set<number> {
  try {
    if (fs.existsSync(CACHE_FILE_PATH)) {
      const raw = fs.readFileSync(CACHE_FILE_PATH, 'utf-8');
      const arr = JSON.parse(raw);
      return new Set<number>(arr);
    }
  } catch (err) {
    console.error('Failed to load cache:', err);
  }
  return new Set<number>();
}

function saveCache(cache: Set<number>) {
  try {
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(Array.from(cache)), 'utf-8');
  } catch (err) {
    console.error('Failed to save cache:', err);
  }
}

export function podcastIndexDeadFeedsDeleteCache() {
  try {
    if (fs.existsSync(CACHE_FILE_PATH)) {
      fs.unlinkSync(CACHE_FILE_PATH);
      console.warn('Cache file deleted.');
    } else {
      console.warn('Cache file does not exist.');
    }
  } catch (err) {
    console.error('Failed to delete cache file:', err);
  }
}

export const podcastIndexDeadFeedsFlagAndMerge = async () => {
  const deduplicatorService = new DeduplicatorService();
  let itemCount = 0;
  const cache = loadCache();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function resolveHandler(data: any) {
    itemCount++;
    const parsedData = getPodcastIndexService().deadFeedsExtractRow(data);
    const { id_to_archive, duplicate_id_to_keep } = parsedData;

    if (cache.has(id_to_archive)) {
      if (itemCount % 100000 === 0) {
        console.warn(`Skipped ${itemCount} feeds. Already handled id_to_archive: ${id_to_archive}`);
      }
      return;
    }

    if (itemCount % 100000 === 0) {
      console.warn(`Processed ${itemCount} feeds. Current parsedData:`, parsedData);
    }
    try {
      await deduplicatorService.handleDuplicatePodcastIndexId(id_to_archive, duplicate_id_to_keep);
      cache.add(id_to_archive);
      if (itemCount % 1000 === 0) {
        saveCache(cache);
      }
    } catch (error) {
      console.error('Error processing dead feed:', error);
      console.error('Data that caused the error:', parsedData);
    }
  }

  await getPodcastIndexService().deadFeedsDownloadAndExtractCSV(resolveHandler);
  saveCache(cache);
};
