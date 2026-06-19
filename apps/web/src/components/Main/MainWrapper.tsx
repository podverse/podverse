'use client';

import type { MouseEvent } from 'react';
import React, { useCallback, useRef } from 'react';

import { MainPageScaffold } from '@podverse/ui';

import { Footer } from '../Footer/Footer';
import { shouldFocusMainWrapperOnMouseDown } from './mainWrapperFocusOnMouseDown';

import styles from '../../styles/components/Main/MainWrapper.module.scss';

type MainWrapperProps = {
  children: React.ReactNode;
  emptyStateComponent?: React.ReactNode;
};

export const MainWrapper: React.FC<MainWrapperProps> = ({ children, emptyStateComponent }) => {
  const outerRef = useRef<HTMLDivElement>(null);

  const handleOuterMouseDown = useCallback((event: MouseEvent<HTMLDivElement>) => {
    if (!shouldFocusMainWrapperOnMouseDown(event.target as Element)) {
      return;
    }
    outerRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <MainPageScaffold
      className={styles.mainOuterWrapperFocusTarget}
      emptyStateComponent={emptyStateComponent}
      footer={<Footer />}
      onOuterMouseDown={handleOuterMouseDown}
      outerRef={outerRef}
      outerTabIndex={-1}
    >
      {children}
    </MainPageScaffold>
  );
};
