import { CommandLineArgs } from '@workers/commands';
import { loggerService } from '@workers/factories/loggerService';
import { podcastIndexService } from '@workers/factories/podcastIndexService';

const podcastIndexTrendingPodcastsGet = async (args: CommandLineArgs) => {
  try {
    loggerService.info('[podcastIndex/trending/podcastsGet] Starting trending podcasts fetch...');

    let max = 1000;
    let since: number | undefined;
    let lang: string | undefined;
    let cat: string | undefined;

    if ('max' in args) {
      const rawMax = Array.isArray(args.max) ? args.max[0] : args.max;
      const parsedMax = parseInt(rawMax ?? '', 10);
      if (!isNaN(parsedMax) && parsedMax > 0 && parsedMax <= 1000) {
        max = parsedMax;
      }
    }
    if ('since' in args) {
      const rawSince = Array.isArray(args.since) ? args.since[0] : args.since;
      const parsedSince = parseInt(rawSince ?? '', 10);
      if (!isNaN(parsedSince) && parsedSince > 0) {
        since = parsedSince;
      }
    }
    if ('lang' in args) {
      lang = Array.isArray(args.lang) ? args.lang[0] : args.lang;
    }
    if ('cat' in args) {
      cat = Array.isArray(args.cat) ? args.cat[0] : args.cat;
    }

    const { feeds } = await podcastIndexService.trendingGetPodcasts(max, since, lang, cat);

    loggerService.info(
      `[podcastIndex/trending/podcastsGet] Fetched ${feeds.length} trending feeds.`
    );
    loggerService.info('[podcastIndex/trending/podcastsGet] Example feeds:', feeds.slice(0, 3));

    return feeds;
  } catch (error) {
    loggerService.error(
      '[podcastIndex/trending/podcastsGet] Error fetching trending podcasts:',
      error
    );
    throw error;
  }
};

export default podcastIndexTrendingPodcastsGet;
