import { FeedObject } from 'podverse-partytime';
import { getMediumEnumValue } from '@podverse/helpers';

// Determine the most-appropriate publisher medium based on podcastRemoteItems
export const detectDuckTypedPublisherMediumId = (parsedFeed: FeedObject) => {
  const mediumRaw = parsedFeed.medium;
  const isPublisher = (typeof mediumRaw === 'string' && mediumRaw.toLowerCase() === 'publisher');

  if (!isPublisher) {return null;}

  let countPodcast = 0;
  let countVideo = 0;
  let countMusic = 0;

  if (Array.isArray(parsedFeed.podcastRemoteItems)) {
    for (const ri of parsedFeed.podcastRemoteItems) {
      const m = (ri?.medium || '').toString().toLowerCase();
      if (!m) {continue;}
      if (m.includes('music')) {countMusic++;}
      else if (m.includes('video')) {countVideo++;}
      else if (m.includes('podcast')) {countPodcast++;}
    }
  }

  const maxCount = Math.max(countPodcast, countVideo, countMusic);
  if (maxCount === 0) {
    return getMediumEnumValue('podcast');
  } else if (maxCount === countVideo) {
    return getMediumEnumValue('publishervideo');
  } else if (maxCount === countMusic) {
    return getMediumEnumValue('publishermusic');
  }
  return getMediumEnumValue('publisherpodcast');
};
