import React from 'react';

import { MainPageScaffold } from '@podverse/ui';

import { Footer } from '../Footer/Footer';

type MainWrapperProps = {
  children: React.ReactNode;
  emptyStateComponent?: React.ReactNode;
};

export const MainWrapper: React.FC<MainWrapperProps> = ({ children, emptyStateComponent }) => (
  <MainPageScaffold emptyStateComponent={emptyStateComponent} footer={<Footer />}>
    {children}
  </MainPageScaffold>
);
