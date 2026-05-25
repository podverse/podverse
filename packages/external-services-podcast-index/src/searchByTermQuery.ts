export type PodcastIndexSearchByTermOptions = {
  max?: number;
  val?: 'any' | 'lightning' | 'hive' | 'webmonetization';
  aponly?: boolean;
  clean?: boolean;
  similar?: boolean;
  fulltext?: boolean;
  pretty?: boolean;
};

export function buildPodcastIndexSearchByTermQuery(
  term: string,
  options: PodcastIndexSearchByTermOptions = {}
): string {
  const { max = 25, val, aponly, clean, similar, fulltext, pretty } = options;

  const safeMax = Math.min(Math.max(max, 1), 1000);
  const params: string[] = [`q=${encodeURIComponent(term)}`, `max=${safeMax}`];

  if (val) {
    params.push(`val=${encodeURIComponent(val)}`);
  }
  if (aponly) {
    params.push('aponly');
  }
  if (clean) {
    params.push('clean');
  }
  if (similar) {
    params.push('similar');
  }
  if (fulltext) {
    params.push('fulltext');
  }
  if (pretty) {
    params.push('pretty');
  }

  return params.join('&');
}

export function podcastIndexSearchByTermPath(
  baseUrl: string,
  searchPath: '/search/byterm' | '/search/music/byterm',
  term: string,
  options: PodcastIndexSearchByTermOptions = {}
): string {
  const query = buildPodcastIndexSearchByTermQuery(term, options);
  return `${baseUrl}${searchPath}?${query}`;
}
