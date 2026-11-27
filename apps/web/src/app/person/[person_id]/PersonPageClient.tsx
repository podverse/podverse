'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import type {
  DTOPerson,
  DTOPersonChannel,
  DTOPersonItem,
  PersonContentChip,
  StatsPopularityRange,
} from '@podverse/helpers';
import {
  buildAlbumPath,
  buildArtistPath,
  buildEpisodePath,
  buildMusicLivestreamPath,
  buildPodcastLivestreamPath,
  buildPodcastPath,
  buildTrackPath,
  isPersonContentChip,
  MediumEnum,
} from '@podverse/helpers';
import { Button, MainColumnStack, MainHeader, MainSidebarLayout } from '@podverse/ui';

import { Link } from '../../../components/Link/Link';
import { ListSortChip } from '../../../components/ListSortChip/ListSortChip';
import { MainWrapper } from '../../../components/Main/MainWrapper';
import { useAccount } from '../../../contexts/Account';
import { useModals } from '../../../contexts/Modals';
import { getApiRequestService } from '../../../factories/apiRequestService';
import { useMembershipGate } from '../../../hooks/useMembershipGate';
import {
  getParsedLocalSettings,
  getStoredSortPref,
  updateStoredSortPref,
} from '../../../utils/localSettings/localSettings';

type ChannelChip = 'podcasts' | 'albums' | 'artists';
type ItemChip = 'episodes' | 'tracks' | 'livestreams';

function isChannelChip(chip: PersonContentChip): chip is ChannelChip {
  return chip === 'podcasts' || chip === 'albums' || chip === 'artists';
}

function personScope(idText: string) {
  return { kind: 'list' as const, name: `person-${idText}` };
}

function itemPath(chip: ItemChip, item: DTOPersonItem): string {
  if (chip === 'tracks') {
    return buildTrackPath(item.id_text);
  }
  if (chip === 'livestreams') {
    return item.medium_id === MediumEnum.Music || item.medium_id === MediumEnum.MusicL
      ? buildMusicLivestreamPath(item.id_text)
      : buildPodcastLivestreamPath(item.id_text);
  }
  return buildEpisodePath(item.id_text);
}

function channelPath(chip: ChannelChip, channel: DTOPersonChannel): string {
  if (chip === 'albums') {
    return buildAlbumPath(channel.id_text);
  }
  if (chip === 'artists') {
    return buildArtistPath(channel.id_text);
  }
  return buildPodcastPath(channel.id_text);
}

export function PersonPageClient({ person }: { person: DTOPerson }) {
  const tInfo = useTranslations('info');
  const tFilters = useTranslations('filters');
  const tMedia = useTranslations('media');
  const { loggedInAccount } = useAccount();
  const { setModalAuthLogin } = useModals();
  const { tryHandleMembershipGateError } = useMembershipGate();
  const counts = person.counts;
  const chips = (
    [
      ['podcasts', counts?.podcasts ?? 0, tMedia('podcast.podcasts')],
      ['episodes', counts?.episodes ?? 0, tMedia('podcast.episodes')],
      ['artists', counts?.artists ?? 0, tMedia('music.artists')],
      ['albums', counts?.albums ?? 0, tMedia('music.albums')],
      ['tracks', counts?.tracks ?? 0, tMedia('music.tracks')],
      ['livestreams', counts?.livestreams ?? 0, tMedia('livestream.livestreams')],
    ] as const
  ).filter((chip) => chip[1] > 0);
  const firstChip = chips[0]?.[0] ?? null;
  const [selected, setSelected] = useState<PersonContentChip | null>(firstChip);
  const stored = getStoredSortPref(getParsedLocalSettings(), personScope(person.id_text));
  const [sort, setSort] = useState<'recent' | 'top'>(stored?.sort === 'top' ? 'top' : 'recent');
  const [range, setRange] = useState<StatsPopularityRange>(
    stored?.range === 'day' || stored?.range === 'month' || stored?.range === 'all-time'
      ? stored.range
      : 'week'
  );
  const [followed, setFollowed] = useState(person.is_followed === true);
  const [channels, setChannels] = useState<DTOPersonChannel[]>([]);
  const [items, setItems] = useState<DTOPersonItem[]>([]);

  useEffect(() => {
    if (selected === null || !isPersonContentChip(selected)) {
      return;
    }
    let cancelled = false;
    const api = getApiRequestService();
    const apply = isChannelChip(selected)
      ? api
          .reqPersonChannels(person.id_text, { chip: selected, limit: 50, page: 1, range, sort })
          .then((response) => {
            if (!cancelled) {
              setChannels(response.data);
              setItems([]);
            }
          })
      : api
          .reqPersonItems(person.id_text, { chip: selected, limit: 50, page: 1, range, sort })
          .then((response) => {
            if (!cancelled) {
              setItems(response.data);
              setChannels([]);
            }
          });
    apply.catch(() => {
      if (!cancelled) {
        setChannels([]);
        setItems([]);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [person.id_text, range, selected, sort]);

  const follow = async () => {
    if (loggedInAccount === null || loggedInAccount === undefined) {
      setModalAuthLogin({ isOpen: true });
      return;
    }
    const api = getApiRequestService();
    try {
      if (followed) {
        await api.reqAccountUnfollowPerson({ person_id_text: person.id_text });
        setFollowed(false);
      } else {
        await api.reqAccountFollowPerson({ person_id_text: person.id_text });
        setFollowed(true);
      }
    } catch (error) {
      tryHandleMembershipGateError(error);
    }
  };

  return (
    <>
      <MainHeader title={person.display_name} />
      <MainWrapper>
        <MainSidebarLayout>
          <MainColumnStack>
            {person.summary !== null && person.summary !== '' ? <p>{person.summary}</p> : null}
            <Button
              onClick={() => {
                void follow();
              }}
              type="button"
              variant="secondary"
            >
              {followed ? tInfo('people.subscribed') : tInfo('people.subscribe')}
            </Button>
            <div>
              {chips.map(([chip, , label]) => (
                <Button
                  key={chip}
                  onClick={() => {
                    setSelected(chip);
                  }}
                  type="button"
                  variant={selected === chip ? 'primary' : 'mini'}
                >
                  {label}
                </Button>
              ))}
            </div>
            {selected !== null ? (
              <ListSortChip
                onChange={(nextSort, nextRange) => {
                  setSort(nextSort);
                  setRange(nextRange ?? 'week');
                  updateStoredSortPref(personScope(person.id_text), {
                    range: nextRange ?? 'week',
                    sort: nextSort,
                  });
                }}
                options={[
                  { label: tFilters('sort.recent'), value: 'recent' },
                  { label: tFilters('sort.top'), value: 'top' },
                ]}
                range={sort === 'top' ? range : null}
                rangeSort="top"
                testId="person-sort"
                value={sort}
              />
            ) : null}
            {selected !== null && isChannelChip(selected)
              ? channels.map((channel) => (
                  <Link href={channelPath(selected, channel)} key={channel.id_text}>
                    {channel.title ?? channel.id_text}
                  </Link>
                ))
              : null}
            {selected !== null && !isChannelChip(selected)
              ? items.map((item) => (
                  <Link href={itemPath(selected, item)} key={item.id_text}>
                    {item.title ?? item.id_text}
                  </Link>
                ))
              : null}
          </MainColumnStack>
        </MainSidebarLayout>
      </MainWrapper>
    </>
  );
}
