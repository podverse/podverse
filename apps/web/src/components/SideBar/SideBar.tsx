'use client';

import classNames from 'classnames';
import { useTranslations } from 'next-intl';
import React from 'react';
import { FaMagnifyingGlass } from 'react-icons/fa6';

import { Accordion } from '@podverse/ui';

import { ROUTES } from '../../constants/routes';
import { useConfig } from '../../contexts/Config';
import { useLocalSettings } from '../../contexts/LocalSettings';
import type { SidebarAccordionState } from '../../utils/localSettings/localSettings';
import { SideBarBrand } from './SideBarBrand';
import { SideBarDivider } from './SideBarDivider';
import { SideBarHeader } from './SideBarHeader';
import { SideBarLink } from './SideBarLink';

import styles from '../../styles/components/SideBar/SideBar.module.scss';

export const SideBar: React.FC = () => {
  const tSubscriptions = useTranslations('subscriptions');
  const tFeatures = useTranslations('features');
  const addByRSSEnabled = useConfig().public.catalog.addByRSSEnabled;
  const { mobileSidebarOpen, sidebarAccordion, setSidebarAccordion } = useLocalSettings();
  const accordionState: SidebarAccordionState = sidebarAccordion;

  const handleAccordionToggle = (key: keyof SidebarAccordionState) => (open: boolean) => {
    setSidebarAccordion((prev) => ({ ...prev, [key]: open }));
  };

  return (
    <nav
      id="sidebar"
      className={classNames(styles.sidebar, mobileSidebarOpen && 'open')}
      data-mobile-nav="menu"
    >
      <div className={styles.stickyTop} data-mobile-nav="branding">
        <SideBarBrand />
        <SideBarLink href={ROUTES.SEARCH}>
          <FaMagnifyingGlass className={styles.icon} />
          {tFeatures('search.search')}
        </SideBarLink>
      </div>
      <div className={styles.scrollable} tabIndex={-1}>
        <SideBarDivider noMarginTop />
        <SideBarLink href={ROUTES.SUBSCRIBED}>{tSubscriptions('subscribed')}</SideBarLink>
        <SideBarLink href={ROUTES.BROWSE}>{tFeatures('browse.browse')}</SideBarLink>
        <SideBarLink href={ROUTES.RECOMMENDATIONS}>
          {tFeatures('recommendations.title')}
        </SideBarLink>
        <SideBarDivider />
        <Accordion
          header={<SideBarHeader>{tFeatures('my_library')}</SideBarHeader>}
          headerClassName={styles.accordianHeader}
          open={accordionState.library}
          onToggle={handleAccordionToggle('library')}
          caretSpacing="nav"
          color="link"
          size="small"
        >
          <>
            <SideBarLink href={ROUTES.QUEUES}>{tFeatures('queue.queues')}</SideBarLink>
            <SideBarLink href={ROUTES.HISTORY}>{tFeatures('history.history')}</SideBarLink>
            <SideBarLink href={ROUTES.PLAYLISTS}>{tFeatures('playlist.playlists')}</SideBarLink>
            <SideBarLink href={`${ROUTES.MY_PROFILE}?tab=clips`}>
              {tFeatures('my_clips')}
            </SideBarLink>
            {addByRSSEnabled ? (
              <SideBarLink href={ROUTES.ADD_BY_RSS}>{tFeatures('add_by_rss.label')}</SideBarLink>
            ) : null}
          </>
        </Accordion>
      </div>
    </nav>
  );
};
