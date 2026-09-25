import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { addByRssRequestHeaderAuth } from '../playback/addByRssMediaAuth';

type ResolvedHeaders = { headers: Record<string, string>; key: string };

/**
 * `Authorization` for a protected add-by-RSS feed's artwork, for `CoverImage` `headers`.
 *
 * Android only, and only when the artwork URL is on the feed's domain: expo-image fetches through
 * OkHttp there, which drops the header on a redirect to another host. iOS never reads the stored
 * credentials here (see `decideAddByRssHeaderAuth`). `undefined` until resolved, or when nothing
 * should be sent.
 */
export function useAddByRssArtworkHeaders(
  feedUrl: string | null,
  uri: string | null | undefined
): Record<string, string> | undefined {
  const [resolved, setResolved] = useState<ResolvedHeaders | null>(null);
  const key = feedUrl !== null && uri !== null && uri !== undefined ? `${feedUrl}\n${uri}` : null;

  useEffect(() => {
    if (Platform.OS !== 'android' || key === null || feedUrl === null || !uri) {
      return;
    }
    let active = true;
    void addByRssRequestHeaderAuth(feedUrl, uri).then((decision) => {
      if (active && decision.headers !== null) {
        setResolved({ headers: decision.headers, key });
      }
    });
    return () => {
      active = false;
    };
  }, [feedUrl, key, uri]);

  return resolved !== null && resolved.key === key ? resolved.headers : undefined;
}
