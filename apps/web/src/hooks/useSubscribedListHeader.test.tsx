import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { QueryParamsGetManyPartial } from '@podverse/helpers-requests';
import {
  QUERY_PARAMS_SUBSCRIBED_PARTIAL_SORT,
  QUERY_PARAMS_SUBSCRIBED_TYPE,
} from '@podverse/helpers-requests';

import { useSubscribedListHeader } from './useSubscribedListHeader';

vi.mock('../contexts/LocalSettings', () => ({
  useLocalSettings: () => ({
    setViewSelected: vi.fn(),
    viewSelected: 'grid',
  }),
}));

vi.mock('../components/ViewSelector/ViewSelector', () => ({
  ViewSelector: () => null,
}));

const initialParams: QueryParamsGetManyPartial = {
  category: null,
  medium: 'av',
  page: 1,
  range: null,
  sort: 'recent',
  type: 'global',
};

afterEach(() => {
  cleanup();
});

function SubscribedListHeaderProbe(props: {
  onSetFilterParams: (next: QueryParamsGetManyPartial) => void;
  params: QueryParamsGetManyPartial;
}) {
  const { type, sort, range } = props.params;
  const { buttonsNode } = useSubscribedListHeader({
    defaultGlobalSort: 'recent',
    defaultSubscribedSort: 'recent',
    filterParams: props.params,
    medium: 'av',
    range,
    rangeMenuItems: [{ label: 'Week', param: 'week', value: 'week' }],
    setFilterParams: props.onSetFilterParams,
    showRangeDropdown: true,
    sort,
    sortMenuItems: [
      { label: 'Recent', param: 'recent', value: 'recent' },
      { label: 'Top', param: 'top', value: 'top' },
    ],
    sortValues: QUERY_PARAMS_SUBSCRIBED_PARTIAL_SORT,
    type,
    typeMenuItems: [
      { label: 'Global', param: 'global', value: 'global' },
      { label: 'Subscribed', param: 'subscribed', value: 'subscribed' },
    ],
    typeValues: QUERY_PARAMS_SUBSCRIBED_TYPE,
  });

  return <div>{buttonsNode}</div>;
}

describe('useSubscribedListHeader', () => {
  it('sets subscribed sort to defaultSubscribedSort when switching to subscribed', () => {
    const onSet = vi.fn();

    render(
      <SubscribedListHeaderProbe
        onSetFilterParams={onSet}
        params={{
          ...initialParams,
          sort: 'recent',
          type: 'global',
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Global' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Subscribed' }));

    expect(onSet).toHaveBeenCalledWith(
      expect.objectContaining({
        category: null,
        medium: 'av',
        page: 1,
        range: null,
        sort: 'recent',
        type: 'subscribed',
      })
    );
  });

  it('sets range to week when choosing top sort', () => {
    const onSet = vi.fn();

    render(
      <SubscribedListHeaderProbe
        onSetFilterParams={onSet}
        params={{
          ...initialParams,
          category: null,
          sort: 'recent',
          type: 'subscribed',
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Recent' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Top' }));

    expect(onSet).toHaveBeenCalledWith(
      expect.objectContaining({
        category: null,
        medium: 'av',
        page: 1,
        range: 'week',
        sort: 'top',
        type: 'subscribed',
      })
    );
  });
});
