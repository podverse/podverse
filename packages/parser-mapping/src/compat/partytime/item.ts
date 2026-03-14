import {
  DATABASE_CONSTANTS,
  formatGuidEnclosureUrl,
  getItemItunesEpisodeTypeEnumValue,
} from '@podverse/helpers';
import { isValidHttpUrl } from '@podverse/helpers-validation';

import type {
  Episode as PartytimeEpisode,
  Phase4PodcastImage,
  Phase4PodcastLiveItem,
} from '../../types/partytime.js';
import { compatItemValue, compatItemValueWithMethodAndRecipients } from './value.js';

type CompatItemDtoOptions = {
  isLiveItem?: boolean;
};

type Episode = PartytimeEpisode | Phase4PodcastLiveItem;

export const compatItemDto = (parsedItem: Episode, options?: CompatItemDtoOptions) => ({
  guid: parsedItem.guid?.slice(0, DATABASE_CONSTANTS.varchar_url) || null,
  guid_enclosure_url:
    (!options?.isLiveItem &&
      isValidHttpUrl(parsedItem.enclosure.url) &&
      formatGuidEnclosureUrl(parsedItem.enclosure.url)) ||
    null,
  pub_date: parsedItem.pubDate || null,
  title: parsedItem.title?.slice(0, DATABASE_CONSTANTS.varchar_normal) || null,
});

export const compatItemAboutDto = (parsedItem: Episode) => ({
  duration: parsedItem.duration?.toFixed(2) || null,
  explicit: parsedItem.explicit || false,
  website_link_url:
    (isValidHttpUrl(parsedItem.link) &&
      parsedItem.link?.slice(0, DATABASE_CONSTANTS.varchar_url)) ||
    null,
  item_itunes_episode_type: getItemItunesEpisodeTypeEnumValue(
    parsedItem.itunesEpisodeType || 'full'
  ),
});

export const compatItemChaptersFeedDto = (parsedItem: Episode) => {
  const chaptersUrl = parsedItem.podcastChapters?.url;
  const chaptersType = parsedItem.podcastChapters?.type;
  if (!chaptersUrl || !isValidHttpUrl(chaptersUrl) || !chaptersType) {
    return null;
  }

  return {
    url: chaptersUrl.slice(0, DATABASE_CONSTANTS.varchar_url),
    type: chaptersType.slice(0, DATABASE_CONSTANTS.varchar_short),
  };
};

export const compatItemChatDto = (parsedItem: Episode) => {
  const chat = parsedItem.chat;
  if (!chat || chat.phase === '4' || !chat.server || !chat.protocol) {
    return null;
  }
  return {
    server: chat.server.slice(0, DATABASE_CONSTANTS.varchar_fqdn),
    protocol: chat.protocol.slice(0, DATABASE_CONSTANTS.varchar_short),
    account_id: chat.accountId?.slice(0, DATABASE_CONSTANTS.varchar_normal) || null,
    space: chat.space?.slice(0, DATABASE_CONSTANTS.varchar_normal) || null,
  };
};

export const compatItemDescriptionDto = (parsedItem: Episode) => {
  if (!parsedItem.description) {
    return null;
  }
  return {
    value: parsedItem.description.slice(0, DATABASE_CONSTANTS.varchar_long),
  };
};

