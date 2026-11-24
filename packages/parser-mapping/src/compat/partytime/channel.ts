import type {
  DescriptionLengthTierEnum,
  PreparedDescription,
  RemoteItemDto,
} from '@podverse/helpers';
import {
  createSortableTitle,
  DATABASE_CONSTANTS,
  getBooleanOrNull,
  getCategoryEnumValue,
  getChannelItunesTypeItunesTypeEnumValue,
  getMediumEnumValue,
  pickChannelDescriptionSource,
  prepareDescriptionForStorage,
} from '@podverse/helpers';
import { isValidHttpUrl } from '@podverse/helpers-validation';

import type {
  Episode,
  FeedObject,
  Phase4PodcastImage,
  PodcastPublisherClaim,
} from '../../types/partytime.js';
import { Phase4Medium } from '../../types/partytime.js';
import { detectDuckTypedPublisherMediumId } from './publisher.js';
import { compatChannelValue, expandPhase4Values, sortValueBlocksByMethod } from './value.js';

export const compatChannelDto = (parsedFeed: FeedObject) => {
  // TODO: tighten medium type once partytime enum is modeled locally
  const mediumRaw =
    typeof parsedFeed.medium === 'string' ? parsedFeed.medium : Phase4Medium.Podcast;
  let medium_id = getMediumEnumValue(mediumRaw);
  const detected = detectDuckTypedPublisherMediumId(parsedFeed);
  if (detected !== null) {
    medium_id = detected;
  }

  return {
    podcast_guid: parsedFeed.guid?.slice(0, DATABASE_CONSTANTS.varchar_guid) || null,
    title: parsedFeed.title?.slice(0, DATABASE_CONSTANTS.varchar_normal) || null,
    sortable_title:
      createSortableTitle(parsedFeed.title ?? '').slice(0, DATABASE_CONSTANTS.varchar_short) ||
      null,
    medium_id,
  };
};

function isValidDate(value: Date | undefined): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

function latestValidItemPubDate(items: Episode[] | undefined): Date | null {
  const itemsWithPubDate = items?.filter((item) => !!item.pubDate) ?? [];
  const firstItem = itemsWithPubDate[0];
  if (!firstItem?.pubDate) {
    return null;
  }
  const latestDate = itemsWithPubDate.reduce((latest, item) => {
    const itemDate = new Date(item.pubDate ?? '');
    return itemDate > latest ? itemDate : latest;
  }, new Date(firstItem.pubDate));
  return isValidDate(latestDate) ? latestDate : null;
}

function firstValidFeedDate(parsedFeed: FeedObject): Date | null {
  const candidates = [parsedFeed.lastPubDate, parsedFeed.pubDate, parsedFeed.lastBuildDate];
  return candidates.find(isValidDate) ?? null;
}

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
  explicit: getBooleanOrNull(parsedFeed.explicit ?? null),
  language: parsedFeed.language?.slice(0, DATABASE_CONSTANTS.varchar_short) || null,
  website_link_url:
    (isValidHttpUrl(parsedFeed.link) &&
      parsedFeed.link?.slice(0, DATABASE_CONSTANTS.varchar_url)) ||
    null,
  itunes_type: getChannelItunesTypeItunesTypeEnumValue(parsedFeed.itunesType || 'episodic'),
  episode_count: parsedFeed.items?.length || 0,
  last_pub_date: latestValidItemPubDate(parsedFeed.items) ?? firstValidFeedDate(parsedFeed),
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
  // TODO: tighten chat shape once Phase7Chat is fully modeled
  if (!parsedFeed.chat || !parsedFeed.chat.server || !parsedFeed.chat.protocol) {
    return null;
  }
  return {
    server: parsedFeed.chat.server.slice(0, DATABASE_CONSTANTS.varchar_fqdn),
    protocol: parsedFeed.chat.protocol.slice(0, DATABASE_CONSTANTS.varchar_short),
    account_id: parsedFeed.chat.accountId?.slice(0, DATABASE_CONSTANTS.varchar_normal) ?? null,
    space: parsedFeed.chat.space?.slice(0, DATABASE_CONSTANTS.varchar_normal) ?? null,
  };
};

export const compatChannelDescriptionDto = (
  parsedFeed: FeedObject,
  tier: DescriptionLengthTierEnum
): PreparedDescription | null => {
  const source = pickChannelDescriptionSource({
    descriptionRaw: parsedFeed.descriptionRaw ?? undefined,
    description: parsedFeed.description ?? undefined,
  });
  return prepareDescriptionForStorage(source, tier);
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
          item_guid: ri.itemGuid?.slice(0, DATABASE_CONSTANTS.varchar_uri) ?? null,
          title: ri.title?.slice(0, DATABASE_CONSTANTS.varchar_normal) ?? null,
          medium_id: ri.medium ? getMediumEnumValue(ri.medium) : null,
        });
      }
    }
  }

  return dtos;
};

