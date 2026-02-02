import type { FeedObject } from 'podverse-partytime';
import { Phase4Medium } from 'podverse-partytime';
import type { Phase4PodcastImage } from 'podverse-partytime/dist/parser/phase/phase-4.js';
import {
  createSortableTitle,
  DATABASE_CONSTANTS,
  getChannelItunesTypeItunesTypeEnumValue,
  getBooleanOrNull,
  getCategoryEnumValue,
  getMediumEnumValue,
} from '@podverse/helpers';
import { isValidHttpUrl } from '@podverse/helpers-validation';
import { compatChannelValue } from '@parser/lib/compat/partytime/value.js';
import { detectDuckTypedPublisherMediumId } from './publisher.js';

export const compatChannelDto = (parsedFeed: FeedObject) => {
  let medium_id = getMediumEnumValue(parsedFeed.medium ?? Phase4Medium.Podcast);
  const detected = detectDuckTypedPublisherMediumId(parsedFeed);
  if (detected !== null) {
    medium_id = detected;
  }

  return {
    podcast_guid: parsedFeed.guid?.slice(0, DATABASE_CONSTANTS.varchar_guid) || null,
    title: parsedFeed.title?.slice(0, DATABASE_CONSTANTS.varchar_normal) || null,
    sortable_title:
      createSortableTitle(parsedFeed.title)?.slice(0, DATABASE_CONSTANTS.varchar_short) || null,
    medium_id,
  };
};

export const compatChannelAboutDto = (parsedFeed: FeedObject) => ({
  author:
    (Array.isArray(parsedFeed.author)
      ? parsedFeed.author
      : parsedFeed.author
        ? [parsedFeed.author]
        : []
    )
      ?.join(', ')
      ?.slice(0, DATABASE_CONSTANTS.varchar_normal) || null,
  explicit: getBooleanOrNull(parsedFeed.explicit),
  language: parsedFeed.language?.slice(0, DATABASE_CONSTANTS.varchar_short) || null,
  website_link_url:
    (isValidHttpUrl(parsedFeed.link) &&
      parsedFeed.link?.slice(0, DATABASE_CONSTANTS.varchar_url)) ||
    null,
  itunes_type: getChannelItunesTypeItunesTypeEnumValue(parsedFeed.itunesType || 'episodic'),
  episode_count: parsedFeed.items?.length || 0,
  last_pub_date: (() => {
    const itemsWithPubDate = parsedFeed.items?.filter((item) => !!item.pubDate) || [];
    const firstItem = itemsWithPubDate[0];
    if (itemsWithPubDate.length === 0 || !firstItem || !firstItem.pubDate) {
      return null;
    }
    const latestDate = itemsWithPubDate.reduce((latest, item) => {
      const itemDate = new Date(item.pubDate ?? '');
      return itemDate > latest ? itemDate : latest;
    }, new Date(firstItem.pubDate));
    return isNaN(latestDate.getTime()) ? null : latestDate;
  })(),
});

export const compatChannelCategoryDtos = (parsedFeed: FeedObject) => {
  return (
    parsedFeed.itunesCategory
      ?.map((category) => {
        let processedCategory = category.toLowerCase();
        if (processedCategory.includes('>')) {
          processedCategory = (processedCategory.split('>').pop() ?? '').trim();
        }
        processedCategory = processedCategory
          .replace(/&amp;|&/g, 'and')
          .replace(/-/g, '')
          .replace(/\s+/g, '');
        const category_id = getCategoryEnumValue(processedCategory);
        return category_id ? { category_id } : null;
      })
      .filter((category) => category !== null) || []
  );
};

export const compatChannelChatDto = (parsedFeed: FeedObject) => {
  if (!parsedFeed.chat || !parsedFeed.chat.server) {
    return null;
  }
  return {
    server: parsedFeed.chat.server.slice(0, DATABASE_CONSTANTS.varchar_fqdn),
    protocol: parsedFeed.chat.protocol.slice(0, DATABASE_CONSTANTS.varchar_short),
    account_id: parsedFeed.chat.accountId?.slice(0, DATABASE_CONSTANTS.varchar_normal) ?? null,
    space: parsedFeed.chat.space?.slice(0, DATABASE_CONSTANTS.varchar_normal) ?? null,
  };
};

export const compatChannelDescriptionDto = (parsedFeed: FeedObject) => {
  if (!parsedFeed.description) {
    return null;
  }
  return {
    value: parsedFeed.description.slice(0, DATABASE_CONSTANTS.varchar_long),
  };
};