export const compatItemEnclosureDtos = (parsedItem: Episode) => {
  const dtos = [];

  // Create item_enclosure_default dto separately
  if (parsedItem.enclosure.url) {
    const item_enclosure = {
      type: parsedItem.enclosure.type.slice(0, DATABASE_CONSTANTS.varchar_short),
      length: parsedItem.enclosure.length || null,
      bitrate: null,
      height: null,
      language: null,
      title: null,
      rel: null,
      codecs: null,
      item_enclosure_default: true,
    };

    const item_enclosure_integrity = null;

    const item_enclosure_sources = [
      {
        uri: parsedItem.enclosure.url.slice(0, DATABASE_CONSTANTS.varchar_uri),
        content_type: null,
      },
    ];

    const formattedDto = {
      item_enclosure,
      item_enclosure_integrity,
      item_enclosure_sources,
    };

    dtos.push(formattedDto);
  }

  if (parsedItem.alternativeEnclosures && parsedItem.alternativeEnclosures.length > 0) {
    for (const alternativeEnclosure of parsedItem.alternativeEnclosures) {
      const item_enclosure = {
        type: alternativeEnclosure.type.slice(0, DATABASE_CONSTANTS.varchar_short),
        length: alternativeEnclosure.length || null,
        bitrate: alternativeEnclosure.bitrate || null,
        height: alternativeEnclosure.height || null,
        language: alternativeEnclosure.lang?.slice(0, DATABASE_CONSTANTS.varchar_short) || null,
        title: alternativeEnclosure.title?.slice(0, DATABASE_CONSTANTS.varchar_short) || null,
        rel: alternativeEnclosure.rel?.slice(0, DATABASE_CONSTANTS.varchar_short) || null,
        codecs: alternativeEnclosure.codecs?.slice(0, DATABASE_CONSTANTS.varchar_short) || null,
        item_enclosure_default: false,
      };

      const item_enclosure_integrity = alternativeEnclosure.integrity ?? null;

      const item_enclosure_sources = alternativeEnclosure.source.map((source) => ({
        uri: source.uri.slice(0, DATABASE_CONSTANTS.varchar_uri),
        content_type: source.contentType.slice(0, DATABASE_CONSTANTS.varchar_short),
      }));

      const formattedDto = {
        item_enclosure,
        item_enclosure_integrity,
        item_enclosure_sources,
      };

      dtos.push(formattedDto);
    }
  }

  return dtos;
};