function publisherClaims(parsedFeed: FeedObject): PodcastPublisherClaim[] {
  const publisher = parsedFeed.podcastPublisher;
  if (publisher === null || publisher === undefined) {
    return [];
  }
  if (Array.isArray(publisher)) {
    return publisher;
  }
  return [publisher];
}

function compatPublisherClaimDto(claim: PodcastPublisherClaim): RemoteItemDto | null {
  if (!claim.feedGuid) {
    return null;
  }
  return {
    feed_guid: claim.feedGuid.slice(0, DATABASE_CONSTANTS.varchar_guid),
    feed_url:
      (isValidHttpUrl(claim.feedUrl) && claim.feedUrl?.slice(0, DATABASE_CONSTANTS.varchar_url)) ||
      null,
    item_guid: claim.itemGuid?.slice(0, DATABASE_CONSTANTS.varchar_uri) ?? null,
    title: claim.title?.slice(0, DATABASE_CONSTANTS.varchar_normal) ?? null,
    medium_id: claim.medium ? getMediumEnumValue(claim.medium) : null,
  };
}

/**
 * Feed order, first claim wins. A later claim with the same feed guid (ignoring case) and the
 * same item guid is dropped so one publisher stays primary.
 */
function publisherClaimIdentity(feedGuid: string, itemGuid: string | null): string {
  return JSON.stringify([feedGuid.toLowerCase(), itemGuid]);
}

export const compatChannelPublisherRemoteItemDtos = (parsedFeed: FeedObject): RemoteItemDto[] => {
  const dtos: RemoteItemDto[] = [];
  const seen = new Set<string>();
  for (const claim of publisherClaims(parsedFeed)) {
    const dto = compatPublisherClaimDto(claim);
    if (dto === null) {
      continue;
    }
    const identity = publisherClaimIdentity(dto.feed_guid, dto.item_guid);
    if (seen.has(identity)) {
      continue;
    }
    seen.add(identity);
    dtos.push(dto);
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
          item_guid: ri.itemGuid?.slice(0, DATABASE_CONSTANTS.varchar_uri) ?? null,
          title: ri.title?.slice(0, DATABASE_CONSTANTS.varchar_normal) ?? null,
          medium_id: ri.medium ? getMediumEnumValue(ri.medium) : null,
        });
      }
    }
  }

  return dtos;
};

function mapSocialInteractToDto(ps: {
  platform: string;
  url: string;
  id?: string | null;
  profileUrl?: string | null;
  priority?: number | null;
}) {
  return {
    protocol: ps.platform.slice(0, DATABASE_CONSTANTS.varchar_short),
    uri: ps.url.slice(0, DATABASE_CONSTANTS.varchar_uri),
    account_id: ps.id?.slice(0, DATABASE_CONSTANTS.varchar_normal) || null,
    account_url:
      (ps.profileUrl &&
        isValidHttpUrl(ps.profileUrl) &&
        ps.profileUrl.slice(0, DATABASE_CONSTANTS.varchar_url)) ||
      null,
    priority: ps.priority ?? null,
  };
}

export const compatChannelSocialInteractDtos = (parsedFeed: FeedObject) => {
  const dtos: Array<{
    protocol: string;
    uri: string;
    account_id: string | null;
    account_url: string | null;
    priority: number | null;
  }> = [];

  if (parsedFeed?.channelPodcastSocialInteract?.length) {
    for (const ps of parsedFeed.channelPodcastSocialInteract) {
      dtos.push(mapSocialInteractToDto(ps));
    }
  } else if (parsedFeed?.podcastSocial?.length) {
    for (const ps of parsedFeed.podcastSocial) {
      dtos.push(
        mapSocialInteractToDto({
          ...ps,
          profileUrl: null,
        })
      );
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
  const dtos = expandPhase4Values(parsedFeed.values ?? []).map((value) => {
    const dto = compatChannelValue(value);
    return {
      channel_value: {
        type: dto.type.slice(0, DATABASE_CONSTANTS.varchar_short),
        method: dto.method.slice(0, DATABASE_CONSTANTS.varchar_short),
        suggested: dto.suggested || null,
      },
      channel_value_recipients: dto.channel_value_recipients,
    };
  });
  return sortValueBlocksByMethod(dtos, (dto) => dto.channel_value);
};