export const compatChannelFundingDtos = (parsedFeed: FeedObject) => {
  const dtos = [];

  if (Array.isArray(parsedFeed.podcastFunding)) {
    for (const f of parsedFeed.podcastFunding) {
      if (isValidHttpUrl(f.url)) {
        dtos.push({
          url: f.url?.slice(0, DATABASE_CONSTANTS.varchar_url),
          title: f.message?.slice(0, DATABASE_CONSTANTS.varchar_normal) || null,
        });
      }
    }
  }

  return dtos;
};

export const compatChannelImageDtos = (parsedFeed: FeedObject) => {
  const dtos: { url: string; image_width_size: number | null }[] = [];
  if (isValidHttpUrl(parsedFeed.itunesImage) && parsedFeed.itunesImage) {
    dtos.push({
      url: parsedFeed.itunesImage.slice(0, DATABASE_CONSTANTS.varchar_url),
      image_width_size: null,
    });
  } else if (isValidHttpUrl(parsedFeed.image?.url) && parsedFeed.image?.url) {
    dtos.push({
      url: parsedFeed.image.url.slice(0, DATABASE_CONSTANTS.varchar_url),
      image_width_size: null,
    });
  }

  function hasWidth(image: Phase4PodcastImage['parsed']): image is { url: string; width: number } {
    return (image as { width: number }).width !== undefined;
  }

  if (Array.isArray(parsedFeed.podcastImages)) {
    for (const image of parsedFeed.podcastImages) {
      if (image.parsed.url && hasWidth(image.parsed)) {
        dtos.push({
          url: image.parsed.url.slice(0, DATABASE_CONSTANTS.varchar_url),
          image_width_size: image.parsed.width,
        });
      }
    }
  }

  return dtos;
};

export const compatChannelLicenseDto = (parsedFeed: FeedObject) => {
  if (!parsedFeed?.license?.identifier) {
    return null;
  }
  return {
    identifier: parsedFeed.license.identifier.slice(0, DATABASE_CONSTANTS.varchar_normal),
    url:
      (isValidHttpUrl(parsedFeed.license.url) &&
        parsedFeed.license.url?.slice(0, DATABASE_CONSTANTS.varchar_url)) ||
      null,
  };
};

export const compatChannelLocationDto = (parsedFeed: FeedObject) => {
  if (!parsedFeed?.podcastLocation?.geo && !parsedFeed?.podcastLocation?.osm) {
    return null;
  }

  return {
    geo: parsedFeed.podcastLocation.geo?.slice(0, DATABASE_CONSTANTS.varchar_normal) || null,
    osm: parsedFeed.podcastLocation.osm?.slice(0, DATABASE_CONSTANTS.varchar_normal) || null,
    name: parsedFeed.podcastLocation.name?.slice(0, DATABASE_CONSTANTS.varchar_normal) || null,
  };
};

export const compatChannelPersonDtos = (parsedFeed: FeedObject) => {
  const dtos = [];

  if (Array.isArray(parsedFeed.podcastPeople)) {
    for (const p of parsedFeed.podcastPeople) {
      if (p.name) {
        dtos.push({
          name: p.name.slice(0, DATABASE_CONSTANTS.varchar_normal),
          role: p.role?.toLowerCase()?.slice(0, DATABASE_CONSTANTS.varchar_normal) || null,
          person_group:
            p.group?.toLowerCase()?.slice(0, DATABASE_CONSTANTS.varchar_normal) || 'cast',
          img: (isValidHttpUrl(p.img) && p.img?.slice(0, DATABASE_CONSTANTS.varchar_url)) || null,
          href:
            (isValidHttpUrl(p.href) && p.href?.slice(0, DATABASE_CONSTANTS.varchar_url)) || null,
        });
      }
    }
  }

  return dtos;
};

export const compatChannelPodrollRemoteItemDtos = (parsedFeed: FeedObject) => {
  const dtos = [];
  if (Array.isArray(parsedFeed.podroll)) {
    for (const ri of parsedFeed.podroll) {
      if (ri.feedGuid) {
        dtos.push({
          feed_guid: ri.feedGuid.slice(0, DATABASE_CONSTANTS.varchar_guid),
          feed_url:
            (isValidHttpUrl(ri.feedUrl) && ri.feedUrl?.slice(0, DATABASE_CONSTANTS.varchar_url)) ||
            null,
          item_guid: null,
          title: /* PTDO: ri.title || */ null,
        });
      }
    }
  }

  return dtos;
};

