'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import type { DTOPerson, StatsPopularityRange } from '@podverse/helpers';
import { browseListScope, buildPersonPath } from '@podverse/helpers';
import { Button, MainColumnStack, MainSidebarLayout } from '@podverse/ui';

import { Link } from '../../components/Link/Link';
import { ListSortChip } from '../../components/ListSortChip/ListSortChip';
import { MainWrapper } from '../../components/Main/MainWrapper';
import type { MediaListChipsConfig } from '../../components/MediaListChips/MediaListChips';
import { MediaListChips } from '../../components/MediaListChips/MediaListChips';
import { NoResults } from '../../components/NoResults/NoResults';
import { useAccount } from '../../contexts/Account';
import { useConfig } from '../../contexts/Config';
import { useModals } from '../../contexts/Modals';
import { getApiRequestService } from '../../factories/apiRequestService';
import { useMembershipGate } from '../../hooks/useMembershipGate';
import {
  getParsedLocalSettings,
  getStoredSortPref,
  updateStoredSortPref,
} from '../../utils/localSettings/localSettings';

const PEOPLE_SCOPE = browseListScope('people');

type PeopleSort = 'recent' | 'top';

function readOpening(browseSort: string | null): { range: StatsPopularityRange; sort: PeopleSort } {
  const stored = getStoredSortPref(getParsedLocalSettings(), PEOPLE_SCOPE);
  const storedSort = stored?.sort === 'top' || stored?.sort === 'recent' ? stored.sort : null;
  const envSort = browseSort === 'top' || browseSort === 'recent' ? browseSort : null;
  const sort = storedSort ?? envSort ?? 'recent';
  const range =
    stored?.range === 'day' ||
    stored?.range === 'week' ||
    stored?.range === 'month' ||
    stored?.range === 'all-time'
      ? stored.range
      : 'week';
  return { range, sort };
}

export function PeopleBrowseClient({ chipsConfig }: { chipsConfig: MediaListChipsConfig }) {
  const tFilters = useTranslations('filters');
  const tInfo = useTranslations('info');
  const config = useConfig();
  const { loggedInAccount } = useAccount();
  const { setModalAuthLogin } = useModals();
  const { tryHandleMembershipGateError } = useMembershipGate();
  const opening = readOpening(config.public.listScreens.browse.sort);
  const [sort, setSort] = useState<PeopleSort>(opening.sort);
  const [range, setRange] = useState<StatsPopularityRange>(opening.range);
  const [query, setQuery] = useState('');
  const [people, setPeople] = useState<DTOPerson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getApiRequestService()
      .reqPersonList({ limit: 50, page: 1, q: query, range, sort })
      .then((response) => {
        if (!cancelled) {
          setPeople(response.data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPeople([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [query, range, sort]);

  const follow = async (person: DTOPerson) => {
    if (loggedInAccount === null || loggedInAccount === undefined) {
      setModalAuthLogin({ isOpen: true });
      return;
    }
    const api = getApiRequestService();
    try {
      if (person.is_followed === true) {
        await api.reqAccountUnfollowPerson({ person_id_text: person.id_text });
      } else {
        await api.reqAccountFollowPerson({ person_id_text: person.id_text });
      }
      setPeople((current) =>
        current.map((row) =>
          row.id_text === person.id_text
            ? { ...row, is_followed: person.is_followed !== true }
            : row
        )
      );
    } catch (error) {
      tryHandleMembershipGateError(error);
    }
  };

  return (
    <>
      <MainWrapper>
        <MainSidebarLayout>
          <MainColumnStack>
            <MediaListChips
              chips={chipsConfig.chips}
              page={chipsConfig.page}
              selected={chipsConfig.selected}
              urlChip={chipsConfig.urlChip}
            />
            <div>
              <label>
                {tInfo('people.search_placeholder')}
                <input
                  onChange={(event) => {
                    setQuery(event.target.value);
                  }}
                  type="search"
                  value={query}
                />
              </label>
              <ListSortChip
                onChange={(nextSort, nextRange) => {
                  setSort(nextSort);
                  setRange(nextRange ?? 'week');
                  updateStoredSortPref(PEOPLE_SCOPE, {
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
                testId="people-sort"
                value={sort}
              />
            </div>
            {!loading && people.length === 0 ? (
              <NoResults message={tInfo('people.no_people_found')} />
            ) : null}
            {people.map((person) => (
              <div key={person.id_text}>
                <Link href={buildPersonPath(person.id_text)}>{person.display_name}</Link>
                <Button
                  onClick={() => {
                    void follow(person);
                  }}
                  type="button"
                  variant="secondary"
                >
                  {person.is_followed === true
                    ? tInfo('people.subscribed')
                    : tInfo('people.subscribe')}
                </Button>
              </div>
            ))}
          </MainColumnStack>
        </MainSidebarLayout>
      </MainWrapper>
    </>
  );
}
