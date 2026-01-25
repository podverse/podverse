export interface SearchPodcastsFeedFunding {
	url: string;
	message: string;
}

export interface SearchPodcastsFeedCategories {
	[id: string]: string;
}

export interface SearchPodcastsFeed {
	id: number;
	title: string;
	url: string;
	originalUrl: string;
	link: string;
	description: string;
	author: string;
	ownerName: string;
	image: string;
	artwork: string;
	lastUpdateTime: number;
	lastCrawlTime: number;
	lastParseTime: number;
	inPollingQueue: number;
	priority: number;
	lastGoodHttpStatusTime: number;
	lastHttpStatus: number;
	contentType: string;
	itunesId: number;
	generator: string;
	language: string;
	type: number;
	dead: number;
	crawlErrors: number;
	parseErrors: number;
	categories: SearchPodcastsFeedCategories;
	locked: number;
	explicit: boolean;
	podcastGuid: string;
	medium: string;
	episodeCount: number;
	imageUrlHash: number;
	newestItemPubdate: number;
	funding: SearchPodcastsFeedFunding;
}

export interface PodcastIndexSearchPodcastsResponse {
	status: string; // e.g. "true"
	feeds: SearchPodcastsFeed[];
	count: number;
	query: string;
	description: string; // e.g. "Found matching feeds."
}
