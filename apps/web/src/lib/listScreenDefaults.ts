import type { ListScreenDefaults } from '@podverse/helpers';
import {
  listScreenSortForOffered,
  listScreenViewToWebRows,
  resolveListScreenChip,
} from '@podverse/helpers';

import type { ViewSelectedOption } from '../components/ViewSelector/ViewSelector';
import { getConfig } from '../config';

/**
 * Opening choices already parsed from the sidecar. The browser copy is the config the layout
 * received. The server reads that same config from the sidecar env.
 */
let boundDefaults: ListScreenDefaults | null = null;

export const bindWebListScreenDefaults = (defaults: ListScreenDefaults): void => {
  boundDefaults = defaults;
};

export const webListScreenDefaults = (): ListScreenDefaults => {
  if (typeof window !== 'undefined') {
    return (
      boundDefaults ?? {
        browse: { chip: null, sort: null, view: null },
        home: { chip: null, sort: null, view: null },
      }
    );
  }
  return getConfig().public.listScreens;
};

/** Sort a Home or Browse chip opens on. A saved sort and an explicit URL still win at the caller. */
export const configuredSort = <T extends string>(
  screen: 'browse' | 'home',
  offered: readonly T[],
  chipDefault: T
): T => {
  return listScreenSortForOffered(
    webListScreenDefaults()[screen].sort,
    screen,
    offered,
    chipDefault
  );
};

/** Chip a Home or Browse page opens on when the URL and the saved chip do not name one. */
export const mediaListPageDefaultChip = <T extends string>(
  page: 'browse' | 'subscribed',
  chips: readonly T[]
): T => {
  const podcasts = chips.find((chip) => chip === 'podcasts');
  const fallback = podcasts ?? chips[0];
  if (fallback === undefined) {
    throw new Error('A media list page has no chips.');
  }
  return resolveListScreenChip(
    webListScreenDefaults()[page === 'subscribed' ? 'home' : 'browse'].chip,
    chips,
    fallback
  );
};

/** Rows or grid when a podcasts, artists, or albums list has no saved view. */
export const webViewFallback = (screen: 'browse' | 'home'): ViewSelectedOption => {
  return listScreenViewToWebRows(webListScreenDefaults()[screen].view, screen);
};
