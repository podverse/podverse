'use client';

import { useTranslations } from 'next-intl';
import React from 'react';
import { FaMagnifyingGlass } from 'react-icons/fa6';

import { ROUTES } from '../../constants/routes';
import { useLocalSettings } from '../../contexts/LocalSettings';
import Accordion from '../Accordian/AccordianClient';
import SideBarBrand from './SideBarBrand';
import SideBarDivider from './SideBarDivider';
import SideBarHeader from './SideBarHeader';
import SideBarLink from './SideBarLink';

import styles from '../../styles/components/SideBar/SideBar.module.scss';

type AccordionState = {
  podcasts: boolean;
  music: boolean;
  addByRSS: boolean;
  library: boolean;
};

export const SideBar: React.FC = () => {
  const tMedia = useTranslations('media');
  const tFeatures = useTranslations('features');
  const { sidebarAccordion, setSidebarAccordion } = useLocalSettings();
  const accordionState: AccordionState = sidebarAccordion;

  const handleAccordionToggle = (key: keyof AccordionState) => (open: boolean) => {
    setSidebarAccordion((prev) => ({ ...prev, [key]: open }));
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
              <SideBarLink href={ROUTES.ADD_BY_RSS_EPISODES}>
                {tMedia('podcast.episodes')}
              </SideBarLink>
              <SideBarLink href={ROUTES.ADD_BY_RSS_ARTISTS}>{tMedia('music.artists')}</SideBarLink>
              <SideBarLink href={ROUTES.ADD_BY_RSS_ALBUMS}>{tMedia('music.albums')}</SideBarLink>
              <SideBarLink href={ROUTES.ADD_BY_RSS_TRACKS}>{tMedia('music.tracks')}</SideBarLink>
              {/* <SideBarLink href={ROUTES.ADD_BY_RSS_LIVESTREAMS}>
                {tMedia('livestream.livestreams')}
              </SideBarLink> */}
              <SideBarLink href={ROUTES.ADD_BY_RSS_ADD}>
                {tFeatures('add_feed.add_feed')}
              </SideBarLink>
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
