import React from 'react';

import styles from '../../styles/components/List/DetailListWrapper.module.scss';

type DetailListWrapperProps = {
  children: React.ReactNode;
};

export const DetailListWrapper: React.FC<DetailListWrapperProps> = ({ children }) => (
  <div className={styles.wrapper}>{children}</div>
);