export const compatChannelPublisherRemoteItemDtos = (parsedFeed: FeedObject) => {
  const dtos = [];
  const publisherRemoteItem = parsedFeed.podcastPublisher;
  if (publisherRemoteItem?.feedGuid) {
    dtos.push({
      feed_guid: publisherRemoteItem.feedGuid.slice(0, DATABASE_CONSTANTS.varchar_guid),
      feed_url:
        (isValidHttpUrl(publisherRemoteItem.feedUrl) &&
          publisherRemoteItem.feedUrl?.slice(0, DATABASE_CONSTANTS.varchar_url)) ||
        null,
      item_guid: null,
      title: /* PTDO: ri.title || */ null,
    });
  }

  return dtos;
};

export const compatChannelRemoteItemDtos = (parsedFeed: FeedObject) => {
  const dtos = [];

  if (Array.isArray(parsedFeed.podcastRemoteItems)) {
    for (const ri of parsedFeed.podcastRemoteItems) {
      if (ri.feedGuid) {
        dtos.push({
          feed_guid: ri.feedGuid.slice(0, DATABASE_CONSTANTS.varchar_guid),
          feed_url:
            (isValidHttpUrl(ri.feedUrl) && ri.feedUrl?.slice(0, DATABASE_CONSTANTS.varchar_url)) ||
            null,
          item_guid: null,
          title: /* PTDO: ri.title || */ null,
        });
      }
    }
  }

  return dtos;
};

export const compatChannelSocialInteractDtos = (parsedFeed: FeedObject) => {
  const dtos = [];

  if (parsedFeed?.podcastSocial?.length) {
    for (const ps of parsedFeed.podcastSocial) {
      dtos.push({
        // PTDO: fix keys mismatch between partytime and podverse
        protocol: ps.platform.slice(0, DATABASE_CONSTANTS.varchar_short),
        uri: ps.url.slice(0, DATABASE_CONSTANTS.varchar_uri),
        account_id: ps.id?.slice(0, DATABASE_CONSTANTS.varchar_normal) || null,
        account_url:
          (isValidHttpUrl(ps.url) && ps.url?.slice(0, DATABASE_CONSTANTS.varchar_url)) || null,
        priority: ps.priority || null,
      });
    }
  }

  return dtos;
};

export const compatChannelSeasonDtos = (parsedFeed: FeedObject) => {
  const dtos = [];

  const parsedItems = parsedFeed?.items || [];

  const seasonsIndex: { [key: number]: { name: string | null } } = {};

  for (const parsedItem of parsedItems) {
    const seasonNumber = parsedItem?.podcastSeason?.number || parsedItem?.itunesSeason;
    const seasonName = parsedItem?.podcastSeason?.name || null;
    if (Number.isInteger(seasonNumber)) {
      const seasonNumberAsNumber = seasonNumber as number;
      seasonsIndex[seasonNumberAsNumber] = {
        name: seasonName?.slice(0, DATABASE_CONSTANTS.varchar_normal) || null,
      };
    }
  }

  for (const [number, { name }] of Object.entries(seasonsIndex)) {
    dtos.push({
      number: parseInt(number),
      name: name || null,
    });
  }

  return dtos;
};

export const compatChannelTrailerDtos = (parsedFeed: FeedObject) => {
  const dtos = [];
  if (parsedFeed?.trailers?.length) {
    for (const pt of parsedFeed.trailers) {
      if (isValidHttpUrl(pt.url)) {
        dtos.push({
          url: pt.url.slice(0, DATABASE_CONSTANTS.varchar_url),
          title: /* PTDO: add pt.title || */ null,
          pub_date: pt.pubdate,
          length: pt.length || null,
          type: pt.type?.slice(0, DATABASE_CONSTANTS.varchar_short) || null,
          season: pt.season || null,
        });
      }
    }
  }

  return dtos;
};

export const compatChannelTxtDtos = (parsedFeed: FeedObject) => {
  const dtos = [];
  if (parsedFeed?.podcastTxt?.length) {
    for (const pt of parsedFeed.podcastTxt) {
      dtos.push({
        purpose: pt.purpose?.slice(0, DATABASE_CONSTANTS.varchar_normal) || null,
        value: pt.value.slice(0, DATABASE_CONSTANTS.varchar_long),
      });
    }
  }

  return dtos;
};

export const compatChannelValueDtos = (parsedFeed: FeedObject) => {
  const dtos = [];
  if (parsedFeed.value) {
    const dto = compatChannelValue(parsedFeed.value);

    const formattedDto = {
      channel_value: {
        type: dto.type.slice(0, DATABASE_CONSTANTS.varchar_short),
        method: dto.method.slice(0, DATABASE_CONSTANTS.varchar_short),
        suggested: dto.suggested || null,
      },
      channel_value_recipients: dto.channel_value_recipients,
    };

    dtos.push(formattedDto);
  }
  return dtos;
};