export const compatItemImageDtos = (parsedItem: Episode) => {
  const dtos: { url: string; image_width_size: number | null }[] = [];
  if (isValidHttpUrl(parsedItem.itunesImage) && parsedItem.itunesImage) {
    dtos.push({
      url: parsedItem.itunesImage.slice(0, DATABASE_CONSTANTS.varchar_url),
      image_width_size: null,
    });
  } else if (isValidHttpUrl(parsedItem.image) && parsedItem.image) {
    dtos.push({
      url: parsedItem.image.slice(0, DATABASE_CONSTANTS.varchar_url),
      image_width_size: null,
    });
  }

  function hasWidth(image: Phase4PodcastImage['parsed']): image is { url: string; width: number } {
    return (image as { width: number }).width !== undefined;
  }

  if (Array.isArray(parsedItem.podcastImages)) {
    for (const image of parsedItem.podcastImages) {
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

export const compatItemLicenseDto = (parsedItem: Episode) => {
  if (!parsedItem?.license?.identifier) {
    return null;
  }
  return {
    identifier: parsedItem.license.identifier.slice(0, DATABASE_CONSTANTS.varchar_normal),
    url:
      (isValidHttpUrl(parsedItem.license.url) &&
        parsedItem.license.url?.slice(0, DATABASE_CONSTANTS.varchar_url)) ||
      null,
  };
};

export const compatItemLocationDto = (parsedItem: Episode) => {
  if (!parsedItem?.podcastLocation?.geo && !parsedItem?.podcastLocation?.osm) {
    return null;
  }

  return {
    geo: parsedItem.podcastLocation.geo?.slice(0, DATABASE_CONSTANTS.varchar_normal) || null,
    osm: parsedItem.podcastLocation.osm?.slice(0, DATABASE_CONSTANTS.varchar_normal) || null,
    name: parsedItem.podcastLocation.name?.slice(0, DATABASE_CONSTANTS.varchar_normal) || null,
  };
};

export const compatItemPersonDtos = (parsedItem: Episode) => {
  const dtos = [];

  if (Array.isArray(parsedItem.podcastPeople)) {
    for (const p of parsedItem.podcastPeople) {
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

export const compatItemSeasonDto = (parsedItem: Episode) => {
  if (!parsedItem.podcastSeason?.number && !parsedItem.itunesSeason) {
    return null;
  }

  return {
    number: parsedItem.podcastSeason?.number || parsedItem.itunesSeason,
    title: parsedItem.podcastSeason?.name?.slice(0, DATABASE_CONSTANTS.varchar_normal) || null,
  };
};

export const compatItemSeasonEpisodeDto = (parsedItem: Episode) => {
  const episodeNumber = parsedItem.podcastEpisode?.number ?? parsedItem.itunesEpisode;
  if (episodeNumber === undefined || episodeNumber === null) {
    return null;
  }

  return {
    display: parsedItem.podcastEpisode?.display?.slice(0, DATABASE_CONSTANTS.varchar_short) ?? null,
    number: episodeNumber,
  };
};

export const compatItemSocialInteractDtos = (parsedItem: Episode) => {
  const dtos = [];

  if (parsedItem?.podcastSocialInteraction?.length) {
    for (const ps of parsedItem.podcastSocialInteraction) {
      dtos.push({
        // PTDO: fix keys mismatch between partytime and podverse
        protocol: ps.platform.slice(0, DATABASE_CONSTANTS.varchar_short),
        uri: ps.url.slice(0, DATABASE_CONSTANTS.varchar_uri),
        account_id: ps.id?.slice(0, DATABASE_CONSTANTS.varchar_normal) || null,
        account_url:
          (isValidHttpUrl(ps.profileUrl) &&
            ps.profileUrl?.slice(0, DATABASE_CONSTANTS.varchar_url)) ||
          null,
        priority: ps.priority || null,
      });
    }
  }

  return dtos;
};

export const compatItemSoundbiteDtos = (parsedItem: Episode) => {
  const dtos = [];

  if (parsedItem?.podcastSoundbites?.length) {
    for (const s of parsedItem.podcastSoundbites) {
      dtos.push({
        start_time: DATABASE_CONSTANTS.getMediaPlayerNumeric(s.startTime),
        duration: DATABASE_CONSTANTS.getMediaPlayerNumeric(s.duration),
        title: s.title?.slice(0, DATABASE_CONSTANTS.varchar_normal) || null,
      });
    }
  }

  return dtos;
};

export const compatItemTranscriptDtos = (parsedItem: Episode) => {
  const dtos = [];

  if (parsedItem?.podcastTranscripts?.length) {
    for (const t of parsedItem.podcastTranscripts) {
      if (isValidHttpUrl(t.url)) {
        dtos.push({
          url: t.url.slice(0, DATABASE_CONSTANTS.varchar_url),
          type: t.type.slice(0, DATABASE_CONSTANTS.varchar_short),
          language: t.language?.slice(0, DATABASE_CONSTANTS.varchar_short) || null,
          rel: t.rel?.slice(0, 50) || null,
        });
      }
    }
  }

  return dtos;
};

export const compatItemTxtDtos = (parsedItem: Episode) => {
  const dtos = [];

  if (parsedItem?.podcastTxt?.length) {
    for (const txt of parsedItem.podcastTxt) {
      dtos.push({
        purpose: txt.purpose?.slice(0, DATABASE_CONSTANTS.varchar_normal) || null,
        value: txt.value.slice(0, DATABASE_CONSTANTS.varchar_long),
      });
    }
  }

  return dtos;
};

export const compatItemContentLinkDtos = (
  parsedItem: Episode
): { href: string; title: string | null }[] => {
  const dtos: { href: string; title: string | null }[] = [];
  if (!parsedItem.contentLinks?.length) {
    return dtos;
  }
  for (const cl of parsedItem.contentLinks) {
    if (!cl.url || !isValidHttpUrl(cl.url)) {
      continue;
    }
    dtos.push({
      href: cl.url.slice(0, DATABASE_CONSTANTS.varchar_url),
      title: cl.title?.slice(0, DATABASE_CONSTANTS.varchar_normal) ?? null,
    });
  }
  return dtos;
};

const METHOD_PRIORITY_ORDER = ['lnaddress', 'keysend'];

function sortItemValueDtos<T extends { item_value: { type: string; method: string } }>(
  dtos: T[]
): T[] {
  return [...dtos].sort((a, b) => {
    if (a.item_value.type !== 'lightning' || b.item_value.type !== 'lightning') return 0;
    const aIdx = METHOD_PRIORITY_ORDER.indexOf(a.item_value.method);
    const bIdx = METHOD_PRIORITY_ORDER.indexOf(b.item_value.method);
    if (aIdx === -1 && bIdx === -1) return 0;
    if (aIdx === -1) return 1;
    if (bIdx === -1) return -1;
    return aIdx - bIdx;
  });
}

export const compatItemValueDtos = (parsedItem: Episode) => {
  const sourceValues = parsedItem.values ?? [];
  if (sourceValues.length === 0) return [];

  if (sourceValues.length > 1) {
    const dtos = sourceValues.map((value) => {
      const dto = compatItemValue(value);
      return {
        item_value: {
          type: dto.type.slice(0, DATABASE_CONSTANTS.varchar_short),
          method: dto.method.slice(0, DATABASE_CONSTANTS.varchar_short),
          suggested: dto.suggested || null,
        },
        item_value_meta_boost: dto.meta_boost ?? null,
        item_value_recipients: dto.item_value_recipients,
        item_value_time_splits: dto.item_value_time_splits,
      };
    });
    return sortItemValueDtos(dtos);
  }

  const value = sourceValues[0];
  if (!value) return [];

  const type = value.type?.toLowerCase() ?? '';
  const recipients = value.recipients ?? [];
  const hasLnaddress = recipients.some((r) => r.type?.toLowerCase() === 'lnaddress');
  const hasKeysend = recipients.some((r) => r.type?.toLowerCase() !== 'lnaddress');

  if (type === 'lightning' && (hasLnaddress || hasKeysend)) {
    if (hasLnaddress && hasKeysend) {
      const lnaddressRecipients = recipients.filter((r) => r.type?.toLowerCase() === 'lnaddress');
      const keysendRecipients = recipients.filter((r) => r.type?.toLowerCase() !== 'lnaddress');
      const dtos = [];
      for (const [method, filtered] of [
        ['lnaddress', lnaddressRecipients],
        ['keysend', keysendRecipients],
      ] as const) {
        if (filtered.length === 0) continue;
        const dto = compatItemValueWithMethodAndRecipients(value, method, filtered);
        dtos.push({
          item_value: {
            type: dto.type.slice(0, DATABASE_CONSTANTS.varchar_short),
            method: dto.method.slice(0, DATABASE_CONSTANTS.varchar_short),
            suggested: dto.suggested || null,
          },
          item_value_meta_boost: dto.meta_boost ?? null,
          item_value_recipients: dto.item_value_recipients,
          item_value_time_splits: dto.item_value_time_splits,
        });
      }
      return sortItemValueDtos(dtos);
    }
    if (hasLnaddress) {
      const dto = compatItemValueWithMethodAndRecipients(
        value,
        'lnaddress',
        recipients.filter((r) => r.type?.toLowerCase() === 'lnaddress')
      );
      return [
        {
          item_value: {
            type: dto.type.slice(0, DATABASE_CONSTANTS.varchar_short),
            method: dto.method.slice(0, DATABASE_CONSTANTS.varchar_short),
            suggested: dto.suggested || null,
          },
          item_value_meta_boost: dto.meta_boost ?? null,
          item_value_recipients: dto.item_value_recipients,
          item_value_time_splits: dto.item_value_time_splits,
        },
      ];
    }
  }

  const dto = compatItemValue(value);
  return [
    {
      item_value: {
        type: dto.type.slice(0, DATABASE_CONSTANTS.varchar_short),
        method: dto.method.slice(0, DATABASE_CONSTANTS.varchar_short),
        suggested: dto.suggested || null,
      },
      item_value_meta_boost: dto.meta_boost ?? null,
      item_value_recipients: dto.item_value_recipients,
      item_value_time_splits: dto.item_value_time_splits,
    },
  ];
};
