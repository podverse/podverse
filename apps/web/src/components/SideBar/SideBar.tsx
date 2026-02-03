'use client';

import React from 'react';
import { FaMagnifyingGlass } from 'react-icons/fa6';
import { useTranslations } from 'next-intl';
import { ROUTES } from '../../constants/routes';
import SideBarDivider from './SideBarDivider';
import SideBarBrand from './SideBarBrand';
import SideBarLink from './SideBarLink';
import SideBarHeader from './SideBarHeader';
import Accordion from '../Accordian/AccordianClient';
import styles from '../../styles/components/SideBar/SideBar.module.scss';

const ACCORDION_STORAGE_KEY = 'pv_sidebar_accordion_state';

type AccordionState = {
  podcasts: boolean;
  music: boolean;
  addByRSS: boolean;
  library: boolean;
};

const defaultAccordionState: AccordionState = {
  podcasts: true,
  music: true,
  addByRSS: false,
  library: true,
};

const readAccordionState = (): AccordionState | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(ACCORDION_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<AccordionState>;
    return { ...defaultAccordionState, ...parsed };
  } catch {
    return null;
  }
};

const writeAccordionState = (state: AccordionState) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(ACCORDION_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage errors
  }
};

export const SideBar: React.FC = () => {
  const tMedia = useTranslations('media');
  const tFeatures = useTranslations('features');
  const [accordionState, setAccordionState] = React.useState<AccordionState>(defaultAccordionState);

  React.useEffect(() => {
    const stored = readAccordionState();
    if (stored) {
      setAccordionState(stored);
    }
  }, []);

  const handleAccordionToggle = (key: keyof AccordionState) => (open: boolean) => {
    setAccordionState((prev) => {
      const next = { ...prev, [key]: open };
      writeAccordionState(next);
      return next;
    });
  };

  return (
    <nav id="sidebar" className={styles.sidebar} data-mobile-nav="menu">
      <div className={styles.stickyTop} data-mobile-nav="branding">
        <SideBarBrand />
        <SideBarLink href={ROUTES.SEARCH}>
          <FaMagnifyingGlass className={styles.icon} />
          {tFeatures('search.search')}
        </SideBarLink>
      </div>
      <div className={styles.scrollable} tabIndex={-1}>
        <SideBarDivider noMarginTop />
        <Accordion
          header={<SideBarHeader>{tMedia('podcast.podcasts')}</SideBarHeader>}
          headerClass={styles.accordianHeader}
          open={accordionState.podcasts}
          onToggle={handleAccordionToggle('podcasts')}
          content={
            <>
              <SideBarLink href={ROUTES.PODCASTS}>{tMedia('podcast.podcasts')}</SideBarLink>
              <SideBarLink href={ROUTES.EPISODES}>{tMedia('podcast.episodes')}</SideBarLink>
              <SideBarLink href={ROUTES.CLIPS}>{tFeatures('clip.clips')}</SideBarLink>
              <SideBarLink href={ROUTES.PODCASTS_LIVESTREAMS}>
                {tMedia('livestream.livestreams')}
              </SideBarLink>
            </>
          }
          color="link"
          size="small"
        />
        <SideBarDivider />
        <Accordion
          header={<SideBarHeader>{tMedia('music.music')}</SideBarHeader>}
          headerClass={styles.accordianHeader}
          open={accordionState.music}
          onToggle={handleAccordionToggle('music')}
          content={
            <>
              <SideBarLink href={ROUTES.ARTISTS}>{tMedia('music.artists')}</SideBarLink>
              <SideBarLink href={ROUTES.ALBUMS}>{tMedia('music.albums')}</SideBarLink>
              <SideBarLink href={ROUTES.TRACKS}>{tMedia('music.tracks')}</SideBarLink>
              <SideBarLink href={ROUTES.MUSIC_LIVESTREAMS}>
                {tMedia('livestream.livestreams')}
              </SideBarLink>
            </>
          }
          color="link"
          size="small"
        />
        <SideBarDivider />
        <Accordion
          header={<SideBarHeader>{tFeatures('add_by_rss.label')}</SideBarHeader>}
          headerClass={styles.accordianHeader}
          open={accordionState.addByRSS}
          onToggle={handleAccordionToggle('addByRSS')}
          content={
            <>
              <SideBarLink href={ROUTES.ADD_BY_RSS_PODCASTS}>
                {tMedia('podcast.podcasts')}
              </SideBarLink>
              {/* <SideBarLink href={ROUTES.ADD_BY_RSS_EPISODES}>
                {tMedia('podcast.episodes')}
              </SideBarLink> */}
              <SideBarLink href={ROUTES.ADD_BY_RSS_ARTISTS}>{tMedia('music.artists')}</SideBarLink>
              <SideBarLink href={ROUTES.ADD_BY_RSS_ALBUMS}>{tMedia('music.albums')}</SideBarLink>
              {/* <SideBarLink href={ROUTES.ADD_BY_RSS_TRACKS}>{tMedia('music.tracks')}</SideBarLink> */}
              {/* <SideBarLink href={ROUTES.ADD_BY_RSS_LIVESTREAMS}>
                {tMedia('livestream.livestreams')}
              </SideBarLink> */}
            </>
          }
          color="link"
          size="small"
        />
        <SideBarDivider />
        <Accordion
          header={<SideBarHeader>{tFeatures('my_library')}</SideBarHeader>}
          headerClass={styles.accordianHeader}
          open={accordionState.library}
          onToggle={handleAccordionToggle('library')}
          content={
            <>
              <SideBarLink href={ROUTES.QUEUES}>{tFeatures('queue.queues')}</SideBarLink>
              <SideBarLink href={ROUTES.HISTORY}>{tFeatures('history.history')}</SideBarLink>
              <SideBarLink href={ROUTES.PLAYLISTS}>{tFeatures('playlist.playlists')}</SideBarLink>
              <SideBarLink href={`${ROUTES.MY_PROFILE}?tab=clips`}>
                {tFeatures('my_clips')}
              </SideBarLink>
              <SideBarLink href={ROUTES.PROFILES}>{tFeatures('profiles')}</SideBarLink>
            </>
          }
          color="link"
          size="small"
        />
      </div>
    </nav>
  );
};
